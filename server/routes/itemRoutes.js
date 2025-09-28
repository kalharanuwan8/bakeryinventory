// routes/itemRoutes.js
import { Router } from "express";
import {
  getItems,
  getCategories,
  createItem,
  updateItem,
  deleteItem,
  toggleStatus,
} from "../controllers/itemController.js";

const router = Router();

router.get("/", getItems);
router.get("/categories", getCategories);
router.post("/", createItem);
router.put("/:id", updateItem);
router.put("/:id/toggle-status", toggleStatus);
router.delete("/:id", deleteItem);

export default router;
