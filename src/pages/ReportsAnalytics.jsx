import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, Calendar, Download, TrendingUp, Users, Package, 
  DollarSign, FileText, Zap, Layers, RefreshCw, PieChart, AlertTriangle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { formatRupees, formatNumberIN } from '../utils/currency';
import { getPurchases, getCustomers, getProducts } from '../services/db';
import { exportToCSV } from '../utils/exporter';

export default function ReportsAnalytics() {
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timeframe filter: 'today' | 'yesterday' | 'weekly' | 'monthly' | 'custom'
  const [timeframe, setTimeframe] = useState('monthly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [pList, cList, prList] = await Promise.all([
        getPurchases(),
        getCustomers(),
        getProducts()
      ]);
      setPurchases(pList || []);
      setCustomers(cList || []);
      setProducts(prList || []);
    } catch (e) {
      console.error("Reports load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('volt_db_updated', loadData);
    return () => window.removeEventListener('volt_db_updated', loadData);
  }, []);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Filter purchases according to selected timeframe
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (!p.timestamp) return false;
      const pDateStr = p.timestamp.slice(0, 10);
      const pDate = new Date(p.timestamp);

      if (timeframe === 'today') {
        return pDateStr === todayStr;
      }
      if (timeframe === 'yesterday') {
        return pDateStr === yesterdayStr;
      }
      if (timeframe === 'weekly') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return pDate >= startOfWeek;
      }
      if (timeframe === 'monthly') {
        return pDate.getFullYear() === now.getFullYear() && pDate.getMonth() === now.getMonth();
      }
      if (timeframe === 'custom') {
        if (customStartDate && pDateStr < customStartDate) return false;
        if (customEndDate && pDateStr > customEndDate) return false;
        return true;
      }
      return true;
    });
  }, [purchases, timeframe, todayStr, yesterdayStr, customStartDate, customEndDate]);

  // Primary Metrics
  const totalSalesVolume = filteredPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalDiscountGiven = filteredPurchases.reduce((sum, p) => sum + (p.discountAmount || 0), 0);
  const totalTaxCollected = filteredPurchases.reduce((sum, p) => sum + (p.taxAmount || 0), 0);

  // Payment Method Distribution
  const paymentBreakdown = useMemo(() => {
    const res = { CASH: 0, UPI: 0, CARD: 0, CREDIT: 0 };
    filteredPurchases.forEach(p => {
      const method = (p.paymentMethod || 'CASH').toUpperCase();
      if (res[method] !== undefined) {
        res[method] += (p.totalAmount || 0);
      } else {
        res['CASH'] += (p.totalAmount || 0);
      }
    });
    return res;
  }, [filteredPurchases]);

  // Product Reports: Top vs Least Selling & Categories
  const { topProducts, leastProducts, categorySales } = useMemo(() => {
    const map = {};
    const catMap = {};

    filteredPurchases.forEach(p => {
      (p.items || []).forEach(item => {
        const name = item.productName || 'Product';
        const category = item.category || 'Electrical Accessories';
        const qty = Number(item.qty || 1);
        const total = Number(item.total || 0);

        if (!map[name]) {
          map[name] = { name, qty: 0, total };
        } else {
          map[name].qty += qty;
          map[name].total += total;
        }

        if (!catMap[category]) {
          catMap[category] = 0;
        }
        catMap[category] += total;
      });
    });

    const sortedProducts = Object.values(map).sort((a, b) => b.total - a.total);
    const top = sortedProducts.slice(0, 8);
    const least = [...sortedProducts].reverse().slice(0, 8);

    const categories = Object.entries(catMap).map(([cat, total]) => ({ cat, total }));

    return { topProducts: top, leastProducts: least, categorySales: categories };
  }, [filteredPurchases]);

  // Customer Reports: New vs Repeat & Dues
  const { newCustomersCount, repeatCustomersCount, topDuesList } = useMemo(() => {
    const customerPurchasesCount = {};
    filteredPurchases.forEach(p => {
      const phone = p.customer?.phone || p.customerPhone || 'WALKIN';
      if (phone !== 'WALKIN') {
        customerPurchasesCount[phone] = (customerPurchasesCount[phone] || 0) + 1;
      }
    });

    let newCount = 0;
    let repeatCount = 0;
    Object.values(customerPurchasesCount).forEach(c => {
      if (c === 1) newCount++;
      else if (c > 1) repeatCount++;
    });

    const dues = customers
      .filter(c => (c.totalDue || 0) > 0)
      .sort((a, b) => (b.totalDue || 0) - (a.totalDue || 0))
      .slice(0, 6);

    return { newCustomersCount: newCount, repeatCustomersCount: repeatCount, topDuesList: dues };
  }, [filteredPurchases, customers]);

  // Inventory Valuation & Low Stock
  const inventoryValuation = useMemo(() => {
    let totalStockQty = 0;
    let totalBaseValue = 0;
    let totalMarketValue = 0;

    products.forEach(p => {
      const qty = Number(p.currentStock || 0);
      totalStockQty += qty;
      totalBaseValue += qty * Number(p.costPrice || p.basePrice || 0);
      totalMarketValue += qty * Number(p.sellingPrice || p.basePrice || 0);
    });

    return { totalStockQty, totalBaseValue, totalMarketValue };
  }, [products]);

  const lowStockList = useMemo(() => {
    return products.filter(p => (p.currentStock || 0) <= (p.minStockAlert || 10));
  }, [products]);

  // Chart Data: 7 Days Sales Trend (Bar Chart)
  const last7DaysChart = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const dayTotal = purchases
        .filter(p => p.timestamp && p.timestamp.slice(0, 10) === dStr)
        .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      return { label: dayLabel, amount: dayTotal };
    });
  }, [purchases]);

  const max7Day = useMemo(() => Math.max(...last7DaysChart.map(d => d.amount), 1), [last7DaysChart]);

  // Chart Data: 6 Months Revenue Growth (Line Chart)
  const last6MonthsChart = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
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
  }, [purchases, now]);

  const max6Month = useMemo(() => Math.max(...last6MonthsChart.map(m => m.amount), 1), [last6MonthsChart]);

  // Export CSV
  const handleExportReportCSV = () => {
    const headers = [
      { label: 'Report Period', accessor: () => timeframe.toUpperCase() },
      { label: 'Total Invoices', accessor: () => filteredPurchases.length },
      { label: 'Gross Sales (₹)', accessor: () => (totalSalesVolume / 100).toFixed(2) },
      { label: 'Discounts (₹)', accessor: () => (totalDiscountGiven / 100).toFixed(2) },
      { label: 'Tax Collected (₹)', accessor: () => (totalTaxCollected / 100).toFixed(2) },
      { label: 'Cash Volume (₹)', accessor: () => (paymentBreakdown.CASH / 100).toFixed(2) },
      { label: 'UPI Volume (₹)', accessor: () => (paymentBreakdown.UPI / 100).toFixed(2) },
      { label: 'Card Volume (₹)', accessor: () => (paymentBreakdown.CARD / 100).toFixed(2) },
      { label: 'Credit Volume (₹)', accessor: () => (paymentBreakdown.CREDIT / 100).toFixed(2) }
    ];

    exportToCSV(`electrical_shop_${timeframe}_analytical_report`, headers, [{ id: 1 }]);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans selection:bg-teal-500 selection:text-white">
      
      {/* 1. TOP BANNER & TIMEFRAME FILTERS */}
      <div className="bg-[#273549] p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 border border-[#374151] shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-500/10 text-teal-400 rounded-2xl border border-teal-500/20">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-[#F3F4F6] tracking-tight font-sans">
              Reports & Store Analytics
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Enterprise financial statements, sales trend charts, velocity reports, and payment analytics
            </p>
          </div>
        </div>

        <button
          onClick={handleExportReportCSV}
          className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition flex items-center space-x-1.5 shrink-0 border border-teal-400/30"
        >
          <Download className="w-4 h-4" />
          <span>EXPORT ANALYTICAL REPORT CSV</span>
        </button>
      </div>

      {/* Timeframe Filter Bar */}
      <div className="bg-[#1F2937] p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-[#374151] shadow-sm">
        <div className="flex items-center space-x-2 font-mono text-xs">
          <Calendar className="w-4 h-4 text-teal-400" />
          <span className="text-slate-400 font-bold">Report Date Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'weekly', label: 'This Week' },
            { id: 'monthly', label: 'This Month' },
            { id: 'custom', label: 'Custom Date Range' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTimeframe(t.id)}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition uppercase ${
                timeframe === t.id
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'bg-[#111827] text-slate-400 hover:text-white border border-[#374151]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {timeframe === 'custom' && (
          <div className="flex items-center space-x-2 text-xs font-mono">
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-xl text-[#F3F4F6] bg-[#111827] border border-[#374151] focus:border-teal-400 focus:outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-xl text-[#F3F4F6] bg-[#111827] border border-[#374151] focus:border-teal-400 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Primary Financial Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1F2937] p-4 rounded-2xl border border-[#374151] space-y-1 shadow-sm">
          <div className="text-xs text-slate-400 font-mono font-semibold">PERIOD REVENUE</div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {formatRupees(totalSalesVolume)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {filteredPurchases.length} total invoices in period
          </div>
        </div>

        <div className="bg-[#1F2937] p-4 rounded-2xl border border-[#374151] space-y-1 shadow-sm">
          <div className="text-xs text-slate-400 font-mono font-semibold">DISCOUNTS GIVEN</div>
          <div className="text-2xl font-black text-teal-300 font-mono">
            {formatRupees(totalDiscountGiven)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Promotional customer concessions
          </div>
        </div>

        <div className="bg-[#1F2937] p-4 rounded-2xl border border-[#374151] space-y-1 shadow-sm">
          <div className="text-xs text-slate-400 font-mono font-semibold">GST TAX OUTPUT</div>
          <div className="text-2xl font-black text-blue-400 font-mono">
            {formatRupees(totalTaxCollected)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Tax liability generated
          </div>
        </div>

        <div className="bg-[#1F2937] p-4 rounded-2xl border border-[#374151] space-y-1 shadow-sm">
          <div className="text-xs text-slate-400 font-mono font-semibold">AVERAGE TICKET SIZE</div>
          <div className="text-2xl font-black text-purple-400 font-mono">
            {filteredPurchases.length > 0
              ? formatRupees(Math.round(totalSalesVolume / filteredPurchases.length))
              : '₹0.00'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Avg spending per customer bill
          </div>
        </div>
      </div>

      {/* 2. SALES CHARTS & REVENUE CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Daily / Period Sales Bar Chart */}
        <div className="bg-[#1F2937] p-5 rounded-2xl space-y-4 border border-[#374151] shadow-md">
          <div className="flex items-center justify-between border-b border-[#374151] pb-3">
            <div>
              <h3 className="font-extrabold text-[#F3F4F6] text-sm font-sans flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Daily Sales Trend (7-Day Bar Chart)</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">Volume breakdown across recent days</p>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
              BAR CHART
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2">
            {last7DaysChart.map((d, idx) => {
              const heightPct = Math.max(10, Math.round((d.amount / max7Day) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-[#111827] text-teal-300 text-[10px] font-mono font-bold px-2 py-1 rounded shadow-xl pointer-events-none transition whitespace-nowrap z-10 border border-teal-500/30">
                    {formatRupees(d.amount)}
                  </div>
                  <div className="w-full bg-[#111827] rounded-t-lg h-32 flex items-end overflow-hidden p-0.5 border border-[#374151]">
                    <div 
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-teal-600 to-emerald-400 hover:from-teal-500 hover:to-emerald-300 rounded-t transition-all duration-500"
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 font-bold">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Revenue Comparison Line Chart */}
        <div className="bg-[#1F2937] p-5 rounded-2xl space-y-4 border border-[#374151] shadow-md">
          <div className="flex items-center justify-between border-b border-[#374151] pb-3">
            <div>
              <h3 className="font-extrabold text-[#F3F4F6] text-sm font-sans flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>6-Month Revenue Comparison</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">Long-term monthly trajectory graph</p>
            </div>
            <span className="text-[10px] bg-purple-500/10 text-purple-300 font-mono px-2 py-0.5 rounded border border-purple-500/20 font-bold">
              LINE CHART
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-4 px-2">
            {last6MonthsChart.map((m, idx) => {
              const heightPct = Math.max(10, Math.round((m.amount / max6Month) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-[#111827] text-purple-300 text-[10px] font-mono font-bold px-2 py-1 rounded shadow-xl pointer-events-none transition whitespace-nowrap z-10 border border-purple-500/30">
                    {formatRupees(m.amount)}
                  </div>
                  <div className="w-full bg-[#111827] rounded-t-lg h-32 flex items-end overflow-hidden p-0.5 border border-[#374151]">
                    <div 
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-purple-600 to-indigo-400 hover:from-purple-500 hover:to-indigo-300 rounded-t transition-all duration-500"
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 font-bold">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. PRODUCT REPORTS & PAYMENT BREAKDOWN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Selling Products */}
        <div className="bg-[#1F2937] p-4 rounded-2xl border border-[#374151] space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#374151] pb-2 font-mono">
            <span className="font-bold text-xs text-teal-400 uppercase">🔥 TOP SELLING PRODUCTS</span>
            <span className="text-[10px] text-slate-400">By Revenue</span>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {topProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-mono">No sales data in period.</div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="p-2 bg-[#111827] rounded-xl border border-[#374151] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-teal-400 font-bold">#{idx + 1}</span>
                    <span className="font-bold text-slate-200 truncate max-w-[110px]">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-teal-400">₹{formatNumberIN(p.total)}</div>
                    <div className="text-[10px] text-slate-400">{p.qty} units</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Least Selling Products */}
        <div className="bg-[#1F2937] p-4 rounded-2xl border border-[#374151] space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#374151] pb-2 font-mono">
            <span className="font-bold text-xs text-amber-400 uppercase">🐢 LEAST SELLING PRODUCTS</span>
            <span className="text-[10px] text-slate-400">Slow Movers</span>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {leastProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-mono">No sales data in period.</div>
            ) : (
              leastProducts.map((p, idx) => (
                <div key={idx} className="p-2 bg-[#111827] rounded-xl border border-[#374151] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-amber-400 font-bold">#{idx + 1}</span>
                    <span className="font-bold text-slate-200 truncate max-w-[110px]">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-400">₹{formatNumberIN(p.total)}</div>
                    <div className="text-[10px] text-slate-400">{p.qty} units</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Channels Distribution */}
        <div className="bg-[#1F2937] p-4 rounded-2xl border border-[#374151] space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#374151] pb-2 font-mono">
            <span className="font-bold text-xs text-purple-400 uppercase">💳 PAYMENT DISTRIBUTION</span>
            <span className="text-[10px] text-slate-400">Channels</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="p-2 bg-[#111827] rounded-xl border border-[#374151] flex justify-between items-center">
              <span className="text-emerald-400 font-bold">CASH</span>
              <span className="font-bold text-[#F3F4F6]">{formatRupees(paymentBreakdown.CASH)}</span>
            </div>
            <div className="p-2 bg-[#111827] rounded-xl border border-[#374151] flex justify-between items-center">
              <span className="text-teal-400 font-bold">UPI / QR CODE</span>
              <span className="font-bold text-[#F3F4F6]">{formatRupees(paymentBreakdown.UPI)}</span>
            </div>
            <div className="p-2 bg-[#111827] rounded-xl border border-[#374151] flex justify-between items-center">
              <span className="text-purple-400 font-bold">DEBIT / CREDIT CARD</span>
              <span className="font-bold text-[#F3F4F6]">{formatRupees(paymentBreakdown.CARD)}</span>
            </div>
            <div className="p-2 bg-[#111827] rounded-xl border border-[#374151] flex justify-between items-center">
              <span className="text-red-400 font-bold">STORE CREDIT / DUE</span>
              <span className="font-bold text-[#F3F4F6]">{formatRupees(paymentBreakdown.CREDIT)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. INVENTORY VALUATION & CUSTOMER REPORTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Inventory Valuation Analysis */}
        <div className="bg-[#1F2937] p-5 rounded-2xl space-y-3 border border-[#374151] shadow-sm">
          <div className="flex items-center justify-between border-b border-[#374151] pb-2.5 font-mono">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-teal-400" />
              <h3 className="font-bold text-[#F3F4F6] text-xs sm:text-sm">TOTAL INVENTORY VALUATION</h3>
            </div>
            <span className="text-[10px] text-teal-400 font-bold">{inventoryValuation.totalStockQty} Units</span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 bg-[#111827] rounded-xl border border-[#374151] space-y-1">
              <div className="text-slate-400">Total Purchase Cost Value</div>
              <div className="text-lg font-extrabold text-teal-400">{formatRupees(inventoryValuation.totalBaseValue)}</div>
            </div>
            <div className="p-3 bg-[#111827] rounded-xl border border-[#374151] space-y-1">
              <div className="text-slate-400">Total Market Retail Value</div>
              <div className="text-lg font-extrabold text-emerald-400">{formatRupees(inventoryValuation.totalMarketValue)}</div>
            </div>
          </div>

          {lowStockList.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-mono text-red-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4" /> {lowStockList.length} Items Require Immediate Reorder
              </span>
              <span className="text-[10px] font-bold underline">Review Inventory</span>
            </div>
          )}
        </div>

        {/* Customer Analysis: New vs Repeat & Dues */}
        <div className="bg-[#1F2937] p-5 rounded-2xl space-y-3 border border-[#374151] shadow-sm">
          <div className="flex items-center justify-between border-b border-[#374151] pb-2.5 font-mono">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-[#F3F4F6] text-xs sm:text-sm">CUSTOMER ENGAGEMENT & DUES</h3>
            </div>
            <span className="text-[10px] text-blue-400 font-bold">Ledger Insights</span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 bg-[#111827] rounded-xl border border-[#374151] space-y-1">
              <div className="text-slate-400">New Customers</div>
              <div className="text-xl font-extrabold text-blue-400">{newCustomersCount}</div>
            </div>
            <div className="p-3 bg-[#111827] rounded-xl border border-[#374151] space-y-1">
              <div className="text-slate-400">Repeat Customers</div>
              <div className="text-xl font-extrabold text-emerald-400">{repeatCustomersCount}</div>
            </div>
          </div>

          {topDuesList.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-amber-400 font-bold uppercase">Top Outstanding Dues:</div>
              <div className="grid grid-cols-2 gap-1.5">
                {topDuesList.slice(0, 4).map(c => (
                  <div key={c.id || c.phone} className="p-2 bg-[#111827] rounded-lg border border-[#374151] flex justify-between items-center text-xs font-mono">
                    <span className="truncate max-w-[90px] text-slate-300 font-bold">{c.name}</span>
                    <span className="text-amber-400 font-bold">₹{formatNumberIN(c.totalDue)}</span>
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
