import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js';
import Transfer from '../models/Transfer.js';
import Item from '../models/Item.js';
import Branch from '../models/Branch.js';

export const inventoryController = {
  // Get inventory for a specific branch
  getBranchInventory: async (req, res) => {
    try {
      const { branchId } = req.params;
      const { lowStock = false } = req.query;

      let query = { branch: branchId };
      
      if (lowStock === 'true') {
        query = {
          ...query,
          $expr: { $lte: ['$currentStock', '$reorderPoint'] }
        };
      }

      const inventory = await Inventory.find(query)
        .populate('item', 'name code category price')
        .populate('branch', 'name code')
        .sort({ 'item.name': 1 });

      res.json({ inventory });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ error: 'Server error while fetching inventory' });
    }
  },

  // Get main bakery inventory
  getMainBakeryInventory: async (req, res) => {
    try {
      const mainBranch = await Branch.findOne({ code: 'MAIN' });
      if (!mainBranch) {
        return res.status(404).json({ error: 'Main bakery branch not found' });
      }

      const inventory = await Inventory.find({ branch: mainBranch._id })
        .populate('item', 'name code category price')
        .sort({ 'item.name': 1 });

      res.json({ inventory });
    } catch (error) {
      console.error('Error fetching main bakery inventory:', error);
      res.status(500).json({ error: 'Server error while fetching main bakery inventory' });
    }
  },

  // Update stock for a specific item in a branch
  updateStock: async (req, res) => {
    try {
      const { itemId, branchId, quantity, operation = 'add' } = req.body;

      if (!itemId || !branchId || quantity === undefined) {
        return res.status(400).json({ error: 'Item ID, branch ID, and quantity are required' });
      }

      let inventory = await Inventory.findOne({ item: itemId, branch: branchId });

      if (!inventory) {
        inventory = new Inventory({
          item: itemId,
          branch: branchId,
          currentStock: operation === 'set' ? quantity : (operation === 'add' ? quantity : 0)
        });
      } else {
        if (operation === 'set') {
          inventory.currentStock = quantity;
        } else if (operation === 'add') {
          inventory.currentStock += quantity;
        } else if (operation === 'subtract') {
          inventory.currentStock = Math.max(0, inventory.currentStock - quantity);
        }
        inventory.lastRestocked = new Date();
      }

      await inventory.save();
      await inventory.populate('item', 'name code category price');
      await inventory.populate('branch', 'name code');

      res.json({ message: 'Stock updated successfully', inventory });
    } catch (error) {
      console.error('Error updating stock:', error);
      res.status(500).json({ error: 'Server error while updating stock' });
    }
  },

  // Transfer items between branches
  transferItems: async (req, res) => {
    try {
      const { itemId, fromBranchId, toBranchId, quantity, notes } = req.body;

      if (!itemId || !fromBranchId || !toBranchId || !quantity) {
        return res.status(400).json({ error: 'Item ID, source branch, destination branch, and quantity are required' });
      }

      if (fromBranchId === toBranchId) {
        return res.status(400).json({ error: 'Source and destination branches cannot be the same' });
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const sourceInventory = await Inventory.findOne({ item: itemId, branch: fromBranchId }).session(session);
        if (!sourceInventory || sourceInventory.currentStock < quantity) {
          await session.abortTransaction();
          return res.status(400).json({ error: 'Insufficient stock in source branch' });
        }

        sourceInventory.currentStock -= quantity;
        await sourceInventory.save({ session });

        let destInventory = await Inventory.findOne({ item: itemId, branch: toBranchId }).session(session);
        if (!destInventory) {
          destInventory = new Inventory({ item: itemId, branch: toBranchId, currentStock: quantity });
        } else {
          destInventory.currentStock += quantity;
          destInventory.lastRestocked = new Date();
        }
        await destInventory.save({ session });

        const transfer = new Transfer({
          item: itemId,
          fromBranch: fromBranchId,
          toBranch: toBranchId,
          quantity,
          status: 'delivered',
          approvedDate: new Date(),
          deliveryDate: new Date(),
          notes
        });

        await transfer.save({ session });
        await session.commitTransaction();

        await transfer.populate('item', 'name code');
        await transfer.populate('fromBranch', 'name');
        await transfer.populate('toBranch', 'name');

        res.json({ message: 'Transfer completed successfully', transfer });
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      console.error('Error processing transfer:', error);
      res.status(500).json({ error: 'Server error while processing transfer' });
    }
  },

  // Get transfer history
  getTransfers: async (req, res) => {
    try {
      const { branchId, status, limit = 50 } = req.query;
      let query = {};

      if (branchId) {
        query.$or = [{ fromBranch: branchId }, { toBranch: branchId }];
      }
      if (status) {
        query.status = status;
      }

      const transfers = await Transfer.find(query)
        .populate('item', 'name code category')
        .populate('fromBranch', 'name code')
        .populate('toBranch', 'name code')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      res.json({ transfers });
    } catch (error) {
      console.error('Error fetching transfers:', error);
      res.status(500).json({ error: 'Server error while fetching transfers' });
    }
  },

  // Get inventory alerts
  getAlerts: async (req, res) => {
    try {
      const { branchId } = req.query;
      let query = {};

      if (branchId) query.branch = branchId;

      const inventory = await Inventory.find(query)
        .populate('item', 'name code category')
        .populate('branch', 'name code');

      const alerts = { outOfStock: [], lowStock: [], overStocked: [] };

      inventory.forEach(inv => {
        if (inv.currentStock === 0) alerts.outOfStock.push(inv);
        else if (inv.currentStock <= inv.reorderPoint) alerts.lowStock.push(inv);
        else if (inv.currentStock >= inv.maxStockLevel) alerts.overStocked.push(inv);
      });

      res.json({ alerts });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ error: 'Server error while fetching alerts' });
    }
  },

  // Get inventory summary
  getSummary: async (req, res) => {
    try {
      const summary = await Inventory.aggregate([
        {
          $lookup: { from: 'items', localField: 'item', foreignField: '_id', as: 'itemInfo' }
        },
        { $unwind: '$itemInfo' },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalStock: { $sum: '$currentStock' },
            totalValue: { $sum: { $multiply: ['$currentStock', '$itemInfo.price'] } },
            lowStockItems: { $sum: { $cond: [{ $lte: ['$currentStock', '$reorderPoint'] }, 1, 0] } },
            outOfStockItems: { $sum: { $cond: [{ $eq: ['$currentStock', 0] }, 1, 0] } }
          }
        }
      ]);

      const categoryBreakdown = await Inventory.aggregate([
        {
          $lookup: { from: 'items', localField: 'item', foreignField: '_id', as: 'itemInfo' }
        },
        { $unwind: '$itemInfo' },
        {
          $group: {
            _id: '$itemInfo.category',
            totalItems: { $sum: 1 },
            totalStock: { $sum: '$currentStock' },
            totalValue: { $sum: { $multiply: ['$currentStock', '$itemInfo.price'] } }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.json({
        summary: summary[0] || { totalItems: 0, totalStock: 0, totalValue: 0, lowStockItems: 0, outOfStockItems: 0 },
        categoryBreakdown
      });
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      res.status(500).json({ error: 'Server error while fetching inventory summary' });
    }
  }
};
