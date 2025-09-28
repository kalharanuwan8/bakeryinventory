import api from './api';

export const reportService = {
  // Get dashboard data
  getDashboardData: async (params = {}) => {
    try {
      const response = await api.get('/reports/dashboard', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch dashboard data' };
    }
  },

  // Get inventory report
  getInventoryReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/inventory', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch inventory report' };
    }
  },

  // Get branch performance report
  getBranchReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/branches', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch branch report' };
    }
  },

  // Get transfer report
  getTransferReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/transfers', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch transfer report' };
    }
  },

  // Get financial report
  getFinancialReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/financial', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch financial report' };
    }
  },

  // Get alerts report
  getAlertsReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/alerts', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch alerts report' };
    }
  }
};