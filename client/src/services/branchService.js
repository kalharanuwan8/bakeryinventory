import api from './api';

export const branchService = {
  // Get all branches
  getBranches: async (params = {}) => {
    try {
      const response = await api.get('/branches', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch branches' };
    }
  },

  // Get single branch
  getBranch: async (id) => {
    try {
      const response = await api.get(`/branches/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch branch' };
    }
  },

  // Create new branch
  createBranch: async (branchData) => {
    try {
      const response = await api.post('/branches', branchData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create branch' };
    }
  },

  // Update branch
  updateBranch: async (id, branchData) => {
    try {
      const response = await api.put(`/branches/${id}`, branchData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update branch' };
    }
  },

  // Delete branch
  deleteBranch: async (id) => {
    try {
      const response = await api.delete(`/branches/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete branch' };
    }
  },

  // Get branch performance
  getBranchPerformance: async (id, params = {}) => {
    try {
      const response = await api.get(`/branches/${id}/performance`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch branch performance' };
    }
  }
};