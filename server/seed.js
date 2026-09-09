const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const AuditLog = require('./models/AuditLog');
const QRCode = require('qrcode');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory_db');
    console.log('🌱 Connected to MongoDB for seeding...');

    // Clear existing collections
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await AuditLog.deleteMany({});

    // 1. Create Demo Users
    const adminUser = await User.create({
      name: 'Sanket Debnath',
      email: 'admin@redsoftware.com',
      password: 'admin123',
      role: 'admin',
    });

    const standardUser = await User.create({
      name: 'Alex Developer',
      email: 'user@redsoftware.com',
      password: 'user123',
      role: 'user',
    });

    console.log('✅ Demo users created (admin@redsoftware.com & user@redsoftware.com)');

    // 2. Create Categories
    const categories = await Category.insertMany([
      { name: 'Electronics', description: 'Gadgets, hardware, and components', color: '#3b82f6' },
      { name: 'Office Furniture', description: 'Desks, chairs, and ergonomic gear', color: '#8b5cf6' },
      { name: 'Stationery & Supplies', description: 'Paper, pens, and daily office items', color: '#10b981' },
      { name: 'Networking', description: 'Routers, cables, and servers', color: '#f59e0b' },
    ]);

    console.log('✅ Categories created');

    const catMap = {};
    categories.forEach((c) => { catMap[c.name] = c._id; });

    // 3. Create Sample Products
    const productsData = [
      {
        name: 'Dell UltraSharp 27" 4K Monitor',
        sku: 'MON-DELL-4K27',
        category: catMap['Electronics'],
        description: 'IPS 4K UHD display with USB-C hub',
        quantity: 42,
        lowStockThreshold: 10,
        unitPrice: 499.99,
        supplierName: 'Dell Global Direct',
      },
      {
        name: 'Logitech MX Master 3S Wireless Mouse',
        sku: 'MSE-LOGI-MX3S',
        category: catMap['Electronics'],
        description: 'Quiet clicks and 8K DPI tracking mouse',
        quantity: 8, // Low Stock
        lowStockThreshold: 10,
        unitPrice: 99.99,
        supplierName: 'Logitech Distribution',
      },
      {
        name: 'Ergonomic Mesh Office Chair',
        sku: 'CHR-ERG-MESH01',
        category: catMap['Office Furniture'],
        description: 'High-back ergonomic lumbar support chair',
        quantity: 15,
        lowStockThreshold: 5,
        unitPrice: 249.50,
        supplierName: 'Herman Office Supply',
      },
      {
        name: 'Standing Desk Converter 36"',
        sku: 'DSK-STND-CNV36',
        category: catMap['Office Furniture'],
        description: 'Dual monitor pneumatic height adjustable desk',
        quantity: 0, // Out of Stock
        lowStockThreshold: 5,
        unitPrice: 179.95,
        supplierName: 'Herman Office Supply',
      },
      {
        name: 'Mechanical RGB Keyboard (Tactile Switch)',
        sku: 'KBD-MECH-RGB01',
        category: catMap['Electronics'],
        description: 'Custom hot-swappable mechanical keyboard',
        quantity: 25,
        lowStockThreshold: 8,
        unitPrice: 129.99,
        supplierName: 'Keychron Inc',
      },
      {
        name: 'Cat6 Ethernet Patch Cable 50ft',
        sku: 'CBL-CAT6-50FT',
        category: catMap['Networking'],
        description: 'Snagless RJ45 gigabit ethernet cable',
        quantity: 3, // Low Stock
        lowStockThreshold: 10,
        unitPrice: 14.99,
        supplierName: 'Cable Matters',
      },
      {
        name: 'Premium Gel Pen Box (12 Pack)',
        sku: 'PEN-GEL-BLU12',
        category: catMap['Stationery & Supplies'],
        description: 'Smooth writing 0.5mm blue ink gel pens',
        quantity: 120,
        lowStockThreshold: 20,
        unitPrice: 9.99,
        supplierName: 'Pilot Pen Corp',
      },
    ];

    for (const prodData of productsData) {
      const qrCodeUrl = await QRCode.toDataURL(prodData.sku);
      const prod = await Product.create({
        ...prodData,
        qrCode: qrCodeUrl,
      });

      await AuditLog.create({
        product: prod._id,
        user: adminUser._id,
        type: 'CREATE_PRODUCT',
        quantityChange: prod.quantity,
        previousQuantity: 0,
        newQuantity: prod.quantity,
        reason: 'Initial database seed',
      });
    }

    console.log('✅ Seeded 7 sample products with audit logs!');
    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();
