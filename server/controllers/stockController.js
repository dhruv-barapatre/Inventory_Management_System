const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');

// @desc    Adjust stock quantity (+ or -)
// @route   POST /api/stock/adjust
// @access  Private
const adjustStock = async (req, res) => {
  try {
    const { productId, action, amount, reason } = req.body;

    if (!productId || !action || amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, action (ADD or REDUCE), and a positive amount are required.',
      });
    }

    if (!['ADD', 'REDUCE'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'ADD' or 'REDUCE'.",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const prevQty = product.quantity;
    const adjustAmount = Number(amount);
    let newQty = prevQty;

    if (action === 'ADD') {
      newQty = prevQty + adjustAmount;
    } else if (action === 'REDUCE') {
      newQty = prevQty - adjustAmount;
      if (newQty < 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce stock below 0. Current stock is ${prevQty}, requested reduction is ${adjustAmount}.`,
        });
      }
    }

    product.quantity = newQty;
    await product.save();

    // Create Audit Record
    const auditLog = await AuditLog.create({
      product: product._id,
      user: req.user._id,
      type: action === 'ADD' ? 'ADD_STOCK' : 'REDUCE_STOCK',
      quantityChange: action === 'ADD' ? adjustAmount : -adjustAmount,
      previousQuantity: prevQty,
      newQuantity: newQty,
      reason: reason || (action === 'ADD' ? 'Stock increase' : 'Stock reduction'),
    });

    const updatedProduct = await Product.findById(product._id).populate('category', 'name color');

    res.json({
      success: true,
      message: `Stock updated successfully. New quantity: ${newQty}`,
      data: {
        product: updatedProduct,
        auditLog,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get audit logs / stock transaction history
// @route   GET /api/stock/history
// @access  Private
const getAuditLogs = async (req, res) => {
  try {
    const { productId, page = 1, limit = 20 } = req.query;

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 20;
    const skip = (pageNumber - 1) * limitNumber;

    const query = {};
    if (productId) {
      query.product = productId;
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('product', 'name sku imageUrl unitPrice')
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: pageNumber,
        pages: Math.ceil(total / limitNumber),
        limit: limitNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { adjustStock, getAuditLogs };
