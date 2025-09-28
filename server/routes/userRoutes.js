// server/routes/userRoutes.js
import { Router } from 'express';
import { userController } from '../controllers/userController.js';

const router = Router();

/**
 * Minimal auth stub for development:
 * - Reads user id/role from headers if provided
 * - Defaults to an Admin so update/delete paths work during local testing
 * Replace with your real auth middleware when ready.
 */
const requireAuth = (req, _res, next) => {
  if (!req.user) {
    req.user = {
      userId: req.headers['x-user-id'] || 'dev-user-id',
      role: req.headers['x-user-role'] || 'Administrator',
    };
  }
  next();
};

// List users (filter by ?role=&status=&search=)
router.get('/', userController.getUsers);

// Stats (totals, role breakdown, recent users)
router.get('/stats', userController.getUserStatistics);

// Create user
router.post('/', requireAuth, userController.createUser);

// Read single user
router.get('/:id', userController.getUser);

// Update user (self or admin/manager)
router.put('/:id', requireAuth, userController.updateUser);

// Deactivate user (soft delete)
router.delete('/:id', requireAuth, userController.deleteUser);

// Activate user
router.patch('/:id/activate', requireAuth, userController.activateUser);

export default router;
