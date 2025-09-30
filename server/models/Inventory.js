import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item reference is required'],
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch reference is required'],
  },
  currentStock: {
    type: Number,
    required: [true, 'Current stock is required'],
    min: [0, 'Current stock cannot be negative'],
    default: 0,
  },
  reorderPoint: {
    type: Number,
    required: [true, 'Reorder point is required'],
    min: [0, 'Reorder point cannot be negative'],
    default: 10,
  },
  maxStockLevel: {
    type: Number,
    required: [true, 'Max stock level is required'],
    min: [0, 'Max stock level cannot be negative'],
    default: 100,
  },
  lastRestocked: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },
}, {
  timestamps: true,
});

// Compound index to ensure unique item-branch combinations
inventorySchema.index({ item: 1, branch: 1 }, { unique: true });

// Index for faster queries
inventorySchema.index({ branch: 1 });
inventorySchema.index({ currentStock: 1 });
inventorySchema.index({ reorderPoint: 1 });

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  if (this.currentStock === 0) return 'out_of_stock';
  if (this.currentStock <= this.reorderPoint) return 'low';
  if (this.currentStock >= this.maxStockLevel) return 'overstocked';
  return 'normal';
});

// Ensure virtual fields are serialized
inventorySchema.set('toJSON', { virtuals: true });

export default mongoose.model('Inventory', inventorySchema);
