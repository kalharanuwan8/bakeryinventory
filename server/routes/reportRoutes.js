import { Router } from 'express';
import { reportController } from '../controllers/reportController.js';

const router = Router();

/**
 * Reports API
 * Base path to mount: /api/reports
 */

// Dashboard overview
router.get('/dashboard', reportController.getDashboardData);

// Inventory report (filters: branchId, category, stockStatus)
router.get('/inventory', reportController.getInventoryReport);

// Branch performance report
router.get('/branches', reportController.getBranchReport);

// Transfer report (filters: startDate, endDate, branchId, status)
router.get('/transfers', reportController.getTransferReport);

// Financial summary report
router.get('/financial', reportController.getFinancialReport);

// Low stock / alerts report
router.get('/alerts', reportController.getAlertsReport);

// Generic report endpoint (for client compatibility)
router.get('/:type', reportController.getReport);

export default router;
