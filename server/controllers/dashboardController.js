const Product = require('../models/Product');
const Category = require('../models/Category');
const AuditLog = require('../models/AuditLog');

// @desc    Get dashboard metrics & summary data
// @route   GET /api/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalCategories = await Category.countDocuments();

    // Aggregations for total stock quantity & inventory total valuation
    const stockStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalStockQuantity: { $sum: '$quantity' },
          totalValuation: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
        },
      },
    ]);

    const totalStockQuantity = stockStats.length > 0 ? stockStats[0].totalStockQuantity : 0;
    const totalValuation = stockStats.length > 0 ? stockStats[0].totalValuation : 0;

    // Stock status counts
    const outOfStockCount = await Product.countDocuments({ status: 'Out of Stock' });
    const lowStockCount = await Product.countDocuments({ status: 'Low Stock' });
    const inStockCount = await Product.countDocuments({ status: 'In Stock' });

    // Category distribution breakdown
    const categoryBreakdown = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          productCount: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      {
        $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          categoryId: '$_id',
          name: { $ifNull: ['$categoryDetails.name', 'Uncategorized'] },
          color: { $ifNull: ['$categoryDetails.color', '#6b7280'] },
          productCount: 1,
          totalQuantity: 1,
        },
      },
    ]);

    // Top low stock items needing immediate attention
    const lowStockItems = await Product.find({ status: { $in: ['Low Stock', 'Out of Stock'] } })
      .populate('category', 'name color')
      .sort({ quantity: 1 })
      .limit(5);

    // Recent activity log (last 5 audit logs)
    const recentActivity = await AuditLog.find()
      .populate('product', 'name sku')
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          totalCategories,
          totalStockQuantity,
          totalValuation,
          inStockCount,
          lowStockCount,
          outOfStockCount,
        },
        categoryBreakdown,
        lowStockItems,
        recentActivity,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
