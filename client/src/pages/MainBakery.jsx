import React, { useEffect, useState } from 'react';
import { 
  Edit, 
  Send, 
  Package, 
  AlertCircle, 
  CheckCircle,
  X 
} from 'lucide-react';
import API from '../../api/axios';

const MainBakery = () => {
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Stock update modal state
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [stockAmount, setStockAmount] = useState('');
  const [stockOperation, setStockOperation] = useState('add'); // 'add' | 'subtract' | 'set'
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({ branchId: '', quantity: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, branchesRes] = await Promise.all([
        API.get('/items', { params: { location: 'main' } }),
        API.get('/branches'),
      ]);

      // Normalize responses (support both {data: {data: []}} and {data: {items: []/branches: []}})
      const itemsList = itemsRes?.data?.data ?? itemsRes?.data?.items ?? [];
      const branchList = branchesRes?.data?.data ?? branchesRes?.data?.branches ?? [];

      setItems(itemsList);
      const shaped = branchList.map(b => ({ id: b._id, name: b.name }));
      setBranches(shaped);

      // Default selected branch if empty
      if (!selectedBranchId && shaped.length) {
        // Prefer a branch that looks like "Main" / "HQ"; else first
        const main = shaped.find(b => /main|hq|central/i.test(b.name)) || shaped[0];
        setSelectedBranchId(main.id);
      }

      setErr('');
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateStock = (item) => {
    setSelectedItem(item);
    setShowStockModal(true);
    setStockAmount('');
    setStockOperation('add');
  };

  const handleTransfer = (item) => {
    setSelectedItem(item);
    setShowTransferModal(true);
    setTransferData({ branchId: '', quantity: '' });
  };

  const submitStockUpdate = async () => {
    try {
      if (!selectedItem?._id) {
        alert('No item selected');
        return;
      }
      if (!selectedBranchId) {
        alert('Please select a branch');
        return;
      }

      const qty = Number(stockAmount);
      if (!Number.isFinite(qty) || qty < 0) {
        alert('Enter a valid non-negative quantity');
        return;
      }

      // Backend expects: { itemId, branchId, quantity, operation }
      await API.patch('/inventory/update-stock', {
        itemId: selectedItem._id,
        branchId: selectedBranchId,
        quantity: qty,
        operation: stockOperation,
      });

      // Safer: refetch to sync UI with server
      await fetchData();

      setShowStockModal(false);
      setSelectedItem(null);
      setStockAmount('');
      setStockOperation('add');
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || 'Stock update failed');
    }
  };

  const submitTransfer = async () => {
    if (!transferData.branchId || !transferData.quantity || !selectedItem) return;

    const qty = parseInt(transferData.quantity, 10);
    if (Number.isNaN(qty) || qty <= 0) return;

    // If your item model has `stock` for the main bakery context, enforce available stock
    if ((selectedItem.stock ?? 0) < qty) {
      alert('Insufficient stock for transfer');
      return;
    }

    const prev = items;

    // Optimistic UI for main stock
    setItems(prev.map(i => i._id === selectedItem._id ? { ...i, stock: (i.stock || 0) - qty } : i));

    try {
      const res = await API.post('/transfers', {
        itemId: selectedItem._id,
        toBranchId: transferData.branchId,
        quantity: qty,
      });

      // Normalize updated item
      const updated = res?.data?.data ?? res?.data?.item;
      if (updated?._id) {
        setItems(list => list.map(i => i._id === updated._id ? updated : i));
      } else {
        // If API doesn’t return updated item, refetch
        await fetchData();
      }

      setShowTransferModal(false);
      const branchName = branches.find(b => b.id === transferData.branchId)?.name || 'branch';
      alert(`Transferred ${qty} ${selectedItem.name} to ${branchName}`);
      setSelectedItem(null);
      setTransferData({ branchId: '', quantity: '' });
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || 'Transfer failed');
      // Rollback
      setItems(prev);
    }
  };

  const getStockStatus = (stock, dailyProduction) => {
    const ratio = dailyProduction ? stock / dailyProduction : 1;
    if (ratio < 0.3) return { status: 'low', color: 'text-red-600 bg-red-100', icon: AlertCircle };
    if (ratio < 0.7) return { status: 'medium', color: 'text-yellow-600 bg-yellow-100', icon: AlertCircle };
    return { status: 'good', color: 'text-green-600 bg-green-100', icon: CheckCircle };
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Main Bakery Inventory</h1>
        <p className="text-gray-600">Manage your main bakery stock and transfer items to branches</p>
      </div>

      {err && <div className="mb-4 text-red-600">{err}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
              <p className="text-gray-600 text-sm">Total Items</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                {items.reduce((sum, item) => sum + (item.stock || 0), 0)}
              </p>
              <p className="text-gray-600 text-sm">Total Stock</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                {items.filter(item => getStockStatus(item.stock || 0, item.dailyProduction || 0).status === 'low').length}
              </p>
              <p className="text-gray-600 text-sm">Low Stock Items</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                ${items.reduce((sum, item) => sum + ((item.stock || 0) * (item.price || 0)), 0).toFixed(2)}
              </p>
              <p className="text-gray-600 text-sm">Stock Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Current Inventory</h2>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-gray-500">Loading…</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => {
                  const stockStatus = getStockStatus(item.stock || 0, item.dailyProduction || 0);
                  const StatusIcon = stockStatus.icon;
                  return (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">Code: {item.code}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{item.category}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${Number(item.price || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.stock ?? 0} units</div>
                        <div className="text-sm text-gray-500">Daily: {item.dailyProduction ?? 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {stockStatus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateStock(item)}
                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors flex items-center"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Update Stock
                          </button>
                          <button
                            onClick={() => handleTransfer(item)}
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors flex items-center"
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Transfer
                          </button>
                        </div>
                      </td>
                    </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Stock Update Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Update Stock</h3>
              <button onClick={() => setShowStockModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Item: {selectedItem?.name}</p>
              <p className="text-sm text-gray-600 mb-4">Current Stock: {selectedItem?.stock} units</p>

              {/* Branch select */}
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-4"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {/* Operation */}
              <label className="block text-sm font-medium text-gray-700 mb-2">Operation</label>
              <select
                value={stockOperation}
                onChange={(e) => setStockOperation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-4"
              >
                <option value="add">Add</option>
                <option value="subtract">Subtract</option>
                <option value="set">Set</option>
              </select>
              
              {/* Quantity */}
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <input
                type="number"
                value={stockAmount}
                onChange={(e) => setStockAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter quantity"
                min="0"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={submitStockUpdate}
                disabled={!stockAmount || !selectedBranchId}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Stock
              </button>
              <button
                onClick={() => setShowStockModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Transfer Item</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Item: {selectedItem?.name}</p>
              <p className="text-sm text-gray-600 mb-4">Available Stock: {selectedItem?.stock} units</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Branch
                  </label>
                  <select
                    value={transferData.branchId}
                    onChange={(e) => setTransferData({...transferData, branchId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Choose a branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity to Transfer
                  </label>
                  <input
                    type="number"
                    value={transferData.quantity}
                    onChange={(e) => setTransferData({...transferData, quantity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter quantity"
                    min="1"
                    max={selectedItem?.stock}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={submitTransfer}
                disabled={!transferData.branchId || !transferData.quantity}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Transfer
              </button>
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainBakery;
