const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    color: {
      type: String,
      default: '#3b82f6', // Hex color for visual tags in UI
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
