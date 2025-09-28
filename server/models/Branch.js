import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true,
    maxlength: [100, 'Branch name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Branch code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Branch code cannot exceed 10 characters']
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, required: [true, 'City is required'], trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, default: 'USA', trim: true }
  },
  contact: {
    phone: { 
      type: String, 
      required: [true, 'Phone number is required'],
      trim: true 
    },
    email: { type: String, trim: true, lowercase: true },
    fax: { type: String, trim: true }
  },
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  manager: {
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  capacity: {
    seating: { type: Number, min: 0 },
    staff: { type: Number, min: 0 }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Generate branch code automatically if not provided
branchSchema.pre('save', function(next) {
  if (!this.code && this.name) {
    // Generate code from branch name (first 3 letters + random number)
    const nameCode = this.name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.code = `${nameCode}${randomNum}`;
  }
  next();
});

export default mongoose.model('Branch', branchSchema);