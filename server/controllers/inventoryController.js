// controllers/inventoryController.js
import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js';
import Transfer from '../models/Transfer.js';
import Item from '../models/Item.js';
import Branch from '../models/Branch.js';

// ---------- Helpers (define once, at top-level) ----------
const toNumberOr = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const normalizeCode = (v) => String(v || '').trim().toUpperCase();

// =========================================================
export const inventoryController = {
  // Get inventory for a specific branch
  getBranchInventory: async (req, res) => {
    try {
      const { branchId } = req.params;
      const { lowStock = false } = req.query;

      if (!mongoose.isValidObjectId(branchId)) {
        return res.status(400).json({ error: 'Invalid branchId' });
      }

      let query = { branch: branchId };

      if (String(lowStock) === 'true') {
        query = {
          ...query,
          $expr: { $lte: ['$currentStock', '$reorderPoint'] },
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
  getMainBakeryInventory: async (_req, res) => {
    try {
      const mainBranch = await Branch.findOne({ code: 'MAIN' }).lean();
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
        return res
          .status(400)
          .json({ error: 'Item ID, branch ID, and quantity are required' });
      }
      if (!mongoose.isValidObjectId(itemId) || !mongoose.isValidObjectId(branchId)) {
        return res.status(400).json({ error: 'Invalid itemId or branchId' });
      }

      const qty = toNumberOr(quantity, NaN);
      if (!Number.isFinite(qty) || qty < 0) {
        return res.status(400).json({ error: 'Quantity must be a non-negative number' });
      }

      let inventory = await Inventory.findOne({ item: itemId, branch: branchId });

      if (!inventory) {
        inventory = new Inventory({
          item: itemId,
          branch: branchId,
          currentStock: operation === 'set' ? qty : operation === 'add' ? qty : 0,
          lastRestocked: new Date(),
        });
      } else {
        if (operation === 'set') {
          inventory.currentStock = qty;
        } else if (operation === 'add') {
          inventory.currentStock += qty;
        } else if (operation === 'subtract') {
          inventory.currentStock = Math.max(0, inventory.currentStock - qty);
        } else {
          return res.status(400).json({ error: 'Invalid operation' });
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

  // --- Transfer using itemCode + branchCode ---
  // --- Minimal transfer by codes: create transfer, then decrement item stock ---
transferItems: async (req, res) => {
  const { itemCode, branchCode, quantity } = req.body;

  // no validations (per request) — assumes codes exist and quantity is valid
  const iCode = normalizeCode(itemCode);
  const bCode = normalizeCode(branchCode);
  const qty = Number(quantity);

  // find docs by code
  const item = await Item.findOne({ code: iCode }).lean();
  const branch = await Branch.findOne({ code: bCode }).lean();

  // create transfer first
  const transfer = await Transfer.create({
    item: item._id,
    fromBranch: null,          // central/main
    toBranch: branch._id,
    quantity: qty,
    status: 'delivered',
    requestDate: new Date(),
    deliveryDate: new Date(),
  });

  // then decrement main item stock and update destination branch inventory
  await Item.updateOne({ _id: item._id }, { $inc: { stock: -qty } });
  await Inventory.updateOne(
    { item: item._id, branch: branch._id },
    {
      $setOnInsert: { reorderPoint: 10, maxStockLevel: 100, lastRestocked: new Date() },
      $inc: { currentStock: qty },
      $set: { lastUpdated: new Date() },
    },
    { upsert: true }
  );

  return res.status(201).json({ transfer });
},


  // Get transfer history
  getTransferHistory: async (req, res) => {
    try {
      const { itemId, branchId } = req.query;

      const query = {};
      if (itemId) {
        if (!mongoose.isValidObjectId(itemId)) {
          return res.status(400).json({ error: 'Invalid itemId' });
        }
        query.item = itemId;
      }
      if (branchId) {
        if (!mongoose.isValidObjectId(branchId)) {
          return res.status(400).json({ error: 'Invalid branchId' });
        }
        query.toBranch = branchId;
      }

      const transfers = await Transfer.find(query)
        .populate('item', 'name code')
        .populate('fromBranch', 'name code')
        .populate('toBranch', 'name code')
        .sort({ requestDate: -1 });

      res.json({ transfers });
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      res.status(500).json({ error: 'Server error while fetching transfer history' });
    }
  },

  // Get inventory alerts
  getAlerts: async (req, res) => {
    try {
      const { branchId } = req.query;
      const query = {};

      if (branchId) {
        if (!mongoose.isValidObjectId(branchId)) {
          return res.status(400).json({ error: 'Invalid branchId' });
        }
        query.branch = branchId;
      }

      const inventory = await Inventory.find(query)
        .populate('item', 'name code category')
        .populate('branch', 'name code');

      const alerts = { outOfStock: [], lowStock: [], overStocked: [] };

      inventory.forEach((inv) => {
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
  getSummary: async (_req, res) => {
    try {
      const summary = await Inventory.aggregate([
        {
          $lookup: {
            from: 'items',
            localField: 'item',
            foreignField: '_id',
            as: 'itemInfo',
          },
        },
        { $unwind: '$itemInfo' },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalStock: { $sum: '$currentStock' },
            totalValue: { $sum: { $multiply: ['$currentStock', '$itemInfo.price'] } },
            lowStockItems: {
              $sum: { $cond: [{ $lte: ['$currentStock', '$reorderPoint'] }, 1, 0] },
            },
            outOfStockItems: { $sum: { $cond: [{ $eq: ['$currentStock', 0] }, 1, 0] } },
          },
        },
      ]);

      const categoryBreakdown = await Inventory.aggregate([
        {
          $lookup: {
            from: 'items',
            localField: 'item',
            foreignField: '_id',
            as: 'itemInfo',
          },
        },
        { $unwind: '$itemInfo' },
        {
          $group: {
            _id: '$itemInfo.category',
            totalItems: { $sum: 1 },
            totalStock: { $sum: '$currentStock' },
            totalValue: { $sum: { $multiply: ['$currentStock', '$itemInfo.price'] } },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      res.json({
        summary:
          summary[0] || {
            totalItems: 0,
            totalStock: 0,
            totalValue: 0,
            lowStockItems: 0,
            outOfStockItems: 0,
          },
        categoryBreakdown,
      });
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      res.status(500).json({ error: 'Server error while fetching inventory summary' });
    }
  },
};
