import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  DollarSign,
  Package,
  TrendingUp,
  Building2,
  BarChart3,
  Loader
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import API from '../../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('overview');
  const [dateRange, setDateRange] = useState('30days');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState({
    overview: null,
    inventory: null,
    branches: null,
    financial: null
  });

  const reportTypes = [
    { id: 'overview', name: 'Business Overview', icon: BarChart3 },
    { id: 'inventory', name: 'Inventory Report', icon: Package },
    { id: 'branches', name: 'Branch Performance', icon: Building2 }
  ];

  useEffect(() => {
    fetchReportData(selectedReport, dateRange);
  }, [selectedReport, dateRange]);

  const fetchReportData = async (reportType, range) => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.get(`/reports/${reportType}`, {
        params: { range }
      });
      setReportData(prev => ({
        ...prev,
        [reportType]: response.data
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch report data');
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (reportType) => {
    try {
      const mapType = (t) => (['overview','inventory','branches','financial'].includes(t) ? t : 'overview');
      const type = mapType(reportType);

      let data = reportData[type];
      if (!data) {
        const resp = await API.get(`/reports/${type}`, { params: { range: dateRange } });
        data = resp.data;
      }

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      let y = margin;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Bakery Inventory Management', pageWidth / 2, y, { align: 'center' });
      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, pageWidth / 2, y, { align: 'center' });
      y += 16;
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
      y += 20;

      const addSectionTitle = (title) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(title, margin, y);
        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
      };

      const addKeyValueRow = (pairs) => {
        const text = pairs.map(([k, v]) => `${k}: ${v}`).join('    ');
        doc.text(text, margin, y);
        y += 14;
      };

      const addTable = (head, body) => {
        autoTable(doc, {
          head: [head],
          body,
          startY: y,
          styles: { fontSize: 9, cellPadding: 6 },
          headStyles: { fillColor: [22, 163, 74] },
          margin: { left: margin, right: margin },
        });
        y = (doc.lastAutoTable && doc.lastAutoTable.finalY) || y;
        y += 10;
      };

      if (type === 'overview') {
        addSectionTitle('Overview');
        addKeyValueRow([
          ['Total Items', data.overview?.totalItems ?? 0],
          ['Active Branches', data.overview?.totalBranches ?? 0],
        ]);
        addKeyValueRow([
          ['Total Stock', data.overview?.totalStock ?? 0],
          ['Total Value', `$${(data.overview?.totalValue || 0).toLocaleString()}`],
        ]);

        if (data.categoryDistribution?.length) {
          addSectionTitle('Category Distribution');
          addTable(
            ['Category', 'Items', 'Stock', 'Value ($)'],
            data.categoryDistribution.map((c) => [
              c._id,
              String(c.count ?? 0),
              String(c.totalStock ?? 0),
              (c.totalValue || 0).toLocaleString(),
            ])
          );
        }

        if (data.branchPerformance?.length) {
          addSectionTitle('Branch Performance');
          addTable(
            ['Branch', 'Items', 'Stock', 'Value ($)', 'Low Stock'],
            data.branchPerformance.map((b) => [
              b.name,
              String(b.items ?? 0),
              String(b.totalStock ?? 0),
              (b.value || 0).toLocaleString(),
              String(b.lowStockItems ?? 0),
            ])
          );
        }
      }

      if (type === 'inventory') {
        addSectionTitle('Inventory Summary');
        addKeyValueRow([
          ['Total Items', data.summary?.totalItems ?? 0],
          ['Total Stock', data.summary?.totalStock ?? 0],
        ]);
        addKeyValueRow([
          ['Total Value', `$${(data.summary?.totalValue || 0).toLocaleString()}`],
          ['Avg Stock', (data.summary?.avgStockLevel || 0).toFixed(1)],
        ]);

        if (data.inventory?.length) {
          addSectionTitle('Inventory Details (first 50)');
          addTable(
            ['Item', 'Branch', 'Stock', 'Reorder Point', 'Value ($)'],
            (data.inventory || []).slice(0, 50).map((i) => [
              i.itemInfo?.name || 'N/A',
              i.branchInfo?.name || 'N/A',
              String(i.currentStock ?? 0),
              String(i.reorderPoint ?? 0),
              (i.totalValue || 0).toFixed(2),
            ])
          );
        }
      }

      if (type === 'branches') {
        if (data.branchReports?.length) {
          addSectionTitle('Branch Performance');
          addTable(
            ['Name', 'Code', 'City', 'Status', 'Items', 'Stock', 'Value ($)', 'Low'],
            data.branchReports.map((br) => [
              br.branch?.name || 'N/A',
              br.branch?.code || 'N/A',
              br.branch?.city || 'N/A',
              br.branch?.status || 'N/A',
              String(br.metrics?.totalItems ?? 0),
              String(br.metrics?.totalStock ?? 0),
              (br.metrics?.totalValue || 0).toLocaleString(),
              String(br.metrics?.lowStockItems ?? 0),
            ])
          );
        }
      }

      if (type === 'financial') {
        addSectionTitle('Financial Summary');
        addKeyValueRow([
          ['Monthly Revenue', `$${(data.financial?.revenue?.monthly || 0).toLocaleString()}`],
          ['Inventory Value', `$${(data.inventoryValue?.total || 0).toLocaleString()}`],
        ]);
        const totalExpenses = data.financial?.expenses
          ? Object.values(data.financial.expenses).reduce((s, n) => s + n, 0)
          : 0;
        addKeyValueRow([
          ['Total Expenses', `$${totalExpenses.toLocaleString()}`],
          ['Net Profit', `$${(data.financial?.profit?.net || 0).toLocaleString()}`],
        ]);

        if (data.financial?.expenses) {
          addSectionTitle('Expense Breakdown');
          addTable(
            ['Category', 'Amount ($)'],
            Object.entries(data.financial.expenses).map(([k, v]) => [
              k.charAt(0).toUpperCase() + k.slice(1),
              (v || 0).toLocaleString(),
            ])
          );
        }

        if (data.transferStats) {
          addSectionTitle('Transfer Statistics');
          addTable(
            ['Total Transfers', 'Total Quantity', 'Total Value ($)', 'Avg Transfer Value ($)'],
            [[
              String(data.transferStats.totalTransfers || 0),
              String(data.transferStats.totalQuantity || 0),
              (data.transferStats.totalValue || 0).toLocaleString(),
              (data.transferStats.avgTransferValue || 0).toFixed(2),
            ]]
          );
        }
      }

      doc.save(`${type}-report.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  // Component render functions
  const OverviewReport = () => {
    const data = reportData.overview;
    if (!data) return null;

    const profitMargin = data.overview?.totalValue > 0 
      ? Math.round((data.overview?.totalValue * 0.15) / data.overview?.totalValue * 100) 
      : 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-green-50 p-6 rounded-xl border border-green-200">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  ${data.overview?.totalValue?.toLocaleString() || 0}
                </p>
                <p className="text-green-600 text-sm">Total Inventory Value</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.overview?.totalItems?.toLocaleString() || 0}
                </p>
                <p className="text-blue-600 text-sm">Total Items</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.overview?.totalBranches || 0}
                </p>
                <p className="text-purple-600 text-sm">Active Branches</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.overview?.lowStockItems || 0}
                </p>
                <p className="text-orange-600 text-sm">Low Stock Items</p>
              </div>
            </div>
          </div>
        </div>
        
        {data.categoryDistribution && data.categoryDistribution.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.categoryDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalValue" fill="#16a34a" name="Value ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.branchPerformance && data.branchPerformance.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.branchPerformance.map((branch, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{branch.name}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items:</span>
                      <span className="font-medium">{branch.items}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Value:</span>
                      <span className="font-medium">${branch.value?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Low Stock:</span>
                      <span className="font-medium text-orange-600">{branch.lowStockItems}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const InventoryReport = () => {
    const data = reportData.inventory;
    if (!data) return null;

    const colors = ['#16a34a', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.summary?.totalItems || 0}
                </p>
                <p className="text-blue-600 text-sm">Total Items</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-6 rounded-xl border border-green-200">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  ${data.summary?.totalValue?.toLocaleString() || 0}
                </p>
                <p className="text-green-600 text-sm">Total Value</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.summary?.totalStock || 0}
                </p>
                <p className="text-orange-600 text-sm">Total Stock</p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 p-6 rounded-xl border border-red-200">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.summary?.avgStockLevel?.toFixed(1) || 0}
                </p>
                <p className="text-red-600 text-sm">Avg Stock Level</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory by Item</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={(data.inventory || []).slice(0, 10).map((i) => ({
                name: i.itemInfo?.name || 'N/A',
                currentStock: i.currentStock || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="currentStock" fill="#16a34a" name="Stock" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Status Distribution</h3>
            <div className="space-y-4">
              {data.inventory?.slice(0, 10).map((item, index) => (
                <div key={index} className="border-l-4 pl-4" style={{
                  borderColor: item.stockStatus === 'out_of_stock' ? '#ef4444' : 
                             item.stockStatus === 'low' ? '#f59e0b' : 
                             item.stockStatus === 'overstocked' ? '#8b5cf6' : '#22c55e'
                }}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.itemInfo?.name}</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      item.stockStatus === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                      item.stockStatus === 'low' ? 'bg-yellow-100 text-yellow-800' :
                      item.stockStatus === 'overstocked' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.stockStatus?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Stock: {item.currentStock} | Value: ${item.totalValue?.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const BranchesReport = () => {
    const data = reportData.branches;
    if (!data) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(data.branchReports || []).map((br) => ({
              name: br.branch?.name || 'N/A',
              totalValue: br.metrics?.totalValue || 0,
              totalItems: br.metrics?.totalItems || 0,
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalValue" fill="#16a34a" name="Inventory Value ($)" />
              <Bar dataKey="totalItems" fill="#3b82f6" name="Total Items" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.branchReports?.map((branchData, index) => (
            <div key={index} className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">{branchData.branch.name} Branch</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Code:</span>
                  <span className="font-medium">{branchData.branch.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">City:</span>
                  <span className="font-medium">{branchData.branch.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                    branchData.branch.status === 'active' ? 'bg-green-100 text-green-800' :
                    branchData.branch.status === 'inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {branchData.branch.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Items:</span>
                  <span className="font-medium">{branchData.metrics.totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Stock:</span>
                  <span className="font-medium">{branchData.metrics.totalStock}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Inventory Value:</span>
                  <span className="font-medium text-green-600">${branchData.metrics.totalValue?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Low Stock Items:</span>
                  <span className="font-medium text-orange-600">{branchData.metrics.lowStockItems}</span>
                </div>
              </div>
              
              {branchData.categoryBreakdown && Object.keys(branchData.categoryBreakdown).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Category Breakdown</h5>
                  <div className="space-y-1">
                    {Object.entries(branchData.categoryBreakdown).slice(0, 3).map(([category, data]) => (
                      <div key={category} className="flex justify-between text-xs">
                        <span className="text-gray-600">{category}:</span>
                        <span className="font-medium">{data.count} items</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Financial report removed

  const renderReport = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader className="w-8 h-8 animate-spin text-green-600" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-600 p-4">
          {error}
        </div>
      );
    }

    switch (selectedReport) {
      case 'overview': return <OverviewReport />;
      case 'inventory': return <InventoryReport />;
      case 'branches': return <BranchesReport />;
      default: return <OverviewReport />;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">Generate comprehensive reports and track your bakery's performance</p>
      </div>

      {/* Report Selection & Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="grid grid-cols-2 lg:flex lg:space-x-2 gap-2">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm ${
                    selectedReport === report.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {report.name}
                </button>
              );
            })}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="year">This Year</option>
              </select>
            </div>
            
            <button
              onClick={() => generatePDF(selectedReport)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="space-y-6">
        {renderReport()}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => generatePDF('daily')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <FileText className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <span className="text-sm font-medium">Daily Sales</span>
          </button>
          
          <button
            onClick={() => generatePDF('inventory')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <Package className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <span className="text-sm font-medium">Stock Report</span>
          </button>
          
          <button
            onClick={() => generatePDF('branches')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <Building2 className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <span className="text-sm font-medium">Branch Summary</span>
          </button>
          
          {/* Financial quick action removed */}
        </div>
      </div>
    </div>
  );
};

export default Reports;