const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

describe('Inventory Management System API Integration Tests', () => {
  let authToken;
  let adminToken;
  let categoryId;
  let productId;

  beforeAll(async () => {
    // Wait for DB connection
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory_test_db');
    }

    // Clean test data
    await User.deleteMany({ email: { $in: ['testuser@example.com', 'adminuser@example.com'] } });
    await Category.deleteMany({ name: 'Test Category' });
    await Product.deleteMany({ sku: 'TEST-SKU-100' });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('1. Authentication Endpoints', () => {
    it('should register a new regular user', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'password123',
        role: 'user',
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      authToken = res.body.data.token;
    });

    it('should register an admin user', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Admin User',
        email: 'adminuser@example.com',
        password: 'password123',
        role: 'admin',
      });
      expect(res.statusCode).toBe(201);
      adminToken = res.body.data.token;
    });

    it('should login an existing user', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'testuser@example.com',
        password: 'password123',
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });
  });

  describe('2. Category Endpoints', () => {
    it('should allow admin to create a category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Category',
          description: 'A category for testing',
          color: '#10b981',
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.data._id).toBeDefined();
      categoryId = res.body.data._id;
    });

    it('should list all categories for authenticated users', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('3. Product CRUD & Stock Management', () => {
    it('should create a new product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Wireless Mouse',
          sku: 'TEST-SKU-100',
          category: categoryId,
          description: 'High precision wireless mouse',
          quantity: 25,
          unitPrice: 29.99,
          supplierName: 'Logitech Test',
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.status).toBe('In Stock');
      productId = res.body.data._id;
    });

    it('should reject creating product with duplicate SKU', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Another Mouse',
          sku: 'TEST-SKU-100',
          category: categoryId,
          quantity: 5,
          unitPrice: 15,
        });
      expect(res.statusCode).toBe(400);
    });

    it('should perform stock reduction', async () => {
      const res = await request(app)
        .post('/api/stock/adjust')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          action: 'REDUCE',
          amount: 20,
          reason: 'Sold 20 units',
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.product.quantity).toBe(5);
      expect(res.body.data.product.status).toBe('Low Stock');
    });

    it('should prevent reducing stock below 0', async () => {
      const res = await request(app)
        .post('/api/stock/adjust')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          action: 'REDUCE',
          amount: 10,
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Cannot reduce stock below 0');
    });
  });
});
