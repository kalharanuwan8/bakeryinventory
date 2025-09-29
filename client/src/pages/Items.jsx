import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, AlertCircle, X } from "lucide-react";
import API from "../../api/axios";

const Items = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search only (no category filter)
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
  const [selectedItem, setSelectedItem] = useState(null);

  // Form data (category is a free-text input)
  const initialFormData = {
    code: "",
    name: "",
    category: "",
    price: "",           // use price (number)
    stockAvailable: 0,   // mapped to stock on the server
  };
  const [formData, setFormData] = useState(initialFormData);

  // Fetch items on mount and whenever search changes
  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ search: searchQuery });
      const res = await API.get(`/items?${params}`);
      setItems(res.data.items || []);
      setError("");
    } catch (err) {
      console.error("Error fetching items:", err);
      setError("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        category: formData.category.trim(),
        price: Number(formData.price),
        stockAvailable: Number(formData.stockAvailable), // server maps -> stock
      };

      if (!payload.category) {
        setError("Please enter a category.");
        return;
      }
      if (!Number.isFinite(payload.price)) {
        setError("Price must be a number.");
        return;
      }

      if (modalMode === "create") {
        await API.post("/items", payload);
      } else {
        await API.put(`/items/${selectedItem._id}`, payload);
      }

      setShowModal(false);
      setFormData(initialFormData);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.error || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await API.delete(`/items/${id}`);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.error || "Delete failed");
    }
  };

  const handleResetStock = async () => {
    if (!window.confirm("Are you sure you want to reset all stocks to 0?")) return;
    try {
      await API.post("/items/reset-stock"); // Assuming this endpoint resets all stocks
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset stock");
    }
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData({
      code: item.code || "",
      name: item.name || "",
      category: item.category || "",
      price: item.price ?? "",
      stockAvailable: item?.stock ?? 0, // stock is a Number in DB
    });
    setModalMode("edit");
    setShowModal(true);
  };

  const openCreateModal = () => {
    setSelectedItem(null);
    setFormData(initialFormData);
    setModalMode("create");
    setShowModal(true);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <div className="flex gap-4">
          <button
            onClick={handleResetStock}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700"
          >
            Reset Stock
          </button>
          <button
            onClick={openCreateModal}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <Plus className="w-5 h-5" />
            Add New Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative md:col-span-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="md:col-span-2" />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Items Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock (Available)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  No products found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {typeof item.price === "number"
                      ? item.price.toFixed(2)
                      : Number(item.price ?? 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item?.stock ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(item)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                      title="Edit"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {modalMode === "create" ? "Add New Product" : "Edit Product"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Code
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <input
                      type="text"
                      placeholder="Type a category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Stock Available
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stockAvailable}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stockAvailable: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    {modalMode === "create" ? "Create Product" : "Update Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Items;
