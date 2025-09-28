// routes/authRoutes.js
import { Router } from "express";
import { authController } from "../controllers/authController.js";

const router = Router();

// POST /api/auth/login
router.post("/login", authController.login);

// POST /api/auth/register
router.post("/register", authController.register);

// GET /api/auth/me
// (Dev-only: expects ?userId=<mongoId> per your current controller)
router.get("/me", authController.getProfile);

// PUT /api/auth/change-password
// (Dev-only: expects { userId, currentPassword, newPassword } in body)
router.put("/change-password", authController.changePassword);

export default router;
