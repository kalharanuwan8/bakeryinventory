// routes/itemRoutes.js
import { Router } from "express";
import {
  getItems,
  
  createItem,
  updateItem,
  deleteItem,
  resetAllStocks
} from "../controllers/itemController.js";

const router = Router();

router.get("/", getItems);

router.post("/", createItem);
router.put("/:id", updateItem);
router.post("/reset-stock", resetAllStocks); 

router.delete("/:id", deleteItem);

export default router;
