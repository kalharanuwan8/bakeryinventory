// routes/inventoryRoutes.js
import { Router } from 'express';
import { inventoryController } from '../controllers/inventoryController.js';

const router = Router();

// Inventory
router.get('/inventory/branch/:branchId', inventoryController.getBranchInventory);
router.get('/inventory/main',              inventoryController.getMainBakeryInventory);
router.patch('/inventory/update-stock',    inventoryController.updateStock);
router.get('/inventory/alerts',            inventoryController.getAlerts);
router.get('/inventory/summary',           inventoryController.getSummary);

// Transfers
router.post('/transfers',                  inventoryController.transferItems);
router.get('/transfers/history',           inventoryController.getTransferHistory);

export default router;
