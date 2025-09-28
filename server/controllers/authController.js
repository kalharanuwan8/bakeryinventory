// controllers/authController.js
import User from '../models/User.js';

export const authController = {
  // POST /api/auth/login
  async login(req, res) {
    try {
      const { username, email, password } = req.body;
      if (!(username || email) || !password) {
        return res.status(400).json({ error: 'Username/email and password are required' });
      }

      // Check user
      const query = username
        ? (username.includes('@') ? { email: username.toLowerCase() } : { username })
        : { email: email.toLowerCase() };

      const user = await User.findOne(query);
      if (!user || user.status === 'inactive') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // ⚠️ Plaintext password check (since no hashing)
      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      user.lastLogin = new Date();
      await user.save();

      return res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          status: user.status,
          lastLogin: user.lastLogin,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Server error during login' });
    }
  },

  // POST /api/auth/register
  async register(req, res) {
    try {
      const { username, email, password, phone, address } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email and password are required' });
      }

      const already = await User.findOne({
        $or: [{ username }, { email: email.toLowerCase() }],
      });
      if (already) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      const user = await User.create({
        username,
        email: email.toLowerCase(),
        password, // ⚠️ plain text
        phone,
        address,
      });

      return res.status(201).json({
        message: 'User created',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          status: user.status,
        },
      });
    } catch (err) {
      console.error('Register error:', err);
      if (err.code === 11000) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      return res.status(500).json({ error: 'Server error during registration' });
    }
  },

  // GET /api/auth/me (no JWT, just pass userId in query for demo)
  async getProfile(req, res) {
    try {
      const { userId } = req.query; // ⚠️ insecure, for dev only
      if (!userId) return res.status(400).json({ error: 'userId is required' });

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      return res.json({
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          address: user.address,
          status: user.status,
          lastLogin: user.lastLogin,
        },
      });
    } catch (err) {
      console.error('Get profile error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  },

  // PUT /api/auth/change-password
  async changePassword(req, res) {
    try {
      const { userId, currentPassword, newPassword } = req.body;
      if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'userId, currentPassword and newPassword are required' });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (user.password !== currentPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      user.password = newPassword;
      await user.save();

      return res.json({ message: 'Password changed successfully' });
    } catch (err) {
      console.error('Change password error:', err);
      return res.status(500).json({ error: 'Server error during password change' });
    }
  },
};

export default authController;
