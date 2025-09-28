import { Router } from 'express';
import { inventoryController } from '../controllers/inventoryController.js';

const router = Router();

/**
 * Inventory Routes
 * Mount under: /api/inventory
 */

// Branch inventory
router.get('/branch/:branchId', inventoryController.getBranchInventory);

// Main bakery inventory
router.get('/main', inventoryController.getMainBakeryInventory);

// Update stock (add, subtract, or set)
router.post('/update-stock', inventoryController.updateStock);

// Transfer items between branches
router.post('/transfer', inventoryController.transferItems);

// Transfer history
router.get('/transfers', inventoryController.getTransfers);

// Inventory alerts (low stock, out of stock, overstocked)
router.get('/alerts', inventoryController.getAlerts);

// Inventory summary (totals + category breakdown)
router.get('/summary', inventoryController.getSummary);

export default router;
