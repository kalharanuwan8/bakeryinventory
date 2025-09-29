import express from 'express';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  updateBranchStatus,
  listCities,
  getBranchInventoryFromTransfers 
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
router.post('/branches/inventory', getBranchInventoryFromTransfers);

export default router;