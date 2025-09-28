import User from '../models/User.js';

export const userController = {
  // Get all users
  getUsers: async (req, res) => {
    try {
      const { role, status, search } = req.query;
      let query = {};

      if (role && role !== 'all') {
        query.role = role;
      }

      if (status && status !== 'all') {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(query)
        .sort({ createdAt: -1 })
        .lean();

      res.json({ users });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Server error while fetching users' });
    }
  },

  // Get single user
  getUser: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Server error while fetching user' });
    }
  },

  // Create new user
  createUser: async (req, res) => {
    try {
      const { username, email, password, role = 'Staff', phone, address } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email: email.toLowerCase() }]
      });

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const user = new User({
        username,
        email: email.toLowerCase(),
        password,
        role,
        phone,
        address
      });

      await user.save();

      res.status(201).json({
        message: 'User created successfully',
        user
      });
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.code === 11000) {
        res.status(400).json({ error: 'Username or email already exists' });
      } else if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        res.status(400).json({ error: errors.join(', ') });
      } else {
        res.status(500).json({ error: 'Server error while creating user' });
      }
    }
  },

  // Update user
  updateUser: async (req, res) => {
    try {
      const userId = req.params.id;
      const updateData = req.body;

      // Check if user is updating their own profile or has admin privileges
      if (req.user.userId !== userId && !['Administrator', 'Manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Remove sensitive fields from update if not admin
      if (req.user.role !== 'Administrator') {
        delete updateData.role;
        delete updateData.status;
      }

      // Remove password from direct update (should use change password endpoint)
      delete updateData.password;

      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        message: 'User updated successfully',
        user
      });
    } catch (error) {
      console.error('Error updating user:', error);
      if (error.code === 11000) {
        res.status(400).json({ error: 'Username or email already exists' });
      } else if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        res.status(400).json({ error: errors.join(', ') });
      } else {
        res.status(500).json({ error: 'Server error while updating user' });
      }
    }
  },

  // Deactivate user
  deleteUser: async (req, res) => {
    try {
      const userId = req.params.id;

      // Prevent self-deletion
      if (req.user.userId === userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { status: 'inactive' },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        message: 'User deactivated successfully',
        user
      });
    } catch (error) {
      console.error('Error deactivating user:', error);
      res.status(500).json({ error: 'Server error while deactivating user' });
    }
  },

  // Activate user
  activateUser: async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { status: 'active' },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        message: 'User activated successfully',
        user
      });
    } catch (error) {
      console.error('Error activating user:', error);
      res.status(500).json({ error: 'Server error while activating user' });
    }
  },

  // Get user statistics
  getUserStatistics: async (req, res) => {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            inactiveUsers: {
              $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
            }
          }
        }
      ]);

      const roleBreakdown = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const recentUsers = await User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      res.json({
        statistics: stats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0
        },
        roleBreakdown,
        recentUsers
      });
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      res.status(500).json({ error: 'Server error while fetching user statistics' });
    }
  }
};