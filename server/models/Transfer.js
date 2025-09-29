import mongoose from 'mongoose';

const transferSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, 'Item reference is required'],
    },
    // For your frontend flow, main bakery is the source; no branch required here.
    fromBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    toBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Destination branch is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    status: {
      type: String,
      enum: ['pending', 'in_transit', 'delivered', 'cancelled'],
      // Your UI treats a transfer as immediate; mark as delivered by default.
      default: 'delivered',
    },

    // Optional metadata — not required by your UI
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deliveredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    requestDate: { type: Date, default: Date.now },
    approvedDate: { type: Date, default: null },
    deliveryDate: { type: Date, default: () => new Date() },
    expectedDeliveryDate: { type: Date, default: null },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    trackingNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

// Generate tracking number before saving
transferSchema.pre('save', function (next) {
  if (!this.trackingNumber && this.isNew) {
    const ts = Date.now().toString(36);
    const rnd = Math.random().toString(36).substring(2, 5);
    this.trackingNumber = `TRF${ts}${rnd}`.toUpperCase();
  }
  next();
});

// Helpful indexes
transferSchema.index({ toBranch: 1, status: 1 });
transferSchema.index({ requestDate: -1 });
transferSchema.index({ trackingNumber: 1 });

export default mongoose.model('Transfer', transferSchema);
