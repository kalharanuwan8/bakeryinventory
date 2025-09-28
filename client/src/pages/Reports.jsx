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
    { id: 'branches', name: 'Branch Performance', icon: Building2 },
    { id: 'financial', name: 'Financial Summary', icon: DollarSign }
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
      const response = await API.get(`/reports/${reportType}/pdf`, {
        params: { range: dateRange },
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  // Component render functions
  const OverviewReport = () => {
    const data = reportData.overview;
    if (!data) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-green-50 p-6 rounded-xl border border-green-200">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  ${data.totalSales?.toLocaleString()}
                </p>
                <p className="text-green-600 text-sm">Total Sales</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.totalItems?.toLocaleString()}
                </p>
                <p className="text-blue-600 text-sm">Items Sold</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {data.totalBranches}
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
                  {data.profitMargin}%
                </p>
                <p className="text-orange-600 text-sm">Profit Margin</p>
              </div>
            </div>
          </div>
        </div>
        
        {data.salesTrend && (
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales & Profit Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.salesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#16a34a" strokeWidth={2} name="Sales" />
                <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  const InventoryReport = () => {
    const data = reportData.inventory;
    if (!data) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {data.categories.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Levels</h3>
            <div className="space-y-4">
              {data.stockLevels.map((item, index) => (
                <div key={index} className="border-l-4 pl-4" style={{
                  borderColor: item.status === 'critical' ? '#ef4444' : 
                             item.status === 'low' ? '#f59e0b' : '#22c55e'
                }}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.item}</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      item.status === 'critical' ? 'bg-red-100 text-red-800' :
                      item.status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Current: {item.current} | Optimal: {item.optimal}
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
            <BarChart data={data.performance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="branch" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="#16a34a" name="Sales ($)" />
              <Bar dataKey="profit" fill="#22c55e" name="Profit ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.performance.map((branch, index) => (
            <div key={index} className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">{branch.branch} Branch</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sales:</span>
                  <span className="font-medium">${branch.sales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Items Sold:</span>
                  <span className="font-medium">{branch.items}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Profit:</span>
                  <span className="font-medium text-green-600">${branch.profit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const FinancialReport = () => {
    const data = reportData.financial;
    if (!data) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50 p-6 rounded-xl border border-green-200">
            <h4 className="font-semibold text-gray-900 mb-2">Revenue</h4>
            <p className="text-3xl font-bold text-green-600">
              ${data.revenue.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-red-50 p-6 rounded-xl border border-red-200">
            <h4 className="font-semibold text-gray-900 mb-2">Expenses</h4>
            <p className="text-3xl font-bold text-red-600">
              ${data.expenses.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2">Net Profit</h4>
            <p className="text-3xl font-bold text-blue-600">
              ${data.profit.toLocaleString()}
            </p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Financial Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#16a34a" name="Revenue" />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

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
      case 'financial': return <FinancialReport />;
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
          
          <button
            onClick={() => generatePDF('financial')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-orange-600" />
            <span className="text-sm font-medium">P&L Statement</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;