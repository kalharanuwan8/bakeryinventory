import api from './api';

export const inventoryService = {
  // Get inventory for a branch
  getBranchInventory: async (branchId, params = {}) => {
    try {
      const response = await api.get(`/inventory/branch/${branchId}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch branch inventory' };
    }
  },

  // Get main bakery inventory
  getMainBakeryInventory: async () => {
    try {
      const response = await api.get('/inventory/main-bakery');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch main bakery inventory' };
    }
  },

  // Update stock
  updateStock: async (stockData) => {
    try {
      const response = await api.put('/inventory/update-stock', stockData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update stock' };
    }
  },

  // Transfer items between branches
  transferItems: async (transferData) => {
    try {
      const response = await api.post('/inventory/transfer', transferData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to transfer items' };
    }
  },

  // Get transfer history
  getTransfers: async (params = {}) => {
    try {
      const response = await api.get('/inventory/transfers', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch transfers' };
    }
  },

  // Get inventory alerts
  getAlerts: async (params = {}) => {
    try {
      const response = await api.get('/inventory/alerts', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch alerts' };
    }
  },

  // Get inventory summary
  getSummary: async () => {
    try {
      const response = await api.get('/inventory/summary');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch inventory summary' };
    }
  }
};