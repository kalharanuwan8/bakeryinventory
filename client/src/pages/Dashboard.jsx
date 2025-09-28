import React, { useEffect, useMemo, useState } from 'react';
import { 
  DollarSign, 
  Package, 
  Building2, 
  TrendingUp,
  ShoppingCart,
  Users,
  AlertTriangle
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import API from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const colorClasses = {
  green:  { bg: 'bg-green-100',  text: 'text-green-600'  },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-600'   },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
  gray:   { bg: 'bg-gray-100',   text: 'text-gray-600'   },
};

const StatCard = ({ icon: Icon, title, value, change, color = 'green' }) => {
  const colors = colorClasses[color] || colorClasses.gray;
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {typeof change === 'number' && (
            <p
              className={`text-sm mt-2 flex items-center ${
                change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              {change > 0 ? '+' : ''}{change}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colors.bg}`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [dailyProduction, setDailyProduction] = useState({ totalValue: 0, totalItems: 0, growth: 0 });
  const [branches, setBranches] = useState([]);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  const totalBranches = branches.length;
  const navigate = useNavigate();

  // ---- helpers
  const calcStockStatus = (stock = 0, daily = 0) => {
    const ratio = daily ? stock / daily : 1;
    if (ratio < 0.3) return 'low';
    if (ratio < 0.7) return 'medium';
    return 'good';
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErr('');

        // 1) Try consolidated dashboard endpoint
        try {
          const res = await API.get('/dashboard');
          const d = res.data || {};
          setDailyProduction(d.dailyProduction || { totalValue: 0, totalItems: 0, growth: 0 });
          setBranches(d.branches || []);
          setLowStockItems(typeof d.lowStockItems === 'number' ? d.lowStockItems : 0);
          setMonthlyData(d.monthlyData || []);
          setCategoryData(d.categoryData || []);
          return;
        } catch (e) {
          if (e?.response?.status !== 404) throw e;
        }

        // 2) Fallback: compose from existing routes
        const [itemsRes, branchesRes] = await Promise.all([
          API.get('/items', { params: { location: 'main' } }),
          API.get('/branches'),
        ]);

        const items = itemsRes.data.items || [];
        const brs = (branchesRes.data.branches || []).map(b => ({
          id: b._id,
          name: b.name,
          status: b.status || 'active',
          items: b.totalItems ?? 0,
          value: b.totalValue ?? 0,
        }));
        setBranches(brs);

        const totalItems = items.reduce((s, it) => s + (Number(it.dailyProduction) || 0), 0);
        const totalValue = items.reduce((s, it) => {
          const qty = Number(it.dailyProduction) || 0;
          const price = Number(it.price) || 0;
          return s + qty * price;
        }, 0);
        setDailyProduction({ totalItems, totalValue, growth: 0 });

        const lowCount = items.filter(it => calcStockStatus(it.stock, it.dailyProduction) === 'low').length;
        setLowStockItems(lowCount);

        const counts = items.reduce((m, it) => {
          const c = it.category || 'Others';
          m[c] = (m[c] || 0) + 1;
          return m;
        }, {});
        const totalCats = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
        const palette = ['#16a34a','#22c55e','#4ade80','#86efac','#bbf7d0','#d1fae5','#34d399'];
        const categories = Object.entries(counts).slice(0, 6).map(([name, count], i) => ({
          name,
          value: Math.round((count / totalCats) * 100),
          color: palette[i % palette.length],
        }));
        setCategoryData(categories);

        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const now = new Date();
        const fallbackMonthly = Array.from({ length: 6 }).map((_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          return {
            month: months[d.getMonth()],
            production: Math.round(totalValue * (0.8 + 0.05 * i)),
            sales: Math.round(totalValue * (0.75 + 0.05 * i)),
          };
        });
        setMonthlyData(fallbackMonthly);
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.error || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const totalStockValue = useMemo(
    () => monthlyData?.[monthlyData.length - 1]?.production ?? 0,
    [monthlyData]
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening at your bakery today.</p>
      </div>

      {err && <div className="mb-4 text-red-600">{err}</div>}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={DollarSign}
          title="Daily Production Value"
          value={`$${Number(dailyProduction.totalValue || 0).toLocaleString()}`}
          change={Number.isFinite(dailyProduction.growth) ? dailyProduction.growth : 0}
          color="green"
        />
        <StatCard
          icon={Package}
          title="Items Produced"
          value={(dailyProduction.totalItems || 0).toLocaleString()}
          change={0}
          color="blue"
        />
        <StatCard
          icon={Building2}
          title="Active Branches"
          value={totalBranches}
          color="purple"
        />
        <StatCard
          icon={AlertTriangle}
          title="Low Stock Items"
          value={lowStockItems}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Production Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="production" stroke="#16a34a" strokeWidth={3} name="Production" />
              <Line type="monotone" dataKey="sales" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" name="Sales" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Categories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {categoryData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600">{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Branch Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Branch Summary</h3>
          <button
            onClick={() => navigate('/branches')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            View All Branches
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <div key={branch.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{branch.name}</h4>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    (branch.status || 'active') === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {branch.status || 'active'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items Available:</span>
                  <span className="font-medium">{branch.items ?? '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Value:</span>
                  <span className="font-medium">
                    {branch.value != null ? `$${Number(branch.value).toLocaleString()}` : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {branches.length === 0 && !loading && (
            <div className="text-gray-500">No branches found.</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <button className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center">
          <ShoppingCart className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm font-medium">New Order</span>
        </button>
        <button className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center">
          <Package className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm font-medium">Update Stock</span>
        </button>
        <button className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-center">
          <Building2 className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm font-medium">Add Branch</span>
        </button>
        <button className="p-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-center">
          <Users className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm font-medium">View Reports</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
