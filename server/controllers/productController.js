const Product = require('../models/Product');
const Category = require('../models/Category');
const AuditLog = require('../models/AuditLog');
const QRCode = require('qrcode');
const { Parser } = require('json2csv');
const csvParser = require('csv-parser');
const fs = require('fs');

// Helper to generate QR Code Data URL from SKU
const generateQRCode = async (sku) => {
  try {
    return await QRCode.toDataURL(sku);
  } catch (err) {
    console.error('QR code generation error:', err);
    return '';
  }
};

// @desc    Get products with search, filter, pagination, sorting
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // Filter Query construction
    const query = {};

    // Search by Name or SKU
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by Category
    if (category) {
      query.category = category;
    }

    // Filter by Stock Status
    if (status) {
      query.status = status;
    }

    // Sort order
    const sort = {};
    const sortField = ['name', 'quantity', 'unitPrice', 'createdAt', 'sku'].includes(sortBy)
      ? sortBy
      : 'createdAt';
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name color')
      .sort(sort)
      .skip(skip)
      .limit(limitNumber);

    res.json({
      success: true,
      data: products,
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

// @desc    Get single product details
// @route   GET /api/products/:id
// @access  Private
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name color description');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private
const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      category,
      description,
      quantity,
      lowStockThreshold,
      unitPrice,
      supplierName,
    } = req.body;

    // Validation
    if (!name || !sku || !category || quantity === undefined || unitPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, SKU, category, quantity, and unit price are required.',
      });
    }

    if (Number(quantity) < 0 || Number(unitPrice) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity and unit price must be positive non-negative values.',
      });
    }

    const cleanSKU = sku.trim().toUpperCase();
    const existingSKU = await Product.findOne({ sku: cleanSKU });
    if (existingSKU) {
      return res.status(400).json({ success: false, message: 'SKU must be unique. A product with this SKU already exists.' });
    }

    const existingCategory = await Category.findById(category);
    if (!existingCategory) {
      return res.status(400).json({ success: false, message: 'Selected category does not exist.' });
    }

    // QR Code generation
    const qrCodeDataUrl = await generateQRCode(cleanSKU);

    // File image handle
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

    const product = await Product.create({
      name: name.trim(),
      sku: cleanSKU,
      category,
      description: description || '',
      quantity: Number(quantity),
      lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : 10,
      unitPrice: Number(unitPrice),
      supplierName: supplierName || 'N/A',
      imageUrl,
      qrCode: qrCodeDataUrl,
    });

    // Create Audit Log
    await AuditLog.create({
      product: product._id,
      user: req.user._id,
      type: 'CREATE_PRODUCT',
      quantityChange: Number(quantity),
      previousQuantity: 0,
      newQuantity: Number(quantity),
      reason: 'Initial product creation',
    });

    const populated = await Product.findById(product._id).populate('category', 'name color');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const {
      name,
      sku,
      category,
      description,
      quantity,
      lowStockThreshold,
      unitPrice,
      supplierName,
    } = req.body;

    if (sku && sku.trim().toUpperCase() !== product.sku) {
      const cleanSKU = sku.trim().toUpperCase();
      const existingSKU = await Product.findOne({ sku: cleanSKU });
      if (existingSKU) {
        return res.status(400).json({ success: false, message: 'SKU must be unique. Another product has this SKU.' });
      }
      product.sku = cleanSKU;
      product.qrCode = await generateQRCode(cleanSKU);
    }

    if (category) {
      const existingCategory = await Category.findById(category);
      if (!existingCategory) {
        return res.status(400).json({ success: false, message: 'Selected category does not exist.' });
      }
      product.category = category;
    }

    const prevQty = product.quantity;

    if (name) product.name = name.trim();
    if (description !== undefined) product.description = description;
    if (lowStockThreshold !== undefined) product.lowStockThreshold = Number(lowStockThreshold);
    if (unitPrice !== undefined) product.unitPrice = Number(unitPrice);
    if (supplierName !== undefined) product.supplierName = supplierName;
    if (req.file) product.imageUrl = `/uploads/${req.file.filename}`;

    if (quantity !== undefined) {
      const newQty = Number(quantity);
      if (newQty < 0) {
        return res.status(400).json({ success: false, message: 'Quantity cannot be negative.' });
      }
      product.quantity = newQty;
    }

    await product.save();

    // Log audit if quantity changed via update
    if (quantity !== undefined && Number(quantity) !== prevQty) {
      await AuditLog.create({
        product: product._id,
        user: req.user._id,
        type: Number(quantity) > prevQty ? 'ADD_STOCK' : 'REDUCE_STOCK',
        quantityChange: Number(quantity) - prevQty,
        previousQuantity: prevQty,
        newQuantity: Number(quantity),
        reason: 'Product details update',
      });
    }

    const updatedProduct = await Product.findById(product._id).populate('category', 'name color');
    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await AuditLog.create({
      product: product._id,
      user: req.user._id,
      type: 'DELETE_PRODUCT',
      quantityChange: -product.quantity,
      previousQuantity: product.quantity,
      newQuantity: 0,
      reason: 'Product deleted',
    });

    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export inventory to CSV
// @route   GET /api/products/export/csv
// @access  Private
const exportCSV = async (req, res) => {
  try {
    const products = await Product.find().populate('category', 'name').lean();

    const fields = [
      { label: 'Product Name', value: 'name' },
      { label: 'SKU', value: 'sku' },
      { label: 'Category', value: (row) => (row.category ? row.category.name : 'N/A') },
      { label: 'Description', value: 'description' },
      { label: 'Quantity', value: 'quantity' },
      { label: 'Low Stock Threshold', value: 'lowStockThreshold' },
      { label: 'Unit Price', value: 'unitPrice' },
      { label: 'Supplier Name', value: 'supplierName' },
      { label: 'Status', value: 'status' },
      { label: 'Date Added', value: (row) => new Date(row.createdAt).toLocaleDateString() },
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(products);

    res.header('Content-Type', 'text/csv');
    res.attachment(`inventory_export_${Date.now()}.csv`);
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Import inventory from CSV
// @route   POST /api/products/import/csv
// @access  Private/Admin
const importCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a CSV file' });
    }

    const results = [];
    const errors = [];

    fs.createReadStream(req.file.path)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        let importedCount = 0;

        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          const name = row['Product Name'] || row['name'];
          const sku = row['SKU'] || row['sku'];
          const categoryName = row['Category'] || row['category'];
          const quantity = row['Quantity'] || row['quantity'];
          const unitPrice = row['Unit Price'] || row['unitPrice'];
          const description = row['Description'] || row['description'] || '';
          const supplierName = row['Supplier Name'] || row['supplierName'] || 'N/A';

          if (!name || !sku || !categoryName || quantity === undefined || unitPrice === undefined) {
            errors.push(`Row ${i + 1}: Missing required fields`);
            continue;
          }

          const cleanSKU = sku.toString().trim().toUpperCase();
          const existingProduct = await Product.findOne({ sku: cleanSKU });
          if (existingProduct) {
            errors.push(`Row ${i + 1}: SKU ${cleanSKU} already exists`);
            continue;
          }

          let categoryObj = await Category.findOne({
            name: { $regex: new RegExp(`^${categoryName.toString().trim()}$`, 'i') },
          });

          if (!categoryObj) {
            categoryObj = await Category.create({
              name: categoryName.toString().trim(),
              description: 'Auto-created via CSV import',
            });
          }

          const qrCodeDataUrl = await generateQRCode(cleanSKU);

          await Product.create({
            name: name.toString().trim(),
            sku: cleanSKU,
            category: categoryObj._id,
            description: description.toString().trim(),
            quantity: Math.max(0, Number(quantity) || 0),
            unitPrice: Math.max(0, Number(unitPrice) || 0),
            supplierName: supplierName.toString().trim(),
            qrCode: qrCodeDataUrl,
          });

          importedCount++;
        }

        // Clean up temp file
        fs.unlinkSync(req.file.path);

        res.json({
          success: true,
          message: `Successfully imported ${importedCount} product(s).`,
          importedCount,
          errors,
        });
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  exportCSV,
  importCSV,
};
