import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Product code is required'],
      trim: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    rpce: {
      // kept as requested (assumed numeric "price")
      type: Number,
      required: [true, 'RPCE is required'],
      min: [0, 'RPCE cannot be negative'],
    },
    // Stock section showing available count
    stock: {
      available: {
        type: Number,
        required: [true, 'Available stock is required'],
        min: [0, 'Available stock cannot be negative'],
        default: 0,
      },
    },
  },
  { timestamps: true }
);

// Optional: ensure JSON output is clean
productSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export default mongoose.model('Product', productSchema);
