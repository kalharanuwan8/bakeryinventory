import api from './api';

export const itemService = {
  // Get all items
  getItems: async (params = {}) => {
    try {
      const response = await api.get('/items', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch items' };
    }
  },

  // Get single item
  getItem: async (id) => {
    try {
      const response = await api.get(`/items/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch item' };
    }
  },

  // Create new item
  createItem: async (itemData) => {
    try {
      const response = await api.post('/items', itemData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create item' };
    }
  },

  // Update item
  updateItem: async (id, itemData) => {
    try {
      const response = await api.put(`/items/${id}`, itemData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update item' };
    }
  },

  // Delete item
  deleteItem: async (id) => {
    try {
      const response = await api.delete(`/items/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete item' };
    }
  },

  // Get item categories
  getCategories: async () => {
    try {
      const response = await api.get('/items/meta/categories');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch categories' };
    }
  },

  // Get category statistics
  getCategoryStats: async () => {
    try {
      const response = await api.get('/items/meta/category-stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch category stats' };
    }
  }
};