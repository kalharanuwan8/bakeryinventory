// controllers/reportController.js
import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import Transfer from "../models/Transfer.js";
import Item from "../models/Item.js";
import Branch from "../models/Branch.js";

const { isValidObjectId, Types } = mongoose;

/**
 * Helpers that avoid NaN when a field is missing/null
 */
const $num = (expr, fallback = 0) => ({ $ifNull: [expr, fallback] });

export const reportController = {
  /**
   * GET /api/reports/overview
   * Dashboard overview (totals + category + branch perf + recent transfers)
   */
  getDashboardData: async (_req, res) => {
    try {
      // counts (from your schema)
      const [totalItems, totalBranches] = await Promise.all([
        Item.countDocuments({ isActive: true }),
        Branch.countDocuments({ status: "active" }),
      ]);

      // Inventory summary (using inventories + items.price)
      const inventorySummary = await Inventory.aggregate([
        {
          $lookup: {
            from: "items",
            localField: "item",
            foreignField: "_id",
            as: "itemInfo",
          },
        },
        { $unwind: "$itemInfo" },
        {
          $group: {
            _id: null,
            totalStock: { $sum: $num("$currentStock") },
            totalValue: {
              $sum: {
                $multiply: [$num("$currentStock"), $num("$itemInfo.price")],
              },
            },
            lowStockItems: {
              $sum: {
                $cond: [
                  { $lte: [$num("$currentStock"), $num("$reorderPoint")] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      // Category distribution (group by item.category)
      const categoryDistribution = await Inventory.aggregate([
        {
          $lookup: {
            from: "items",
            localField: "item",
            foreignField: "_id",
            as: "itemInfo",
          },
        },
        { $unwind: "$itemInfo" },
        {
          $group: {
            _id: $num("$itemInfo.category", "Uncategorized"),
            count: { $sum: 1 },
            totalStock: { $sum: $num("$currentStock") },
            totalValue: {
              $sum: {
                $multiply: [$num("$currentStock"), $num("$itemInfo.price")],
              },
            },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Branch performance (via inventories + branch + item.price)
      const branchPerformance = await Inventory.aggregate([
        {
          $lookup: {
            from: "branches",
            localField: "branch",
            foreignField: "_id",
            as: "branchInfo",
          },
        },
        { $unwind: "$branchInfo" },
        {
          $lookup: {
            from: "items",
            localField: "item",
            foreignField: "_id",
            as: "itemInfo",
          },
        },
        { $unwind: "$itemInfo" },
        {
          $group: {
            _id: "$branch",
            name: { $first: "$branchInfo.name" },
            items: { $sum: 1 },
            totalStock: { $sum: $num("$currentStock") },
            value: {
              $sum: {
                $multiply: [$num("$currentStock"), $num("$itemInfo.price")],
              },
            },
            lowStockItems: {
              $sum: {
                $cond: [
                  { $lte: [$num("$currentStock"), $num("$reorderPoint")] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { value: -1 } },
      ]);

      // Recent transfers (handles null fromBranch)
      const recentTransfers = await Transfer.aggregate([
        {
          $lookup: {
            from: "items",
            localField: "item",
            foreignField: "_id",
            as: "itemInfo",
          },
        },
        { $unwind: "$itemInfo" },
        {
          $lookup: {
            from: "branches",
            localField: "fromBranch",
            foreignField: "_id",
            as: "fromBranchInfo",
          },
        },
        {
          $lookup: {
            from: "branches",
            localField: "toBranch",
            foreignField: "_id",
            as: "toBranchInfo",
          },
        },
        { $unwind: { path: "$fromBranchInfo", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$toBranchInfo", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            totalValue: { $multiply: [$num("$quantity"), $num("$itemInfo.price")] },
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
      ]);

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
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      res.status(500).json({ error: "Server error while fetching dashboard data" });
    }
  },

  /**
   * GET /api/reports/inventory?branchId=&category=&stockStatus=
   * Inventory with filters. Matches your fields: minStockLevel, maxStockLevel, reorderPoint.
   */
  getInventoryReport: async (req, res) => {
    try {
      const { branchId, category, stockStatus } = req.query;

      const match = {};
      if (branchId) {
        if (!isValidObjectId(branchId)) {
          return res.status(400).json({ error: "Invalid branchId" });
        }
        match.branch = new Types.ObjectId(branchId);
      }

      const pipeline = [
        { $match: match },
        {
          $lookup: {
            from: "items",
            localField: "item",
            foreignField: "_id",
            as: "itemInfo",
          },
        },
        { $unwind: "$itemInfo" },
        {
          $lookup: {
            from: "branches",
            localField: "branch",
            foreignField: "_id",
            as: "branchInfo",
          },
        },
        { $unwind: "$branchInfo" },
      ];

      if (category && category !== "all") {
        pipeline.push({ $match: { "itemInfo.category": category } });
      }

      // Stock status derived from your fields (null-safe)
      pipeline.push({
        $addFields: {
          stockStatus: {
            $switch: {
              branches: [
                { case: { $eq: [$num("$currentStock"), 0] }, then: "out_of_stock" },
                {
                  case: { $lte: [$num("$currentStock"), $num("$reorderPoint")] },
                  then: "low",
                },
                {
                  case: { $gte: [$num("$currentStock"), $num("$maxStockLevel")] },
                  then: "overstocked",
                },
              ],
              default: "normal",
            },
          },
          totalValue: { $multiply: [$num("$currentStock"), $num("$itemInfo.price")] },
        },
      });

      if (stockStatus && stockStatus !== "all") {
        pipeline.push({ $match: { stockStatus } });
      }

      pipeline.push({ $sort: { "itemInfo.name": 1 } });

      const inventory = await Inventory.aggregate(pipeline);

      // Summary
      const summaryAgg = await Inventory.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "items",
            localField: "item",
            foreignField: "_id",
            as: "itemInfo",
          },
        },
        { $unwind: "$itemInfo" },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalStock: { $sum: $num("$currentStock") },
            totalValue: {
              $sum: { $multiply: [$num("$currentStock"), $num("$itemInfo.price")] },
            },
            avgStockLevel: { $avg: $num("$currentStock") },
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
    } catch (err) {
      console.error("Error generating inventory report:", err);
      res.status(500).json({ error: "Server error while generating inventory report" });
    }
  },

  /**
   * GET /api/reports/branches
   * Branch performance using your schema (address.city, status, etc.)
   */
  getBranchReport: async (_req, res) => {
    try {
      const branches = await Branch.find({ status: "active" }).lean();

      const branchReports = await Promise.all(
        branches.map(async (branch) => {
          const inv = await Inventory.find({ branch: branch._id })
            .populate("item", "name code category price")
            .lean();

          const totals = inv.reduce(
            (acc, r) => {
              const stock = r.currentStock || 0;
              const price = (r.item && r.item.price) || 0;
              acc.totalItems += 1;
              acc.totalStock += stock;
              acc.totalValue += stock * price;
              if (stock <= (r.reorderPoint ?? 0)) acc.lowStockItems += 1;
              return acc;
            },
            { totalItems: 0, totalStock: 0, totalValue: 0, lowStockItems: 0 }
          );

          const categoryBreakdown = inv.reduce((acc, r) => {
            const cat = (r.item && r.item.category) || "Uncategorized";
            if (!acc[cat]) acc[cat] = { count: 0, stock: 0, value: 0 };
            const stock = r.currentStock || 0;
            const price = (r.item && r.item.price) || 0;
            acc[cat].count += 1;
            acc[cat].stock += stock;
            acc[cat].value += stock * price;
            return acc;
          }, {});

          return {
            branch: {
              id: branch._id,
              name: branch.name,
              code: branch.code,
              city: branch.address?.city ?? null,
              status: branch.status,
            },
            metrics: totals,
            categoryBreakdown,
          };
        })
      );

      res.json({ branchReports });
    } catch (err) {
      console.error("Error generating branch report:", err);
      res.status(500).json({ error: "Server error while generating branch report" });
    }
  },

  /**
   * GET /api/reports/transfers?startDate=&endDate=&branchId=&status=
   * Works when fromBranch can be null (as in your data).
   */
  getTransferReport: async (req, res) => {
    try {
      const { startDate, endDate, branchId, status } = req.query;

      const match = {};

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start) || isNaN(end)) {
          return res.status(400).json({ error: "Invalid startDate or endDate" });
        }
        match.createdAt = { $gte: start, $lte: end };
      }

      if (branchId) {
        if (!isValidObjectId(branchId)) {
          return res.status(400).json({ error: "Invalid branchId" });
        }
        const bid = new Types.ObjectId(branchId);
        // fromBranch can be null in your data; match either side that equals the id
        match.$or = [{ fromBranch: bid }, { toBranch: bid }];
      }

      if (status && status !== "all") match.status = status;

      const transfers = await Transfer.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "items",
            localField: "item",
            foreignField: "_id",
            as: "itemInfo",
          },
        },
        { $unwind: "$itemInfo" },
        {
          $lookup: {
            from: "branches",
            localField: "fromBranch",
            foreignField: "_id",
            as: "fromBranchInfo",
          },
        },
        {
          $lookup: {
            from: "branches",
            localField: "toBranch",
            foreignField: "_id",
            as: "toBranchInfo",
          },
        },
        { $unwind: { path: "$fromBranchInfo", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$toBranchInfo", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            totalValue: { $multiply: [$num("$quantity"), $num("$itemInfo.price")] },
          },
        },
        { $sort: { createdAt: -1 } },
      ]);

      const summary = transfers.reduce(
        (acc, t) => {
          acc.totalTransfers += 1;
          acc.totalQuantity += t.quantity || 0;
          acc.totalValue += t.totalValue || 0;
          acc.byStatus[t.status || "unknown"] = (acc.byStatus[t.status || "unknown"] || 0) + 1;
          return acc;
        },
        { totalTransfers: 0, totalQuantity: 0, totalValue: 0, byStatus: {} }
      );

      res.json({ transfers, summary });
    } catch (err) {
      console.error("Error generating transfer report:", err);
      res.status(500).json({ error: "Server error while generating transfer report" });
    }
  },

  /**
   * GET /api/reports/financial
   * Uses inventories + items + transfers; all math is null-safe.
   */
  getFinancialReport: async (_req, res) => {
    try {
      // Inventory value by branch
      const inventoryValue = await Inventory.aggregate([
        {
          $lookup: {
            from: "items",
            localField: "item",
            foreignField: "_id",
            as: "itemInfo",
          },
        },
        { $unwind: "$itemInfo" },
        {
          $lookup: {
            from: "branches",
            localField: "branch",
            foreignField: "_id",
            as: "branchInfo",
          },
        },
        { $unwind: "$branchInfo" },
        {
          $group: {
            _id: "$branch",
            branchName: { $first: "$branchInfo.name" },
            totalItems: { $sum: 1 },
            totalStock: { $sum: $num("$currentStock") },
            totalValue: {
              $sum: {
                $multiply: [$num("$currentStock"), $num("$itemInfo.price")],
              },
            },
          },
        },
        { $sort: { totalValue: -1 } },
      ]);

      const totalInventoryValue = inventoryValue.reduce(
        (s, b) => s + (b.totalValue || 0),
        0
      );

      // Transfer stats (your transfers collection)
      const transferStatsAgg = await Transfer.aggregate([
        {
          $lookup: {
            from: "items",
            localField: "item",
            foreignField: "_id",
            as: "itemInfo",
          },
        },
        { $unwind: "$itemInfo" },
        {
          $group: {
            _id: null,
            totalTransfers: { $sum: 1 },
            totalQuantity: { $sum: $num("$quantity") },
            totalValue: {
              $sum: { $multiply: [$num("$quantity"), $num("$itemInfo.price")] },
            },
            avgTransferValue: {
              $avg: { $multiply: [$num("$quantity"), $num("$itemInfo.price")] },
            },
          },
        },
      ]);

      const transferStats =
        transferStatsAgg[0] || {
          totalTransfers: 0,
          totalQuantity: 0,
          totalValue: 0,
          avgTransferValue: 0,
        };

      // Very simple estimates (leave as-is but safe)
      const monthlyRevenue = transferStats.totalValue || 0;
      const estimatedExpenses = {
        ingredients: totalInventoryValue * 0.6,
        labor: Math.max(85000, monthlyRevenue * 0.3),
        utilities: Math.max(12000, monthlyRevenue * 0.05),
        rent: Math.max(25000, monthlyRevenue * 0.1),
        other: Math.max(18000, monthlyRevenue * 0.05),
      };
      const totalExpenses = Object.values(estimatedExpenses).reduce((s, v) => s + v, 0);

      const financial = {
        revenue: {
          daily: Math.round(monthlyRevenue / 30),
          weekly: Math.round(monthlyRevenue / 4),
          monthly: Math.round(monthlyRevenue),
          yearly: Math.round(monthlyRevenue * 12),
        },
        expenses: estimatedExpenses,
        profit: {
          gross: Math.round(monthlyRevenue - estimatedExpenses.ingredients),
          net: Math.round(monthlyRevenue - totalExpenses),
        },
      };

      res.json({
        inventoryValue: { total: totalInventoryValue, byBranch: inventoryValue },
        financial,
        transferStats,
        trends: {
          monthly: [
            { month: "Jan", revenue: Math.round(monthlyRevenue * 0.9), profit: Math.round((monthlyRevenue - totalExpenses) * 0.9) },
            { month: "Feb", revenue: Math.round(monthlyRevenue * 0.95), profit: Math.round((monthlyRevenue - totalExpenses) * 0.95) },
            { month: "Mar", revenue: Math.round(monthlyRevenue), profit: Math.round(monthlyRevenue - totalExpenses) }
          ],
        },
      });
    } catch (err) {
      console.error("Error generating financial report:", err);
      res.status(500).json({ error: "Server error while generating financial report" });
    }
  },

  /**
   * GET /api/reports/alerts
   * Low/critical stock based on currentStock & reorderPoint.
   */
  getAlertsReport: async (_req, res) => {
    try {
      const alerts = await Inventory.aggregate([
        {
          $lookup: {
            from: "items",
            localField: "item",
            foreignField: "_id",
            as: "itemInfo",
          },
        },
        { $unwind: "$itemInfo" },
        {
          $lookup: {
            from: "branches",
            localField: "branch",
            foreignField: "_id",
            as: "branchInfo",
          },
        },
        { $unwind: "$branchInfo" },
        {
          $addFields: {
            alertLevel: {
              $switch: {
                branches: [
                  { case: { $eq: [$num("$currentStock"), 0] }, then: "critical" },
                  {
                    case: { $lte: [$num("$currentStock"), $num("$reorderPoint")] },
                    then: "warning",
                  },
                ],
                default: "normal",
              },
            },
          },
        },
        { $match: { alertLevel: { $in: ["critical", "warning"] } } },
        { $sort: { alertLevel: 1, currentStock: 1 } },
      ]);

      const summary = {
        critical: alerts.filter((a) => a.alertLevel === "critical").length,
        warning: alerts.filter((a) => a.alertLevel === "warning").length,
        total: alerts.length,
      };

      res.json({ alerts, summary });
    } catch (err) {
      console.error("Error generating alerts report:", err);
      res.status(500).json({ error: "Server error while generating alerts report" });
    }
  },

  /**
   * Generic :type passthrough used by your routes
   */
  getReport: async (req, res) => {
    try {
      const { type } = req.params;
      switch (type) {
        case "overview":
        case "dashboard":
          return reportController.getDashboardData(req, res);
        case "inventory":
          return reportController.getInventoryReport(req, res);
        case "branches":
          return reportController.getBranchReport(req, res);
        case "transfers":
          return reportController.getTransferReport(req, res);
        case "financial":
          return reportController.getFinancialReport(req, res);
        case "alerts":
          return reportController.getAlertsReport(req, res);
        default:
          return res.status(400).json({ error: "Invalid report type" });
      }
    } catch (err) {
      console.error("Error generating report:", err);
      res.status(500).json({ error: "Failed to generate report" });
    }
  },
};
