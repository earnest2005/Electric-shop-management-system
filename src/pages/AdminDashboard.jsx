import React, { useState, useEffect } from 'react';
import { 
  DollarSign, ShoppingCart, Users, AlertTriangle, TrendingUp, 
  Package, Calendar, ChevronRight, Zap, Award, ArrowUpRight, ArrowDownRight, Clock
} from 'lucide-react';
import { formatRupees, formatNumberIN } from '../utils/currency';
import { getPurchases, getCustomers, getProducts } from '../services/db';

export default function AdminDashboard({ onNavigate }) {
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [pList, cList, prList] = await Promise.all([
      getPurchases(),
      getCustomers(),
      getProducts()
    ]);
    setPurchases(pList);
    setCustomers(cList);
    setProducts(prList);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('volt_db_updated', loadData);
    return () => window.removeEventListener('volt_db_updated', loadData);
  }, []);

  // Time-range calculations
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Stats
  const todaySales = purchases
    .filter(p => p.timestamp && p.timestamp.slice(0, 10) === todayStr)
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  const weeklySales = purchases
    .filter(p => p.timestamp && new Date(p.timestamp) >= startOfWeek)
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  const monthlySales = purchases
    .filter(p => p.timestamp && new Date(p.timestamp) >= startOfMonth)
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  const totalRevenue = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalBills = purchases.length;
  const totalCustomers = customers.length;
  const outstandingDues = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0);
  const lowStockProducts = products.filter(p => (p.currentStock || 0) <= (p.minStockAlert || 10));

  // Top selling products computation
  const productSalesMap = {};
  purchases.forEach(p => {
    (p.items || []).forEach(item => {
      const name = item.productName || item.barcode || 'Product';
      if (!productSalesMap[name]) {
        productSalesMap[name] = { name, qty: 0, revenue: 0 };
      }
      productSalesMap[name].qty += Number(item.qty || 1);
      productSalesMap[name].revenue += Number(item.total || 0);
    });
  });
  const topSellingProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Recent 5 bills
  const recentBills = [...purchases]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  // Recent 5 customers
  const recentCustomers = [...customers]
    .sort((a, b) => new Date(b.lastPurchaseAt || 0) - new Date(a.lastPurchaseAt || 0))
    .slice(0, 5);

  // Daily sales chart data (Last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dStr = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const dayTotal = purchases
      .filter(p => p.timestamp && p.timestamp.slice(0, 10) === dStr)
      .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    return { date: dStr, label: dayLabel, amount: dayTotal };
  });

  const max7Day = Math.max(...last7Days.map(d => d.amount), 1);

  // Monthly trend (Last 6 Months)
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const monthLabel = d.toLocaleDateString('en-IN', { month: 'short' });
    const yr = d.getFullYear();
    const mo = d.getMonth();
    const monthTotal = purchases
      .filter(p => {
        if (!p.timestamp) return false;
        const pDate = new Date(p.timestamp);
        return pDate.getFullYear() === yr && pDate.getMonth() === mo;
      })
      .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    return { label: monthLabel, amount: monthTotal };
  });

  const max6Month = Math.max(...last6Months.map(m => m.amount), 1);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Banner Header */}
      <div className="bg-[#273549] p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 border border-[#374151] shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-[#14B8A6] font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4 fill-[#14B8A6]" />
            <span>Shop Owner Executive Portal</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#F3F4F6] tracking-tight font-sans">
            Admin Sales & Performance Overview
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Real-time shop statistics, revenues, low-stock warnings, and performance charts.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => onNavigate && onNavigate('reports')}
            className="px-4 py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center space-x-2"
          >
            <TrendingUp className="w-4 h-4" />
            <span>VIEW DETAILED REPORTS</span>
          </button>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-[#273549] p-5 rounded-2xl space-y-2 border border-[#374151] shadow-sm hover:border-[#14B8A6]/50 transition">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF] font-mono font-semibold">
            <span>TODAY'S SALES</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#F3F4F6] font-mono">
            {formatRupees(todaySales)}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono font-bold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Live today's total</span>
          </div>
        </div>

        {/* Weekly Sales */}
        <div className="bg-[#273549] p-5 rounded-2xl space-y-2 border border-[#374151] shadow-sm hover:border-[#14B8A6]/50 transition">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF] font-mono font-semibold">
            <span>WEEKLY SALES</span>
            <div className="p-2 bg-teal-500/10 text-[#14B8A6] rounded-xl border border-teal-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#F3F4F6] font-mono">
            {formatRupees(weeklySales)}
          </div>
          <div className="text-[11px] text-[#14B8A6] flex items-center gap-1 font-mono">
            <span>This week so far</span>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="bg-[#273549] p-5 rounded-2xl space-y-2 border border-[#374151] shadow-sm hover:border-[#14B8A6]/50 transition">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF] font-mono font-semibold">
            <span>MONTHLY SALES</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#F3F4F6] font-mono">
            {formatRupees(monthlySales)}
          </div>
          <div className="text-[11px] text-purple-400 flex items-center gap-1 font-mono">
            <span>Current month total</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-[#273549] p-5 rounded-2xl space-y-2 border border-[#374151] shadow-sm hover:border-[#14B8A6]/50 transition">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF] font-mono font-semibold">
            <span>TOTAL REVENUE</span>
            <div className="p-2 bg-teal-500/10 text-[#14B8A6] rounded-xl border border-teal-500/20">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#14B8A6] font-mono">
            {formatRupees(totalRevenue)}
          </div>
          <div className="text-[11px] text-[#9CA3AF] font-mono">
            All-time bill volume
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#273549] border border-[#374151] p-4 rounded-2xl flex items-center space-x-3 shadow-sm">
          <div className="p-2.5 bg-[#1F2937] text-[#14B8A6] rounded-xl border border-[#374151]">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9CA3AF] font-mono">Total Bills</div>
            <div className="text-lg font-bold text-[#F3F4F6] font-mono">{totalBills}</div>
          </div>
        </div>

        <div className="bg-[#273549] border border-[#374151] p-4 rounded-2xl flex items-center space-x-3 shadow-sm">
          <div className="p-2.5 bg-[#1F2937] text-[#14B8A6] rounded-xl border border-[#374151]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9CA3AF] font-mono">Total Customers</div>
            <div className="text-lg font-bold text-[#F3F4F6] font-mono">{totalCustomers}</div>
          </div>
        </div>

        <div className="bg-[#273549] border border-[#374151] p-4 rounded-2xl flex items-center space-x-3 shadow-sm">
          <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9CA3AF] font-mono">Outstanding Dues</div>
            <div className="text-lg font-bold text-red-400 font-mono">{formatRupees(outstandingDues)}</div>
          </div>
        </div>

        <div className="bg-[#273549] border border-[#374151] p-4 rounded-2xl flex items-center space-x-3 shadow-sm">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9CA3AF] font-mono">Low Stock Alerts</div>
            <div className="text-lg font-bold text-amber-400 font-mono">{lowStockProducts.length} items</div>
          </div>
        </div>
      </div>

      {/* Professional Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Daily Sales Chart */}
        <div className="bg-[#273549] p-5 rounded-2xl space-y-4 border border-[#374151] shadow-sm">
          <div className="flex items-center justify-between border-b border-[#374151] pb-3">
            <div>
              <h3 className="font-bold text-[#F3F4F6] text-sm font-sans">Daily Sales Trend</h3>
              <p className="text-xs text-[#9CA3AF] font-mono">Last 7 days revenue performance</p>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/20 font-bold">7-DAY</span>
          </div>

          <div className="h-48 flex items-end justify-between gap-2 pt-4 px-2">
            {last7Days.map((d, idx) => {
              const heightPct = Math.max(8, Math.round((d.amount / max7Day) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-[#111827] text-white text-[10px] font-mono px-2 py-1 rounded shadow-xl pointer-events-none transition whitespace-nowrap z-10 border border-[#374151]">
                    {formatRupees(d.amount)}
                  </div>
                  <div className="w-full bg-[#1F2937] rounded-t-lg h-36 flex items-end overflow-hidden p-0.5 border border-[#374151]">
                    <div 
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-[#14B8A6] hover:bg-[#0D9488] rounded-t transition-all duration-500"
                    />
                  </div>
                  <span className="text-[11px] font-mono text-[#9CA3AF]">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Revenue Trend Chart */}
        <div className="bg-[#273549] p-5 rounded-2xl space-y-4 border border-[#374151] shadow-sm">
          <div className="flex items-center justify-between border-b border-[#374151] pb-3">
            <div>
              <h3 className="font-bold text-[#F3F4F6] text-sm font-sans">Monthly Revenue Growth</h3>
              <p className="text-xs text-[#9CA3AF] font-mono">6-Month financial trajectory</p>
            </div>
            <span className="text-[10px] bg-teal-500/10 text-teal-300 font-mono px-2 py-0.5 rounded border border-teal-500/20 font-bold">6-MONTH</span>
          </div>

          <div className="h-48 flex items-end justify-between gap-3 pt-4 px-2">
            {last6Months.map((m, idx) => {
              const heightPct = Math.max(8, Math.round((m.amount / max6Month) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-[#111827] text-white text-[10px] font-mono px-2 py-1 rounded shadow-xl pointer-events-none transition whitespace-nowrap z-10 border border-[#374151]">
                    {formatRupees(m.amount)}
                  </div>
                  <div className="w-full bg-[#1F2937] rounded-t-lg h-36 flex items-end overflow-hidden p-0.5 border border-[#374151]">
                    <div 
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-[#14B8A6] hover:bg-[#0D9488] rounded-t transition-all duration-500"
                    />
                  </div>
                  <span className="text-[11px] font-mono text-[#9CA3AF]">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Lower Section Grid: Top Selling Products & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Top Selling Products (5 Cols) */}
        <div className="lg:col-span-5 bg-[#273549] p-5 rounded-2xl space-y-3 border border-[#374151] shadow-sm">
          <div className="flex items-center justify-between border-b border-[#374151] pb-3">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-[#14B8A6]" />
              <h3 className="font-bold text-[#F3F4F6] text-sm font-sans">Top Selling Electrical Items</h3>
            </div>
            <span className="text-[10px] text-[#9CA3AF] font-mono">By Qty Sold</span>
          </div>

          <div className="space-y-2">
            {topSellingProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#9CA3AF] font-mono">No sales data recorded yet.</div>
            ) : (
              topSellingProducts.map((p, idx) => (
                <div key={idx} className="p-3 bg-[#1F2937] rounded-xl border border-[#374151] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-300 font-mono font-bold flex items-center justify-center shrink-0 border border-teal-500/20">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-[#F3F4F6] truncate max-w-[180px]">{p.name}</div>
                      <div className="text-[10px] text-[#9CA3AF] font-mono">{p.qty} units sold</div>
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-[#14B8A6]">
                    {formatRupees(p.revenue)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Bills & Recent Customers (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recent Bills */}
          <div className="bg-[#273549] p-5 rounded-2xl space-y-3 border border-[#374151] shadow-sm">
            <div className="flex items-center justify-between border-b border-[#374151] pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#14B8A6]" />
                <h3 className="font-bold text-[#F3F4F6] text-sm font-sans">Recent Generated Bills</h3>
              </div>
              <button
                onClick={() => onNavigate && onNavigate('bill-records')}
                className="text-xs text-[#14B8A6] hover:underline font-mono font-semibold"
              >
                View All Bills →
              </button>
            </div>

            <div className="space-y-2">
              {recentBills.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#9CA3AF] font-mono">No recent bills found.</div>
              ) : (
                recentBills.map((b) => (
                  <div key={b.id || b.billNumber} className="p-3 bg-[#1F2937] rounded-xl border border-[#374151] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#F3F4F6] font-mono">{b.billNumber}</div>
                      <div className="text-[11px] text-[#9CA3AF]">
                        {b.customer?.name || b.customerName || 'Walk-in'} • {b.staffName || 'Staff'} • {b.paymentMethod || 'CASH'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#14B8A6] font-mono">{formatRupees(b.totalAmount)}</div>
                      <div className="text-[10px] text-[#9CA3AF] font-mono">
                        {b.timestamp ? new Date(b.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Low Stock Warning List */}
          {lowStockProducts.length > 0 && (
            <div className="bg-[#1F2937] p-5 rounded-2xl space-y-3 border border-red-500/30">
              <div className="flex items-center justify-between text-red-400 font-semibold text-xs font-mono">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> Critical Low Stock Warning
                </span>
                <span>{lowStockProducts.length} Items Require Reorder</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {lowStockProducts.slice(0, 4).map(p => (
                  <div key={p.barcode} className="p-2.5 bg-[#273549] rounded-xl border border-red-500/30 flex justify-between items-center shadow-sm">
                    <span className="font-medium text-[#F3F4F6] truncate max-w-[150px]">{p.productName}</span>
                    <span className="text-red-400 font-mono font-bold">Qty: {p.currentStock}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
