// routes/reports.js
import { Router } from "express";
import { reportController } from "../controllers/reportController.js";

const router = Router();

router.get("/overview", reportController.getDashboardData);
router.get("/dashboard", reportController.getDashboardData);
router.get("/inventory", reportController.getInventoryReport);
router.get("/branches", reportController.getBranchReport);
router.get("/transfers", reportController.getTransferReport);
router.get("/financial", reportController.getFinancialReport);
router.get("/alerts", reportController.getAlertsReport);
router.get("/:type", reportController.getReport); // keep last

export default router;
