const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['ADD_STOCK', 'REDUCE_STOCK', 'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT'],
      required: true,
    },
    quantityChange: {
      type: Number,
      default: 0,
    },
    previousQuantity: {
      type: Number,
      required: true,
    },
    newQuantity: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      default: 'Manual adjustment',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
