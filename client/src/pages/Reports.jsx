import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  Building2,
  BarChart3,
  Loader,
} from "lucide-react";
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
} from "recharts";
import API from "../../api/axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState("overview");
  const [dateRange, setDateRange] = useState("30days");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState({
    overview: null,
    inventory: null,
    branches: null,
    financial: null,
    alerts: null,
    transfers: null,
  });

  const reportTypes = [
    { id: "overview", name: "Business Overview", icon: BarChart3 },
    { id: "inventory", name: "Inventory Report", icon: Package },
    { id: "branches", name: "Branch Performance", icon: Building2 },
    { id: "financial", name: "Financial Report", icon: DollarSign },
    { id: "alerts", name: "Alerts", icon: TrendingUp },
    { id: "transfers", name: "Transfers", icon: FileText },
  ];

  useEffect(() => {
    fetchReportData(selectedReport, dateRange);
  }, [selectedReport, dateRange]);

  const fetchReportData = async (reportType, range) => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.get(`/report/${reportType}`, { params: { range } });
      setReportData((prev) => ({
        ...prev,
        [reportType]: response.data,
      }));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch report data");
      console.error("Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (reportType) => {
    try {
      let data = reportData[reportType];
      if (!data) {
        const resp = await API.get(`/report/${reportType}`, { params: { range: dateRange } });
        data = resp.data;
      }

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      let y = margin;

      const addSectionTitle = (title) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(title, margin, y);
        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
      };

      const addKeyValueRow = (pairs) => {
        const text = pairs.map(([k, v]) => `${k}: ${v}`).join("    ");
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

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Bakery Inventory Management", pageWidth / 2, y, { align: "center" });
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(
        `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        pageWidth / 2,
        y,
        { align: "center" }
      );
      y += 16;

      // Sections (based on your controller payloads)
      if (reportType === "overview" && data) {
        const ov = data.overview || {};
        addSectionTitle("Overview");
        addKeyValueRow([
          ["Total Items", ov.totalItems ?? 0],
          ["Active Branches", ov.totalBranches ?? 0],
        ]);
        addKeyValueRow([
          ["Total Stock", ov.totalStock ?? 0],
          ["Total Value ($)", (ov.totalValue || 0).toLocaleString()],
        ]);

        if (Array.isArray(data.categoryDistribution) && data.categoryDistribution.length) {
          addSectionTitle("Category Distribution");
          addTable(
            ["Category", "Items", "Stock", "Value ($)"],
            data.categoryDistribution.map((c) => [
              c._id ?? "N/A",
              String(c.count ?? 0),
              String(c.totalStock ?? 0),
              (c.totalValue || 0).toLocaleString(),
            ])
          );
        }

        if (Array.isArray(data.branchPerformance) && data.branchPerformance.length) {
          addSectionTitle("Branch Performance");
          addTable(
            ["Branch", "Items", "Stock", "Value ($)", "Low Stock"],
            data.branchPerformance.map((b) => [
              b.name ?? "N/A",
              String(b.items ?? 0),
              String(b.totalStock ?? 0),
              (b.value || 0).toLocaleString(),
              String(b.lowStockItems ?? 0),
            ])
          );
        }
      }

      if (reportType === "inventory" && data) {
        addSectionTitle("Inventory Summary");
        addKeyValueRow([
          ["Total Items", data.summary?.totalItems ?? 0],
          ["Total Stock", data.summary?.totalStock ?? 0],
        ]);
        addKeyValueRow([
          ["Total Value ($)", (data.summary?.totalValue || 0).toLocaleString()],
          ["Avg Stock", (data.summary?.avgStockLevel || 0).toFixed(1)],
        ]);

        if (Array.isArray(data.inventory) && data.inventory.length) {
          addSectionTitle("Inventory Details (first 50)");
          addTable(
            ["Item", "Branch", "Stock", "Reorder Point", "Value ($)"],
            data.inventory.slice(0, 50).map((i) => [
              i.itemInfo?.name || "N/A",
              i.branchInfo?.name || "N/A",
              String(i.currentStock ?? 0),
              String(i.reorderPoint ?? 0),
              (i.totalValue || 0).toFixed(2),
            ])
          );
        }
      }

      if (reportType === "branches" && data && Array.isArray(data.branchReports)) {
        addSectionTitle("Branch Performance");
        addTable(
          ["Name", "Code", "City", "Status", "Items", "Stock", "Value ($)", "Low"],
          data.branchReports.map((br) => [
            br.branch?.name || "N/A",
            br.branch?.code || "N/A",
            br.branch?.city || "N/A",
            br.branch?.status || "N/A",
            String(br.metrics?.totalItems ?? 0),
            String(br.metrics?.totalStock ?? 0),
            (br.metrics?.totalValue || 0).toLocaleString(),
            String(br.metrics?.lowStockItems ?? 0),
          ])
        );
      }

      if (reportType === "financial" && data) {
        addSectionTitle("Financial Summary");
        addKeyValueRow([
          ["Monthly Revenue", (data.financial?.revenue?.monthly || 0).toLocaleString()],
          ["Net Profit", (data.financial?.profit?.net || 0).toLocaleString()],
        ]);

        if (data.inventoryValue?.byBranch?.length) {
          addSectionTitle("Inventory Value by Branch");
          addTable(
            ["Branch", "Items", "Stock", "Value ($)"],
            data.inventoryValue.byBranch.map((b) => [
              b.branchName || "N/A",
              String(b.totalItems ?? 0),
              String(b.totalStock ?? 0),
              (b.totalValue || 0).toLocaleString(),
            ])
          );
        }

        if (data.transferStats) {
          addSectionTitle("Transfer Stats");
          addTable(
            ["Total Transfers", "Total Qty", "Total Value ($)", "Avg Transfer ($)"],
            [[
              String(data.transferStats.totalTransfers || 0),
              String(data.transferStats.totalQuantity || 0),
              (data.transferStats.totalValue || 0).toLocaleString(),
              (data.transferStats.avgTransferValue || 0).toFixed(2),
            ]]
          );
        }
      }

      if (reportType === "alerts" && data) {
        addSectionTitle("Low Stock / Alerts");
        if (Array.isArray(data.alerts) && data.alerts.length) {
          addTable(
            ["Item", "Branch", "Stock", "Alert Level"],
            data.alerts.map((a) => [
              a.itemInfo?.name || "N/A",
              a.branchInfo?.name || "N/A",
              String(a.currentStock ?? 0),
              a.alertLevel || "normal",
            ])
          );
        }
        if (data.summary) {
          addKeyValueRow([
            ["Critical", data.summary.critical ?? 0],
            ["Warning", data.summary.warning ?? 0],
          ]);
          addKeyValueRow([["Total Alerts", data.summary.total ?? 0]]);
        }
      }

      if (reportType === "transfers" && data) {
        addSectionTitle("Transfers");
        if (Array.isArray(data.transfers) && data.transfers.length) {
          addTable(
            ["Date", "Item", "From", "To", "Qty", "Status", "Value ($)"],
            data.transfers.slice(0, 50).map((t) => [
              new Date(t.createdAt).toLocaleString(),
              t.itemInfo?.name || "N/A",
              t.fromBranchInfo?.name || "N/A",
              t.toBranchInfo?.name || "N/A",
              String(t.quantity ?? 0),
              t.status || "N/A",
              (t.totalValue || 0).toLocaleString(),
            ])
          );
        }
        if (data.summary) {
          addKeyValueRow([
            ["Transfers", data.summary.totalTransfers ?? 0],
            ["Quantity", data.summary.totalQuantity ?? 0],
          ]);
          addKeyValueRow([["Total Value ($)", (data.summary.totalValue || 0).toLocaleString()]]);
        }
      }

      doc.save(`${reportType}-report.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    }
  };

  // ---------- UI SECTIONS (render from backend shapes) ----------

  const OverviewReport = () => {
    const data = reportData.overview;
    if (!data) return null;
    const ov = data.overview || {};
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard icon={DollarSign} title="Inventory Value" value={`Rs. ${(ov.totalValue || 0).toLocaleString()}`} color="green" />
          <StatCard icon={Package} title="Total Items" value={ov.totalItems ?? 0} color="blue" />
          <StatCard icon={Building2} title="Active Branches" value={ov.totalBranches ?? 0} color="purple" />
          <StatCard icon={TrendingUp} title="Low Stock Items" value={ov.lowStockItems ?? 0} color="orange" />
        </div>

        {Array.isArray(data.categoryDistribution) && data.categoryDistribution.length > 0 && (
          <Panel title="Category Distribution">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.categoryDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalValue" name="Value ($)" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {Array.isArray(data.branchPerformance) && data.branchPerformance.length > 0 && (
          <Panel title="Branch Performance">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.branchPerformance.map((b, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{b.name || "N/A"}</h4>
                  <KV label="Items" value={b.items ?? 0} />
                  <KV label="Stock" value={b.totalStock ?? 0} />
                  <KV label="Value" value={`$${(b.value || 0).toLocaleString()}`} />
                  <KV label="Low Stock" value={b.lowStockItems ?? 0} />
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    );
  };

  const InventoryReport = () => {
    const data = reportData.inventory;
    if (!data) return null;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard icon={Package} title="Total Items" value={data.summary?.totalItems ?? 0} color="blue" />
          <StatCard icon={DollarSign} title="Total Value" value={`Rs. ${(data.summary?.totalValue || 0).toLocaleString()}`} color="green" />
          <StatCard icon={TrendingUp} title="Total Stock" value={data.summary?.totalStock ?? 0} color="orange" />
          <StatCard icon={Package} title="Avg Stock Level" value={(data.summary?.avgStockLevel || 0).toFixed(1)} color="red" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Panel title="Top 10 Items by Stock">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={(data.inventory || []).slice(0, 10).map((i) => ({
                  name: i.itemInfo?.name || "N/A",
                  currentStock: i.currentStock || 0,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="currentStock" fill="#16a34a" name="Stock" />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Sample Stock Status (10)">
            <div className="space-y-3">
              {(data.inventory || []).slice(0, 10).map((item, idx) => (
                <div
                  key={idx}
                  className="border-l-4 pl-4"
                  style={{
                    borderColor:
                      item.stockStatus === "out_of_stock"
                        ? "#ef4444"
                        : item.stockStatus === "low"
                        ? "#f59e0b"
                        : item.stockStatus === "overstocked"
                        ? "#8b5cf6"
                        : "#22c55e",
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.itemInfo?.name || "N/A"}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        item.stockStatus === "out_of_stock"
                          ? "bg-red-100 text-red-800"
                          : item.stockStatus === "low"
                          ? "bg-yellow-100 text-yellow-800"
                          : item.stockStatus === "overstocked"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {String(item.stockStatus || "normal").replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Stock: {item.currentStock ?? 0} | Value: ${Number(item.totalValue || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    );
  };

  const BranchesReport = () => {
    const data = reportData.branches;
    if (!data) return null;
    const rows = (data.branchReports || []).map((br) => ({
      name: br.branch?.name || "N/A",
      totalValue: br.metrics?.totalValue || 0,
      totalItems: br.metrics?.totalItems || 0,
    }));
    return (
      <div className="space-y-6">
        <Panel title="Branch Performance">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalValue" fill="#16a34a" name="Inventory Value ($)" />
              <Bar dataKey="totalItems" fill="#3b82f6" name="Total Items" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(data.branchReports || []).map((branchData, index) => (
            <div key={index} className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">{branchData.branch?.name || "N/A"} Branch</h4>
              <div className="space-y-2 text-sm">
                <KV label="Code" value={branchData.branch?.code || "—"} />
                <KV label="City" value={branchData.branch?.city || "—"} />
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-medium px-2 py-1 rounded-full text-xs ${
                      branchData.branch?.status === "active"
                        ? "bg-green-100 text-green-800"
                        : branchData.branch?.status === "inactive"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {branchData.branch?.status || "unknown"}
                  </span>
                </div>
                <KV label="Total Items" value={branchData.metrics?.totalItems ?? 0} />
                <KV label="Total Stock" value={branchData.metrics?.totalStock ?? 0} />
                <KV label="Inventory Value" value={`$${(branchData.metrics?.totalValue || 0).toLocaleString()}`} />
                <KV label="Low Stock Items" value={branchData.metrics?.lowStockItems ?? 0} />
              </div>

              {branchData.categoryBreakdown && Object.keys(branchData.categoryBreakdown).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Category Breakdown</h5>
                  <div className="space-y-1">
                    {Object.entries(branchData.categoryBreakdown)
                      .slice(0, 4)
                      .map(([category, d]) => (
                        <div key={category} className="flex justify-between text-xs">
                          <span className="text-gray-600">{category}:</span>
                          <span className="font-medium">{d.count ?? 0} items</span>
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

  const FinancialReport = () => {
    const data = reportData.financial;
    if (!data) return null;

    const monthly = data.financial?.revenue?.monthly || 0;
    const net = data.financial?.profit?.net || 0;
    const trend = data.trends?.monthly || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard icon={DollarSign} title="Monthly Revenue" value={`Rs. ${monthly.toLocaleString()}`} color="green" />
          <StatCard icon={TrendingUp} title="Net Profit" value={`Rs. ${net.toLocaleString()}`} color="purple" />
          <StatCard icon={Package} title="Total Inventory Value" value={`Rs. ${(data.inventoryValue?.total || 0).toLocaleString()}`} color="blue" />
          <StatCard icon={FileText} title="Transfers (Month est.)" value={data.transferStats?.totalTransfers ?? 0} color="orange" />
        </div>

        <Panel title="Revenue & Profit (Recent Months)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" name="Revenue" />
              <Line type="monotone" dataKey="profit" name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        {Array.isArray(data.inventoryValue?.byBranch) && data.inventoryValue.byBranch.length > 0 && (
          <Panel title="Inventory Value by Branch">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.inventoryValue.byBranch.map((b) => ({
                  name: b.branchName || "N/A",
                  value: b.totalValue || 0,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Value ($)" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}
      </div>
    );
  };

  const AlertsReport = () => {
    const data = reportData.alerts;
    if (!data) return null;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={TrendingUp} title="Critical" value={data.summary?.critical ?? 0} color="red" />
          <StatCard icon={TrendingUp} title="Warning" value={data.summary?.warning ?? 0} color="orange" />
          <StatCard icon={TrendingUp} title="Total Alerts" value={data.summary?.total ?? 0} color="purple" />
        </div>

        <Panel title="Alert Items (first 30)">
          <div className="space-y-3">
            {(data.alerts || []).slice(0, 30).map((a, i) => (
              <div
                key={i}
                className="border rounded-lg p-3 flex justify-between items-center"
                style={{
                  borderColor: a.alertLevel === "critical" ? "#ef4444" : a.alertLevel === "warning" ? "#f59e0b" : "#e5e7eb",
                }}
              >
                <div>
                  <div className="font-medium">{a.itemInfo?.name || "N/A"}</div>
                  <div className="text-xs text-gray-500">{a.branchInfo?.name || "N/A"}</div>
                </div>
                <div className="text-sm">
                  Stock: <span className="font-semibold">{a.currentStock ?? 0}</span>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    a.alertLevel === "critical"
                      ? "bg-red-100 text-red-800"
                      : a.alertLevel === "warning"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {a.alertLevel}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    );
  };

  const TransfersReport = () => {
    const data = reportData.transfers;
    if (!data) return null;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={FileText} title="Transfers" value={data.summary?.totalTransfers ?? 0} color="blue" />
          <StatCard icon={Package} title="Quantity" value={data.summary?.totalQuantity ?? 0} color="green" />
          <StatCard icon={DollarSign} title="Total Value" value={`Rs. ${(data.summary?.totalValue || 0).toLocaleString()}`} color="purple" />
        </div>

        <Panel title="Recent Transfers (first 50)">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">From</th>
                  <th className="py-2 pr-4">To</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Value ($)</th>
                </tr>
              </thead>
              <tbody>
                {(data.transfers || []).slice(0, 50).map((t, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-4">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4">{t.itemInfo?.name || "N/A"}</td>
                    <td className="py-2 pr-4">{t.fromBranchInfo?.name || "N/A"}</td>
                    <td className="py-2 pr-4">{t.toBranchInfo?.name || "N/A"}</td>
                    <td className="py-2 pr-4">{t.quantity ?? 0}</td>
                    <td className="py-2 pr-4">{t.status || "N/A"}</td>
                    <td className="py-2 pr-4">{(t.totalValue || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    );
  };

  // ---------- Shared UI bits ----------

  const StatCard = ({ icon: Icon, title, value, color = "green" }) => {
    const colorMap = {
      green: ["bg-green-50", "border-green-200", "text-green-600"],
      blue: ["bg-blue-50", "border-blue-200", "text-blue-600"],
      purple: ["bg-purple-50", "border-purple-200", "text-purple-600"],
      orange: ["bg-orange-50", "border-orange-200", "text-orange-600"],
      red: ["bg-red-50", "border-red-200", "text-red-600"],
    }[color] || ["bg-gray-50", "border-gray-200", "text-gray-600"];

    return (
      <div className={`${colorMap[0]} p-6 rounded-xl border ${colorMap[1]}`}>
        <div className="flex items-center">
          <Icon className={`w-8 h-8 ${colorMap[2]}`} />
          <div className="ml-4">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className={`${colorMap[2]} text-sm`}>{title}</p>
          </div>
        </div>
      </div>
    );
  };

  const Panel = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  const KV = ({ label, value }) => (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );

  // ---------- Wrapper render ----------

  const renderReport = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader className="w-8 h-8 animate-spin text-green-600" />
        </div>
      );
    }
    if (error) {
      return <div className="text-center text-red-600 p-4">{error}</div>;
    }

    switch (selectedReport) {
      case "overview":
        return <OverviewReport />;
      case "inventory":
        return <InventoryReport />;
      case "branches":
        return <BranchesReport />;
      case "financial":
        return <FinancialReport />;
      case "alerts":
        return <AlertsReport />;
      case "transfers":
        return <TransfersReport />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">Generate comprehensive reports and track your bakery&apos;s performance</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-wrap gap-2">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`flex items-center px-4 py-2 rounded-lg ${
                  selectedReport === report.id
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {report.name}
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-4 mt-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="year">This Year</option>
            </select>
          </div>
          <button
            onClick={() => generatePDF(selectedReport)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Content */}
      {renderReport()}
    </div>
  );
};

export default Reports;
