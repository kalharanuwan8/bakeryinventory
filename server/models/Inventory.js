import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item reference is required']
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch reference is required']
  },
  currentStock: {
    type: Number,
    required: [true, 'Current stock is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  minStockLevel: {
    type: Number,
    required: [true, 'Minimum stock level is required'],
    min: [0, 'Minimum stock level cannot be negative'],
    default: 10
  },
  maxStockLevel: {
    type: Number,
    required: [true, 'Maximum stock level is required'],
    min: [0, 'Maximum stock level cannot be negative'],
    default: 100
  },
  reorderPoint: {
    type: Number,
    min: [0, 'Reorder point cannot be negative'],
    default: 15
  },
  lastRestocked: {
    type: Date,
    default: Date.now
  },
  dailyConsumption: {
    type: Number,
    min: [0, 'Daily consumption cannot be negative'],
    default: 0
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Compound index to ensure unique item-branch combinations
inventorySchema.index({ item: 1, branch: 1 }, { unique: true });

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  if (this.currentStock === 0) return 'out_of_stock';
  if (this.currentStock <= this.reorderPoint) return 'low';
  if (this.currentStock <= this.minStockLevel) return 'below_minimum';
  if (this.currentStock >= this.maxStockLevel) return 'overstocked';
  return 'normal';
});

// Virtual for days until reorder needed (based on daily consumption)
inventorySchema.virtual('daysUntilReorder').get(function() {
  if (this.dailyConsumption === 0) return null;
  const daysRemaining = Math.floor((this.currentStock - this.reorderPoint) / this.dailyConsumption);
  return Math.max(0, daysRemaining);
});

// Ensure virtuals are included in JSON output
inventorySchema.set('toJSON', { virtuals: true });

export default mongoose.model('Inventory', inventorySchema);