// client/src/pages/Branch.jsx
import React, { useEffect, useState } from 'react';
import {
  Plus,
  Eye,
  MapPin,
  Clock,
  Phone,
  X,
  Building2,
  DollarSign,
  Package,
} from 'lucide-react';
import API from '../../api/axios';

const STATUS_BADGES = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
};

const Branch = () => {
  const [branches, setBranches] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [inventoryData, setInventoryData] = useState({ branch: null, inventory: [] });
  const [loadingInventory, setLoadingInventory] = useState(false);

  const emptyForm = {
    name: '',
    code: '',
    address: { street: '', city: '', state: '', zipCode: '', country: 'USA' },
    contact: { phone: '', email: '', fax: '' },
    operatingHours: {},
    manager: { name: '', email: '', phone: '' },
    status: 'active',
    capacity: { seating: 0, staff: 0 },
    description: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, city, status]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        ...(city ? { city } : {}),
        ...(status ? { status } : {}),
      });
      const res = await API.get(`/branches?${params.toString()}`);
      setBranches(res.data.branches || []);
      setErr('');
    } catch (e) {
      console.error(e);
      setErr('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const res = await API.get('/branches/cities');
      setCities(res.data.cities || []);
    } catch (e) {
      console.error(e);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowAddModal(true);
  };

  const openEdit = (b) => {
    setEditingId(b._id);
    setForm({
      ...emptyForm,
      ...b,
      address: { ...emptyForm.address, ...(b.address || {}) },
      contact: { ...emptyForm.contact, ...(b.contact || {}) },
      manager: { ...emptyForm.manager, ...(b.manager || {}) },
      capacity: { ...emptyForm.capacity, ...(b.capacity || {}) },
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    try {
      if (!form.name || !form.address?.city || !form.contact?.phone) {
        alert('Name, city and phone are required');
        return;
      }
      if (editingId) {
        const res = await API.put(`/branches/${editingId}`, form);
        const updated = res.data.branch;
        setBranches((list) =>
          list.map((b) => (b._id === editingId ? updated : b))
        );
      } else {
        const res = await API.post('/branches', form);
        setBranches((list) => [res.data.branch, ...list]);
      }
      setShowAddModal(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || 'Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this branch?')) return;
    try {
      await API.delete(`/branches/${id}`);
      setBranches((list) => list.filter((b) => b._id !== id));
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || 'Delete failed');
    }
  };

  const handleViewBranch = (branch) => {
    setSelectedBranch(branch);
    setShowDetailModal(true);
  };

  const handleViewInventory = async (branch) => {
    try {
      setLoadingInventory(true);
      setShowInventoryModal(true);
      
      const response = await API.post('/branches/branches/inventory', {
        branchCode: branch.code
      });
      
      setInventoryData(response.data);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.error || 'Failed to load inventory');
    } finally {
      setLoadingInventory(false);
    }
  };

  // Toggle status button (cycles through allowed statuses)
  const nextStatus = (s) =>
    s === 'active' ? 'inactive' : s === 'inactive' ? 'maintenance' : 'active';

  const toggleStatus = async (branch) => {
    const newStatus = nextStatus(branch.status);
    // optimistic UI
    setBranches((list) =>
      list.map((b) => (b._id === branch._id ? { ...b, status: newStatus } : b))
    );
    try {
      await API.patch(`/branches/${branch._id}/status`, { status: newStatus });
    } catch (e) {
      console.error(e);
      // rollback
      setBranches((list) =>
        list.map((b) => (b._id === branch._id ? { ...b, status: branch.status } : b))
      );
      alert(e?.response?.data?.error || 'Failed to update status');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Branches</h1>
          <p className="text-gray-600">Manage branches and monitor performance</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Branch
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, city, or code"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
        />
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
        >
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 flex w-1/3">
        <div className="flex items-center">
          <Building2 className="w-8 h-8 text-green-600" />
          <div className="ml-4">
            <p className="text-2xl font-bold text-gray-900">{branches.length}</p>
            <p className="text-gray-600 text-sm">Total Branches</p>
          </div>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full text-gray-500">Loading…</div>
        ) : err ? (
          <div className="col-span-full text-red-600">{err}</div>
        ) : branches.length === 0 ? (
          <div className="col-span-full text-gray-500">No branches found</div>
        ) : (
          branches.map((b) => (
            <div
              key={b._id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {b.name} {b.code ? <span className="text-gray-400">({b.code})</span> : null}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {b?.address?.city || '-'}
                  </div>
                </div>

                <button
                  onClick={() => toggleStatus(b)}
                  className={`px-2 py-1 text-xs rounded-full ${STATUS_BADGES[b.status] || 'bg-gray-100 text-gray-800'}`}
                  title="Click to change status"
                >
                  {b.status}
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  {b?.contact?.phone || '-'}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  {b?.operatingHours?.monday?.open
                    ? `${b.operatingHours.monday.open} - ${b.operatingHours.monday.close}`
                    : '—'}
                </div>
              </div>

              <div className="border-t pt-4 grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleViewBranch(b)}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </button>
                <button
                  onClick={() => handleViewInventory(b)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Inventory
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(b)}
                    className="flex-1 border border-gray-300 py-2 px-3 rounded-lg hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(b._id)}
                    className="flex-1 border border-red-300 text-red-600 py-2 px-3 rounded-lg hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingId ? 'Edit Branch' : 'Add New Branch'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Basic fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Name *
                </label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Downtown Branch"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code
                </label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  value={form.code || ''}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="DTN001 (optional, auto if blank)"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street
                </label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.address.street}
                  onChange={(e) =>
                    setForm({ ...form, address: { ...form.address, street: e.target.value } })
                  }
                  placeholder="123 Main St"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.address.city}
                  onChange={(e) =>
                    setForm({ ...form, address: { ...form.address, city: e.target.value } })
                  }
                  placeholder="New York"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.address.state}
                  onChange={(e) =>
                    setForm({ ...form, address: { ...form.address, state: e.target.value } })
                  }
                  placeholder="NY"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zip
                </label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.address.zipCode}
                  onChange={(e) =>
                    setForm({ ...form, address: { ...form.address, zipCode: e.target.value } })
                  }
                  placeholder="10001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.contact.phone}
                  onChange={(e) =>
                    setForm({ ...form, contact: { ...form.contact, phone: e.target.value } })
                  }
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="maintenance">maintenance</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {editingId ? 'Update Branch' : 'Add Branch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedBranch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedBranch.name} — Details
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Contact</h4>
                <div className="text-sm space-y-2">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                    {`${selectedBranch?.address?.street || ''} ${
                      selectedBranch?.address?.city || ''
                    } ${selectedBranch?.address?.state || ''} ${
                      selectedBranch?.address?.zipCode || ''
                    }`.trim() || '—'}
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-500" />
                    {selectedBranch?.contact?.phone || '—'}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Meta</h4>
                <div className="text-sm space-y-1">
                  <div>Code: {selectedBranch.code || '—'}</div>
                  <div>Status: {selectedBranch.status}</div>
                  <div>
                    Capacity: seating {selectedBranch?.capacity?.seating ?? '-'} • staff{' '}
                    {selectedBranch?.capacity?.staff ?? '-'}
                  </div>
                </div>
              </div>
            </div>

            {selectedBranch.description ? (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-700">{selectedBranch.description}</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {inventoryData.branch?.name} — Inventory
              </h3>
              <button
                onClick={() => setShowInventoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingInventory ? (
              <div className="text-center py-8">Loading inventory...</div>
            ) : (
              <>
                {inventoryData.inventory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No inventory items found
                  </div>
                ) : (
                  <div className="divide-y">
                    {inventoryData.inventory.map((item) => (
                      <div
                        key={item.code}
                        className="py-3 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-500">Code: {item.code}</div>
                        </div>
                        <div className="font-semibold">
                          Qty: {item.quantity}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Branch;
