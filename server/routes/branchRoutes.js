import express from 'express';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  updateBranchStatus,
  listCities,
  getBranchInventoryFromTransfers,
  getBranchInventoryDetails,
  getAllBranchesInventorySummary
} from '../controllers/branchController.js';

const router = express.Router();

// Get all branches with filters
router.get('/', getBranches);

// Get list of cities for filtering
router.get('/cities', listCities);

// Create new branch
router.post('/', createBranch);

// Update branch
router.put('/:id', updateBranch);

// Delete branch
router.delete('/:id', deleteBranch);

// Update branch status
router.patch('/:id/status', updateBranchStatus);

// Inventory endpoints
router.post('/branches/inventory', getBranchInventoryFromTransfers);
router.get('/:id/inventory-details', getBranchInventoryDetails);
router.get('/inventory-summary', getAllBranchesInventorySummary);

export default router;