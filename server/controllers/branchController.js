// server/controllers/branchController.js
import Branch from '../models/Branch.js';

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
