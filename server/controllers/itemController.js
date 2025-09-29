// controllers/itemController.js
import mongoose from "mongoose";
import Item from "../models/Item.js"; // schema: { code, name, category(enum or string), price:Number, stock:Number }

const toNumberOr = (v, fallback = 0) =>
  Number.isFinite(Number(v)) ? Number(v) : fallback;

const normalizeCode = (code) => String(code || "").toUpperCase().trim();

/**
 * GET /api/items
 * Query: search, category, page, limit
 */
export const getItems = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "all");
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));

    const query = {};
    if (category && category !== "all") query.category = category;
    if (search) {
      const rx = new RegExp(search, "i");
      query.$or = [{ name: rx }, { code: rx }];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Item.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Item.countDocuments(query),
    ]);

    return res.json({ items, total, page, limit });
  } catch (err) {
    console.error("getItems error:", err);
    return res.status(500).json({ error: "Failed to fetch items" });
  }
};

/**
 * POST /api/items
 * Body: { code, name, category, price, stockAvailable? , stock? }
 * - Uses `price` directly.
 * - If `stockAvailable` provided, maps to numeric `stock`.
 */
export const createItem = async (req, res) => {
  try {
    const { code, name, category, price, stockAvailable, stock } = req.body;

    if (!code || !name || !category) {
      return res
        .status(400)
        .json({ error: "code, name, and category are required" });
    }

    const normalizedCode = normalizeCode(code);

    const exists = await Item.findOne({ code: normalizedCode }).lean();
    if (exists) {
      return res.status(409).json({ error: "Item code already exists" });
    }

    const numericPrice = toNumberOr(price, NaN);
    if (Number.isNaN(numericPrice)) {
      return res.status(400).json({ error: "price is required and must be a number" });
    }

    const item = await Item.create({
      code: normalizedCode,
      name: String(name).trim(),
      category: String(category).trim(),
      price: numericPrice,
      stock: toNumberOr(stockAvailable ?? stock ?? 0, 0),
    });

    return res.status(201).json({ item });
  } catch (err) {
    console.error("createItem error:", err);
    if (err?.code === 11000) return res.status(409).json({ error: "Item code already exists" });
    if (err?.name === "ValidationError") {
      const firstMsg = Object.values(err.errors)?.[0]?.message || "Validation error";
      return res.status(400).json({ error: firstMsg });
    }
    return res.status(500).json({ error: "Failed to create item" });
  }
};

/**
 * PUT /api/items/:id
 * Accepts any of: { code, name, category, price, stockAvailable, stock }
 */
export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const body = { ...req.body };

    // Normalize code + ensure uniqueness
    if (body.code) {
      const normalizedCode = normalizeCode(body.code);
      const clash = await Item.findOne({ code: normalizedCode, _id: { $ne: id } }).lean();
      if (clash) return res.status(409).json({ error: "Another item already uses this code" });
      body.code = normalizedCode;
    }

    // price: ensure number if provided
    if (body.price !== undefined) {
      const numericPrice = toNumberOr(body.price, NaN);
      if (Number.isNaN(numericPrice)) {
        return res.status(400).json({ error: "price must be a number" });
      }
      body.price = numericPrice;
    }

    // Map stockAvailable -> stock (Number) if provided
    if (body.stockAvailable !== undefined || body.stock !== undefined) {
      body.stock = toNumberOr(body.stockAvailable ?? body.stock, 0);
      delete body.stockAvailable;
    }

    if (body.name !== undefined) body.name = String(body.name).trim();
    if (body.category !== undefined) body.category = String(body.category).trim();

    const item = await Item.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!item) return res.status(404).json({ error: "Item not found" });
    return res.json({ item });
  } catch (err) {
    console.error("updateItem error:", err);
    if (err?.name === "ValidationError") {
      const firstMsg = Object.values(err.errors)?.[0]?.message || "Validation error";
      return res.status(400).json({ error: firstMsg });
    }
    return res.status(500).json({ error: "Failed to update item" });
  }
};

/**
 * DELETE /api/items/:id
 */
export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const item = await Item.findByIdAndDelete(id).lean();
    if (!item) return res.status(404).json({ error: "Item not found" });

    return res.json({ message: "Item permanently deleted", item });
  } catch (err) {
    console.error("deleteItem error:", err);
    return res.status(500).json({ error: "Failed to delete item" });
  }
};

/**
 * PUT /api/items/reset-stock
 * Resets the stock of all items to 0
 */
export const resetAllStocks = async (req, res) => {
  try {
    // grab current items (optional, useful for reporting)
    const items = await Item.find({}, 'code name stock').lean();

    // set stock = 0 for all items
    const result = await Item.updateMany({}, { $set: { stock: 0 } });

    return res.json({
      message: 'All item stocks have been reset to 0',
      totalItems: items.length,
      modifiedCount: result.modifiedCount,
      affectedCodes: items.map(i => i.code),
    });
  } catch (err) {
    console.error('resetAllStocks error:', err);
    return res.status(500).json({ error: 'Failed to reset stock' });
  }
};
