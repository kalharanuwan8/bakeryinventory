// server/controllers/branchController.js
import Branch from '../models/Branch.js';
import Transfer from '../models/Transfer.js';
import Item from '../models/Item.js';

/**
 * GET /api/branches
 * Supports: search (name/city), status, city
 */
export const getBranches = async (req, res) => {
  try {
    const { search = '', status, city, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const searchRegex = search ? new RegExp(search, 'i') : null;

    const q = {
      ...(searchRegex
        ? {
            $or: [
              { name: searchRegex },
              { 'address.city': searchRegex },
              { code: searchRegex },
            ],
          }
        : {}),
      ...(status && status !== 'all' ? { status } : {}),
      ...(city ? { 'address.city': city } : {}),
    };

    const [branches, total] = await Promise.all([
      Branch.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Branch.countDocuments(q),
    ]);

    res.json({
      branches,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: page,
        perPage: limit,
      },
    });
  } catch (e) {
    handleError(res, e, 'Failed to fetch branches');
  }
};

/**
 * POST /api/branches
 */
export const createBranch = async (req, res) => {
  try {
    const { name, code, address } = req.body;

    // Basic validation
    if (!name || !code || !address) {
      return res.status(400).json({
        error: 'Missing required fields: name, code, address',
      });
    }

    const branch = await Branch.create(req.body);
    res.status(201).json({ branch });
  } catch (e) {
    handleError(res, e, 'Failed to create branch');
  }
};

/**
 * PUT /api/branches/:id
 */
export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    res.json({ branch });
  } catch (e) {
    handleError(res, e, 'Failed to update branch');
  }
};

/**
 * DELETE /api/branches/:id
 */
export const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByIdAndDelete(id);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    res.json({ success: true });
  } catch (e) {
    handleError(res, e, 'Failed to delete branch');
  }
};

/**
 * PATCH /api/branches/:id/status
 * Body: { status: 'active' | 'inactive' | 'maintenance' }
 */
export const updateBranchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const branch = await Branch.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    res.json({ branch });
  } catch (e) {
    handleError(res, e, 'Failed to update status');
  }
};

/**
 * GET /api/branches/cities
 * Utility for filters
 */
export const listCities = async (_req, res) => {
  try {
    const cities = await Branch.distinct('address.city');
    res.json({ cities });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load cities' });
  }
};

const handleError = (res, e, defaultMessage) => {
  console.error(e);
  if (e?.errors) {
    const errorMessage = Object.values(e.errors)
      .map((x) => x.message)
      .join(', ');
    return res.status(400).json({ error: errorMessage });
  }
  return res.status(500).json({ error: e?.message || defaultMessage });
};
/**
 * POST /api/branches/inventory-from-transfers
 * Body: { branchCode: string }
 * Returns: { branch: {id, code, name}, inventory: [{ code, name, quantity }] }
 */
export const getBranchInventoryFromTransfers = async (req, res) => {
  try {
    const branchCode = String(req.body.branchCode || '').trim().toUpperCase();

    if (!branchCode) {
      return res.status(400).json({ error: 'branchCode is required in request body' });
    }

    const branch = await Branch.findOne({ code: branchCode })
      .select('_id name code')
      .lean();

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found for given branchCode' });
    }

    // Aggregate all delivered transfers going INTO this branch
    const inventory = await Transfer.aggregate([
      { $match: { toBranch: branch._id, status: 'delivered' } },
      { $group: { _id: '$item', quantity: { $sum: '$quantity' } } },
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: '$item' },
      {
        $project: {
          _id: 0,
          code: '$item.code',
          name: '$item.name',
          quantity: 1,
        },
      },
      { $sort: { name: 1 } },
    ]);

    return res.json({
      branch,
      inventory,
    });
  } catch (e) {
    handleError(res, e, 'Failed to load branch inventory from transfers');
  }
};

/**
 * GET /api/branches/:id/inventory-details
 * Returns detailed inventory information with daily summaries and total values
 */
export const getBranchInventoryDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // Optional date filter for daily summary

    const branch = await Branch.findById(id).select('_id name code address').lean();
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Get current inventory with item details
    const currentInventory = await Transfer.aggregate([
      { $match: { toBranch: branch._id, status: 'delivered' } },
      { $group: { _id: '$item', totalQuantity: { $sum: '$quantity' } } },
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: '$item' },
      {
        $project: {
          _id: 0,
          itemId: '$item._id',
          code: '$item.code',
          name: '$item.name',
          category: '$item.category',
          price: '$item.price',
          quantity: '$totalQuantity',
          totalValue: { $multiply: ['$totalQuantity', '$item.price'] },
        },
      },
      { $sort: { name: 1 } },
    ]);

    // Calculate total inventory value
    const totalInventoryValue = currentInventory.reduce((sum, item) => sum + item.totalValue, 0);

    // Get daily inventory summary (last 7 days)
    const dailySummary = await Transfer.aggregate([
      {
        $match: {
          toBranch: branch._id,
          status: 'delivered',
          deliveryDate: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      },
      {
        $lookup: {
          from: 'items',
          localField: 'item',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: '$item' },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$deliveryDate' } },
            item: '$item._id',
          },
          quantity: { $sum: '$quantity' },
          itemName: { $first: '$item.name' },
          itemPrice: { $first: '$item.price' },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          items: {
            $push: {
              itemId: '$_id.item',
              name: '$itemName',
              quantity: '$quantity',
              price: '$itemPrice',
              value: { $multiply: ['$quantity', '$itemPrice'] },
            },
          },
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$itemPrice'] } },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    // Get category breakdown
    const categoryBreakdown = await Transfer.aggregate([
      { $match: { toBranch: branch._id, status: 'delivered' } },
      { $group: { _id: '$item', totalQuantity: { $sum: '$quantity' } } },
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: '$item' },
      {
        $group: {
          _id: '$item.category',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$totalQuantity' },
          totalValue: { $sum: { $multiply: ['$totalQuantity', '$item.price'] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get low stock alerts
    const lowStockItems = currentInventory.filter(item => item.quantity <= 5);

    res.json({
      branch,
      inventory: {
        current: currentInventory,
        totalItems: currentInventory.length,
        totalQuantity: currentInventory.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: totalInventoryValue,
        categoryBreakdown,
        lowStockItems,
      },
      dailySummary,
      summary: {
        totalBranches: 1, // This specific branch
        totalInventoryValue,
        totalItems: currentInventory.length,
        lowStockCount: lowStockItems.length,
        lastUpdated: new Date(),
      },
    });
  } catch (e) {
    handleError(res, e, 'Failed to load branch inventory details');
  }
};

/**
 * GET /api/branches/inventory-summary
 * Returns summary of all branches with their inventory details
 */
export const getAllBranchesInventorySummary = async (req, res) => {
  try {
    const branches = await Branch.find({ status: 'active' }).select('_id name code address').lean();

    const branchSummaries = await Promise.all(
      branches.map(async (branch) => {
        const inventory = await Transfer.aggregate([
          { $match: { toBranch: branch._id, status: 'delivered' } },
          { $group: { _id: '$item', totalQuantity: { $sum: '$quantity' } } },
          {
            $lookup: {
              from: 'items',
              localField: '_id',
              foreignField: '_id',
              as: 'item',
            },
          },
          { $unwind: '$item' },
          {
            $project: {
              totalValue: { $multiply: ['$totalQuantity', '$item.price'] },
            },
          },
        ]);

        const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
        const totalItems = inventory.length;

        return {
          ...branch,
          inventory: {
            totalItems,
            totalValue,
            lastUpdated: new Date(),
          },
        };
      })
    );

    const overallSummary = {
      totalBranches: branches.length,
      totalInventoryValue: branchSummaries.reduce((sum, branch) => sum + branch.inventory.totalValue, 0),
      totalItems: branchSummaries.reduce((sum, branch) => sum + branch.inventory.totalItems, 0),
      averageValuePerBranch: branchSummaries.length > 0 
        ? branchSummaries.reduce((sum, branch) => sum + branch.inventory.totalValue, 0) / branchSummaries.length 
        : 0,
    };

    res.json({
      branches: branchSummaries,
      summary: overallSummary,
    });
  } catch (e) {
    handleError(res, e, 'Failed to load branches inventory summary');
  }
};