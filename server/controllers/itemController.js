// controllers/itemController.js
import Item from "../models/Item.js"; // Change from "item.js" to "Item.js"

/**
 * GET /api/items
 * Query: search, category, active ("true"/"false"), page, limit
 */
export const getItems = async (req, res) => {
  try {
    const {
      search = "",
      category = "all",
      active = "true",
      page = 1,
      limit = 100, // front-end doesn't paginate yet; keep generous default
    } = req.query;

    console.log('Query params:', { search, category, active, page, limit }); // Debug log

    const query = {};

    // Active / inactive filter
    if (active === "true") query.isActive = true;
    if (active === "false") query.isActive = false;

    // Category filter (ignore "all")
    if (category && category !== "all") {
      query.category = category;
    }

    // Search in name / description / code
    if (search && search.trim().length > 0) {
      const rx = new RegExp(search.trim(), "i");
      query.$or = [{ name: rx }, { description: rx }, { code: rx }];
    }

    console.log('MongoDB query:', JSON.stringify(query, null, 2)); // Debug log

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Item.find(query)
        .sort({ createdAt: -1 }) // Changed from -0 to -1 for descending order
        .skip(skip)
        .limit(Number(limit)),
      Item.countDocuments(query),
    ]);

    console.log(`Found ${items.length} items`); // Debug log

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error("getItems error:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

/**
 * GET /api/items/categories
 * Returns available categories. Uses the enum from the schema and also distinct values in DB.
 */
export const getCategories = async (_req, res) => {
  try {
    const enumCats = Item.schema.path("category")?.enumValues || [];
    const dbCats = await Item.distinct("category");
    // Merge + sort unique values
    const set = new Set([...enumCats, ...dbCats].filter(Boolean));
    const categories = Array.from(set).sort((a, b) => a.localeCompare(b));
    res.json({ categories });
  } catch (err) {
    console.error("getCategories error:", err);
    res.status(500).json({ error: "Failed to load categories" });
  }
};

/**
 * POST /api/items
 * Body: { code, name, category, price, description, ingredients, allergens, shelfLife, nutritionalInfo, isActive }
 */
export const createItem = async (req, res) => {
  try {
    const {
      code,
      name,
      category,
      price,
      description,
      ingredients,
      allergens,
      shelfLife,
      nutritionalInfo,
      isActive,
    } = req.body;

    const exists = await Item.findOne({ code: String(code).toUpperCase().trim() });
    if (exists) {
      return res.status(400).json({ error: "Item code already exists" });
    }

    const item = await Item.create({
      code,
      name,
      category,
      price,
      description,
      ingredients,
      allergens,
      shelfLife,
      nutritionalInfo,
      isActive,
    });

    res.status(201).json({ item });
  } catch (err) {
    console.error("createItem error:", err);
    if (err?.name === "ValidationError") {
      const firstMsg = Object.values(err.errors)?.[0]?.message || "Validation error";
      return res.status(400).json({ error: firstMsg });
    }
    res.status(500).json({ error: "Failed to create item" });
  }
};

/**
 * PUT /api/items/:id
 */
export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;

    // If code is changing, ensure uniqueness
    if (req.body.code) {
      const code = String(req.body.code).toUpperCase().trim();
      const clash = await Item.findOne({ code, _id: { $ne: id } });
      if (clash) {
        return res.status(400).json({ error: "Another item already uses this code" });
      }
      req.body.code = code;
    }

    const item = await Item.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!item) return res.status(404).json({ error: "Item not found" });

    res.json({ item });
  } catch (err) {
    console.error("updateItem error:", err);
    if (err?.name === "ValidationError") {
      const firstMsg = Object.values(err.errors)?.[0]?.message || "Validation error";
      return res.status(400).json({ error: firstMsg });
    }
    res.status(500).json({ error: "Failed to update item" });
  }
};

/**
 * DELETE /api/items/:id
 * Soft delete → set isActive:false
 */
export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Item.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item permanently deleted", item });
  } catch (err) {
    console.error("deleteItem error:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
};

/**
 * PATCH /api/items/:id/toggle-status
 * Toggle active/inactive status of an item
 */
export const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Item.findById(id);
    
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    item.isActive = !item.isActive;
    await item.save();

    res.json({ 
      message: `Item status changed to ${item.isActive ? 'active' : 'inactive'}`, 
      item 
    });
  } catch (err) {
    console.error("toggleStatus error:", err);
    res.status(500).json({ error: "Failed to update item status" });
  }
};
