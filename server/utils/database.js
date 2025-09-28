import mongoose from 'mongoose';
import User from '../models/User.js';
import Item from '../models/Item.js';
import Branch from '../models/Branch.js';
import Inventory from '../models/Inventory.js';

// Database connection with retry logic
export const connectDB = async (retries = 5) => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/bakery_inventory',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }
    );

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Initialize database if empty
    await initializeDatabase();
    
    return conn;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    
    if (retries > 0) {
      console.log(`Retrying database connection... (${retries} attempts left)`);
      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      process.exit(1);
    }
  }
};

// Initialize database with sample data
export const initializeDatabase = async () => {
  try {
    // Check if admin user exists
    const adminExists = await User.findOne({ role: 'Administrator' });
    
    if (!adminExists) {
      console.log('Initializing database with default data...');
      
      // Create default admin user
      const admin = new User({
        username: 'admin',
        email: 'admin@bakery.com',
        password: 'admin123',
        role: 'Administrator',
        phone: '+1 (555) 123-4567',
        address: '123 Main Street, Bakery City'
      });
      await admin.save();
      console.log('Default admin user created: admin / admin123');

      // Create main bakery branch
      const mainBranch = new Branch({
        name: 'Main Bakery',
        code: 'MAIN',
        address: {
          street: '123 Main Street',
          city: 'Bakery City',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        contact: {
          phone: '+1 (555) 123-4567',
          email: 'main@bakery.com'
        },
        manager: {
          name: 'Admin User',
          email: 'admin@bakery.com',
          phone: '+1 (555) 123-4567'
        },
        status: 'active'
      });
      await mainBranch.save();

      // Create sample branches
      const branches = [
        {
          name: 'Downtown Branch',
          code: 'DTN001',
          address: {
            street: '456 Downtown Ave',
            city: 'Bakery City',
            state: 'NY',
            zipCode: '10002'
          },
          contact: {
            phone: '+1 (555) 234-5678',
            email: 'downtown@bakery.com'
          },
          manager: {
            name: 'John Smith',
            email: 'john@bakery.com'
          }
        },
        {
          name: 'Mall Branch',
          code: 'MAL001',
          address: {
            street: '789 Shopping Mall, Level 2',
            city: 'Bakery City',
            state: 'NY',
            zipCode: '10003'
          },
          contact: {
            phone: '+1 (555) 345-6789',
            email: 'mall@bakery.com'
          },
          manager: {
            name: 'Sarah Johnson',
            email: 'sarah@bakery.com'
          }
        }
      ];

      const createdBranches = await Branch.insertMany(branches);

      // Create sample items
      const items = [
        {
          code: 'CHC001',
          name: 'Chocolate Croissant',
          category: 'Pastries',
          description: 'Buttery croissant filled with rich chocolate',
          price: 4.50,
          ingredients: 'Flour, Butter, Chocolate, Eggs',
          allergens: 'Gluten, Dairy, Eggs',
          shelfLife: '2 days'
        },
        {
          code: 'SDB002',
          name: 'Sourdough Bread',
          category: 'Breads',
          description: 'Traditional sourdough bread with crispy crust',
          price: 6.00,
          ingredients: 'Sourdough Starter, Flour, Salt, Water',
          allergens: 'Gluten',
          shelfLife: '5 days'
        },
        {
          code: 'RVC003',
          name: 'Red Velvet Cake',
          category: 'Cakes',
          description: 'Classic red velvet cake with cream cheese frosting',
          price: 25.00,
          ingredients: 'Flour, Cocoa, Cream Cheese, Red Food Coloring',
          allergens: 'Gluten, Dairy, Eggs',
          shelfLife: '3 days'
        },
        {
          code: 'BLM004',
          name: 'Blueberry Muffin',
          category: 'Pastries',
          description: 'Fresh blueberry muffins with a tender crumb',
          price: 3.25,
          ingredients: 'Flour, Blueberries, Sugar, Butter, Eggs',
          allergens: 'Gluten, Dairy, Eggs',
          shelfLife: '3 days'
        },
        {
          code: 'CCK005',
          name: 'Chocolate Chip Cookie',
          category: 'Cookies',
          description: 'Classic chocolate chip cookies',
          price: 2.00,
          ingredients: 'Flour, Chocolate Chips, Butter, Sugar',
          allergens: 'Gluten, Dairy',
          shelfLife: '7 days'
        }
      ];

      const createdItems = await Item.insertMany(items);

      // Create sample inventory for main branch
      const mainInventory = createdItems.map(item => ({
        item: item._id,
        branch: mainBranch._id,
        currentStock: Math.floor(Math.random() * 100) + 50,
        minStockLevel: 20,
        maxStockLevel: 200,
        reorderPoint: 30,
        dailyConsumption: Math.floor(Math.random() * 20) + 10
      }));

      await Inventory.insertMany(mainInventory);

      // Create sample inventory for other branches
      for (const branch of createdBranches) {
        const branchInventory = createdItems.map(item => ({
          item: item._id,
          branch: branch._id,
          currentStock: Math.floor(Math.random() * 50) + 10,
          minStockLevel: 10,
          maxStockLevel: 100,
          reorderPoint: 15,
          dailyConsumption: Math.floor(Math.random() * 15) + 5
        }));

        await Inventory.insertMany(branchInventory);
      }

      console.log('Database initialized with sample data');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Database cleanup utility
export const cleanupDB = async () => {
  try {
    await mongoose.connection.dropDatabase();
    console.log('Database cleaned up');
  } catch (error) {
    console.error('Error cleaning up database:', error);
  }
};

// Close database connection
export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};