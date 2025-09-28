// controllers/reportController.js
import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js';
import Transfer from '../models/Transfer.js';
import Item from '../models/Item.js';
import Branch from '../models/Branch.js';

const { isValidObjectId, Types } = mongoose;

export const reportController = {
  // Get dashboard overview data (no auth required)
  getDashboardData: async (req, res) => {
    try {
      // You can accept optional date range but it's not required by this controller
      // const { startDate, endDate } = req.query;

      const [totalItems, totalBranches] = await Promise.all([
        Item.countDocuments({ isActive: true }),
        Branch.countDocuments({ status: 'active' }),
      ]);

      // Inventory summary
      const inventorySummary = await Inventory.aggregate([
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
            totalStock: { $sum: '$currentStock' },
            totalValue: { $sum: { $multiply: ['$currentStock', '$itemInfo.price'] } },
            lowStockItems: {
              $sum: {
                $cond: [{ $lte: ['$currentStock', '$reorderPoint'] }, 1, 0],
              },
            },
          },
        },
      ]);

      // Category distribution
      const categoryDistribution = await Inventory.aggregate([
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
            count: { $sum: 1 },
            totalStock: { $sum: '$currentStock' },
            totalValue: { $sum: { $multiply: ['$currentStock', '$itemInfo.price'] } },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Branch performance (simple placeholder using actual active branches)
      const branches = await Branch.find({ status: 'active' }, 'name');
      const branchPerformance = branches.map((branch) => ({
        id: branch._id,
        name: branch.name,
        items: Math.floor(Math.random() * 100) + 20,
        value: Math.floor(Math.random() * 5000) + 2000,
        status: 'active',
      }));

      // Recent transfers
      const recentTransfers = await Transfer.find()
        .populate('item', 'name code')
        .populate('fromBranch', 'name')
        .populate('toBranch', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const summary = inventorySummary[0] || {
        totalStock: 0,
        totalValue: 0,
        lowStockItems: 0,
      };

      res.json({
        overview: {
          totalItems,
          totalBranches,
          ...summary,
        },
        categoryDistribution,
        branchPerformance,
        recentTransfers,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: 'Server error while fetching dashboard data' });
    }
  },

  // Get inventory report (no auth required)
  getInventoryReport: async (req, res) => {
    try {
      const { branchId, category, stockStatus } = req.query;

      const matchConditions = {};
      if (branchId) {
        if (!isValidObjectId(branchId)) {
          return res.status(400).json({ error: 'Invalid branchId' });
        }
        matchConditions.branch = new Types.ObjectId(branchId);
      }

      const pipeline = [
        { $match: matchConditions },
        {
          $lookup: {
            from: 'items',
            localField: 'item',
            foreignField: '_id',
            as: 'itemInfo',
          },
        },
        {
          $lookup: {
            from: 'branches',
            localField: 'branch',
            foreignField: '_id',
            as: 'branchInfo',
          },
        },
        { $unwind: '$itemInfo' },
        { $unwind: '$branchInfo' },
      ];

      if (category && category !== 'all') {
        pipeline.push({ $match: { 'itemInfo.category': category } });
      }

      pipeline.push({
        $addFields: {
          stockStatus: {
            $cond: [
              { $eq: ['$currentStock', 0] },
              'out_of_stock',
              {
                $cond: [
                  { $lte: ['$currentStock', '$reorderPoint'] },
                  'low',
                  {
                    $cond: [
                      { $gte: ['$currentStock', '$maxStockLevel'] },
                      'overstocked',
                      'normal',
                    ],
                  },
                ],
              },
            ],
          },
          totalValue: { $multiply: ['$currentStock', '$itemInfo.price'] },
        },
      });

      if (stockStatus && stockStatus !== 'all') {
        pipeline.push({ $match: { stockStatus } });
      }

      pipeline.push({ $sort: { 'itemInfo.name': 1 } });

      const inventory = await Inventory.aggregate(pipeline);

      const summaryAgg = await Inventory.aggregate([
        { $match: matchConditions },
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
            avgStockLevel: { $avg: '$currentStock' },
          },
        },
      ]);

      res.json({
        inventory,
        summary:
          summaryAgg[0] || {
            totalItems: 0,
            totalStock: 0,
            totalValue: 0,
            avgStockLevel: 0,
          },
      });
    } catch (error) {
      console.error('Error generating inventory report:', error);
      res.status(500).json({ error: 'Server error while generating inventory report' });
    }
  },

  // Get branch performance report (no auth required)
  getBranchReport: async (req, res) => {
    try {
      const branches = await Branch.find({ status: 'active' });

      const branchReports = await Promise.all(
        branches.map(async (branch) => {
          const inventory = await Inventory.find({ branch: branch._id })
            .populate('item', 'name code category price')
            .lean();

          const totalItems = inventory.length;
          const totalStock = inventory.reduce((sum, inv) => sum + (inv.currentStock || 0), 0);
          const totalValue = inventory.reduce(
            (sum, inv) => sum + (inv.currentStock || 0) * (inv.item?.price || 0),
            0
          );
          const lowStockItems = inventory.filter(
            (inv) => (inv.currentStock || 0) <= (inv.reorderPoint || 0)
          ).length;

          const categoryBreakdown = inventory.reduce((acc, inv) => {
            const category = inv.item?.category || 'Uncategorized';
            if (!acc[category]) {
              acc[category] = { count: 0, stock: 0, value: 0 };
            }
            acc[category].count += 1;
            acc[category].stock += inv.currentStock || 0;
            acc[category].value += (inv.currentStock || 0) * (inv.item?.price || 0);
            return acc;
          }, {});

          return {
            branch: {
              id: branch._id,
              name: branch.name,
              code: branch.code,
              city: branch.address?.city,
              status: branch.status,
            },
            metrics: {
              totalItems,
              totalStock,
              totalValue,
              lowStockItems,
            },
            categoryBreakdown,
          };
        })
      );

      res.json({ branchReports });
    } catch (error) {
      console.error('Error generating branch report:', error);
      res.status(500).json({ error: 'Server error while generating branch report' });
    }
  },

  // Get transfer report (no auth required)
  getTransferReport: async (req, res) => {
    try {
      const { startDate, endDate, branchId, status } = req.query;

      const matchConditions = {};

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({ error: 'Invalid startDate or endDate' });
        }
        matchConditions.createdAt = { $gte: start, $lte: end };
      }

      if (branchId) {
        if (!isValidObjectId(branchId)) {
          return res.status(400).json({ error: 'Invalid branchId' });
        }
        matchConditions.$or = [
          { fromBranch: new Types.ObjectId(branchId) },
          { toBranch: new Types.ObjectId(branchId) },
        ];
      }

      if (status && status !== 'all') {
        matchConditions.status = status;
      }

      const transfers = await Transfer.aggregate([
        { $match: matchConditions },
        {
          $lookup: {
            from: 'items',
            localField: 'item',
            foreignField: '_id',
            as: 'itemInfo',
          },
        },
        {
          $lookup: {
            from: 'branches',
            localField: 'fromBranch',
            foreignField: '_id',
            as: 'fromBranchInfo',
          },
        },
        {
          $lookup: {
            from: 'branches',
            localField: 'toBranch',
            foreignField: '_id',
            as: 'toBranchInfo',
          },
        },
        { $unwind: '$itemInfo' },
        { $unwind: '$fromBranchInfo' },
        { $unwind: '$toBranchInfo' },
        {
          $addFields: {
            totalValue: { $multiply: ['$quantity', '$itemInfo.price'] },
          },
        },
        { $sort: { createdAt: -1 } },
      ]);

      const summary = transfers.reduce(
        (acc, t) => {
          acc.totalTransfers += 1;
          acc.totalQuantity += t.quantity || 0;
          acc.totalValue += t.totalValue || 0;
          acc.byStatus[t.status] = (acc.byStatus[t.status] || 0) + 1;
          return acc;
        },
        { totalTransfers: 0, totalQuantity: 0, totalValue: 0, byStatus: {} }
      );

      res.json({ transfers, summary });
    } catch (error) {
      console.error('Error generating transfer report:', error);
      res.status(500).json({ error: 'Server error while generating transfer report' });
    }
  },

  // Get financial summary report (no auth required)
  getFinancialReport: async (req, res) => {
    try {
      const inventoryValue = await Inventory.aggregate([
        {
          $lookup: {
            from: 'items',
            localField: 'item',
            foreignField: '_id',
            as: 'itemInfo',
          },
        },
        {
          $lookup: {
            from: 'branches',
            localField: 'branch',
            foreignField: '_id',
            as: 'branchInfo',
          },
        },
        { $unwind: '$itemInfo' },
        { $unwind: '$branchInfo' },
        {
          $group: {
            _id: '$branch',
            branchName: { $first: '$branchInfo.name' },
            totalValue: { $sum: { $multiply: ['$currentStock', '$itemInfo.price'] } },
            totalItems: { $sum: 1 },
            totalStock: { $sum: '$currentStock' },
          },
        },
        { $sort: { totalValue: -1 } },
      ]);

      const totalInventoryValue = inventoryValue.reduce((sum, b) => sum + (b.totalValue || 0), 0);

      // Mock financials (replace with real accounting/sales data if available)
      const mockFinancialData = {
        revenue: {
          daily: 8500,
          weekly: 59500,
          monthly: 238000,
          yearly: 2856000,
        },
        expenses: {
          ingredients: totalInventoryValue * 0.6,
          labor: 85000,
          utilities: 12000,
          rent: 25000,
          other: 18000,
        },
        profit: {
          gross: 238000 * 0.4,
          net: 238000 * 0.15,
        },
      };

      res.json({
        inventoryValue: {
          total: totalInventoryValue,
          byBranch: inventoryValue,
        },
        financial: mockFinancialData,
        trends: {
          monthly: [
            { month: 'Jan', revenue: 220000, profit: 33000 },
            { month: 'Feb', revenue: 225000, profit: 33750 },
            { month: 'Mar', revenue: 238000, profit: 35700 },
          ],
        },
      });
    } catch (error) {
      console.error('Error generating financial report:', error);
      res.status(500).json({ error: 'Server error while generating financial report' });
    }
  },

  // Get low stock alerts report (no auth required)
  getAlertsReport: async (req, res) => {
    try {
      const alerts = await Inventory.aggregate([
        {
          $lookup: {
            from: 'items',
            localField: 'item',
            foreignField: '_id',
            as: 'itemInfo',
          },
        },
        {
          $lookup: {
            from: 'branches',
            localField: 'branch',
            foreignField: '_id',
            as: 'branchInfo',
          },
        },
        { $unwind: '$itemInfo' },
        { $unwind: '$branchInfo' },
        {
          $addFields: {
            alertLevel: {
              $cond: [
                { $eq: ['$currentStock', 0] },
                'critical',
                {
                  $cond: [
                    { $lte: ['$currentStock', '$reorderPoint'] },
                    'warning',
                    'normal',
                  ],
                },
              ],
            },
          },
        },
        { $match: { alertLevel: { $in: ['critical', 'warning'] } } },
        { $sort: { alertLevel: 1, currentStock: 1 } },
      ]);

      const summary = {
        critical: alerts.filter((a) => a.alertLevel === 'critical').length,
        warning: alerts.filter((a) => a.alertLevel === 'warning').length,
        total: alerts.length,
      };

      res.json({ alerts, summary });
    } catch (error) {
      console.error('Error generating alerts report:', error);
      res.status(500).json({ error: 'Server error while generating alerts report' });
    }
  },

  getReport: async (req, res) => {
    try {
      const { type } = req.params;
      const { range } = req.query;

      // Add your logic to fetch real data from database
      // This is just an example structure
      const data = await generateReportData(type, range);

      res.json(data);
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  },

  generatePDF: async (req, res) => {
    try {
      const { type } = req.params;
      const { range } = req.query;

      // Add PDF generation logic here
      // You might want to use a library like PDFKit or html-pdf

      res.download('path-to-generated-pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  },
};
