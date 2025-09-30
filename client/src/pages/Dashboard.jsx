// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import {
  DollarSign,
  Package,
  Building2,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import API from "../../api/axios";

const colorClasses = {
  green: { bg: "bg-green-100", text: "text-green-600" },
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  purple: { bg: "bg-purple-100", text: "text-purple-600" },
  orange: { bg: "bg-orange-100", text: "text-orange-600" },
  gray: { bg: "bg-gray-100", text: "text-gray-600" },
};

const StatCard = ({ icon: Icon, title, value, change, color = "green" }) => {
  const colors = colorClasses[color] || colorClasses.gray;
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {typeof change === "number" && (
            <p
              className={`text-sm mt-2 flex items-center ${
                change > 0
                  ? "text-green-600"
                  : change < 0
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              {change > 0 ? "+" : ""}
              {change}%
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
  const [err, setErr] = useState("");

  // Cards
  const [inventoryValue, setInventoryValue] = useState(0); // calculated from /items
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [activeBranches, setActiveBranches] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);

  // Charts
  const [top10ByAvailable, setTop10ByAvailable] = useState([]); // current available inventory (top 10 items)
  const [productPie, setProductPie] = useState([]); // top products by inventory value

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErr("");

        // ---- Overview from report dashboard (branches & low stock)
        const dashRes = await API.get("/report/dashboard");
        const d = dashRes.data || {};
        const ov = d.overview || {
          totalItems: 0,
          totalBranches: 0,
          totalStock: 0,
          totalValue: 0,
          lowStockItems: 0,
        };
        setTotalItemsCount(Number(ov.totalItems || 0));
        setActiveBranches(Number(ov.totalBranches || 0));
        setLowStockItems(Number(ov.lowStockItems || 0));

        // ---- Items list (router.get("/", getItems))
        const itemsRes = await API.get("/items");
        const items = itemsRes.data?.items ?? itemsRes.data ?? [];

        // Normalize per item
        const normalized = items.map((it) => {
          const name =
            it.name || it.itemName || it.title || it.code || "Unnamed";
          const price = Number(it.price ?? 0) || 0;
          const qty = Number(
            it.currentStock ?? it.stock ?? it.quantity ?? 0
          );
          return {
            name,
            price,
            qty,
            value: price * qty,
          };
        });

        // ---- CALCULATE INVENTORY VALUE (total)
        const totalInvValue = normalized.reduce((s, x) => s + x.value, 0);
        setInventoryValue(totalInvValue);

        // ---- BAR: current available inventory of TOP 10 items
        const top10 = [...normalized]
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 10)
          .map((x) => ({
            name: x.name,
            available: x.qty,
            value: x.value, // for tooltip
          }));
        setTop10ByAvailable(top10);

        // ---- PIE: top products by inventory value (share % of top 8)
        const topValue = [...normalized]
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);
        const totalTopVal =
          topValue.reduce((s, x) => s + (x.value || 0), 0) || 1;

        const palette = [
          "#16a34a",
          "#22c55e",
          "#4ade80",
          "#86efac",
          "#bbf7d0",
          "#34d399",
          "#10b981",
          "#059669",
        ];

        let pie = topValue.map((p, i) => ({
          name: p.name,
          value: Math.round(((p.value || 0) / totalTopVal) * 100),
          color: palette[i % palette.length],
        }));
        // ensure total 100%
        const sumPct = pie.reduce((s, x) => s + x.value, 0);
        if (sumPct !== 100 && pie.length) {
          const idxMax = pie.reduce(
            (imax, x, i) => (x.value > pie[imax].value ? i : imax),
            0
          );
          pie[idxMax] = {
            ...pie[idxMax],
            value: pie[idxMax].value + (100 - sumPct),
          };
        }
        setProductPie(pie);
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.error || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back! Here&apos;s what&apos;s happening at your bakery today.
        </p>
      </div>

      {err && <div className="mb-4 text-red-600">{err}</div>}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={DollarSign}
          title="Inventory Value"
          value={`$${Number(inventoryValue || 0).toLocaleString()}`}
          change={0}
          color="green"
        />
        <StatCard
          icon={Package}
          title="Total Items"
          value={(totalItemsCount || 0).toLocaleString()}
          change={0}
          color="blue"
        />
        <StatCard
          icon={Building2}
          title="Active Branches"
          value={activeBranches}
          color="purple"
        />
        
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* NEW BAR: Top 10 items by CURRENT available inventory */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top 10 Items — Current Available Inventory
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={top10ByAvailable}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                interval={0}
                angle={-30}
                dy={10}
                textAnchor="end"
                height={70}
              />
              <YAxis />
              <Tooltip
                formatter={(value, name, { payload }) => {
                  if (name === "available") return [value, "Available"];
                  if (name === "value")
                    return [`$${Number(payload.value).toLocaleString()}`, "Value"];
                  return [value, name];
                }}
              />
              <Bar dataKey="available" fill="#16a34a" name="available" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2">
            Tooltip also shows each item&apos;s inventory value.
          </p>
        </div>

        {/* PIE: Top products by inventory value */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Products (by inventory value)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={productPie}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {productPie.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val, _name, { payload }) => [
                  `${val}%`,
                  payload?.name ?? "Product",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {productPie.map((item, index) => (
              <div key={index} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">
                  {item.name} ({item.value}%)
                </span>
              </div>
            ))}
            {productPie.length === 0 && (
              <span className="text-sm text-gray-500">
                No products available.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
