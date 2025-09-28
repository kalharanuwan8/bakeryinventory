import api from './api';

export const userService = {
  // Get all users
  getUsers: async (params = {}) => {
    try {
      const response = await api.get('/users', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch users' };
    }
  },

  // Get single user
  getUser: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch user' };
    }
  },

  // Create new user
  createUser: async (userData) => {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create user' };
    }
  },

  // Update user
  updateUser: async (id, userData) => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update user' };
    }
  },

  // Delete user
  deleteUser: async (id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete user' };
    }
  },

  // Activate user
  activateUser: async (id) => {
    try {
      const response = await api.patch(`/users/${id}/activate`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to activate user' };
    }
  },

  // Get user statistics
  getUserStatistics: async () => {
    try {
      const response = await api.get('/users/meta/statistics');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch user statistics' };
    }
  }
};