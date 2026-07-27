import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Calendar, Download, TrendingUp, Users, Package, 
  DollarSign, FileText, Zap, Layers, RefreshCw, PieChart
} from 'lucide-react';
import { formatRupees, formatNumberIN } from '../utils/currency';
import { getPurchases, getCustomers, getProducts } from '../services/db';
import { exportToCSV } from '../utils/exporter';

export default function ReportsAnalytics() {
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timeframe filter: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  const [timeframe, setTimeframe] = useState('monthly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

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

  // Filter purchases according to selected timeframe
  const now = new Date();
  const filteredPurchases = purchases.filter(p => {
    if (!p.timestamp) return false;
    const pDate = new Date(p.timestamp);

    if (timeframe === 'daily') {
      return p.timestamp.slice(0, 10) === now.toISOString().slice(0, 10);
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
    if (timeframe === 'yearly') {
      return pDate.getFullYear() === now.getFullYear();
    }
    if (timeframe === 'custom') {
      if (customStartDate && p.timestamp.slice(0, 10) < customStartDate) return false;
      if (customEndDate && p.timestamp.slice(0, 10) > customEndDate) return false;
      return true;
    }
    return true;
  });

  // Calculate totals
  const totalSalesVolume = filteredPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalDiscountGiven = filteredPurchases.reduce((sum, p) => sum + (p.discountAmount || 0), 0);
  const totalTaxCollected = filteredPurchases.reduce((sum, p) => sum + (p.taxAmount || 0), 0);

  // Payment Breakdown
  const paymentBreakdown = { CASH: 0, UPI: 0, CARD: 0, CREDIT: 0 };
  filteredPurchases.forEach(p => {
    const method = (p.paymentMethod || 'CASH').toUpperCase();
    if (paymentBreakdown[method] !== undefined) {
      paymentBreakdown[method] += (p.totalAmount || 0);
    } else {
      paymentBreakdown['CASH'] += (p.totalAmount || 0);
    }
  });

  // Top Customers in Period
  const customerMap = {};
  filteredPurchases.forEach(p => {
    const name = p.customer?.name || p.customerName || 'Walk-in Customer';
    const phone = p.customer?.phone || p.customerPhone || 'N/A';
    const key = phone !== 'N/A' ? phone : name;

    if (!customerMap[key]) {
      customerMap[key] = { name, phone, total: 0, count: 0 };
    }
    customerMap[key].total += (p.totalAmount || 0);
    customerMap[key].count += 1;
  });

  const topCustomersInPeriod = Object.values(customerMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Top Products in Period
  const productMap = {};
  filteredPurchases.forEach(p => {
    (p.items || []).forEach(item => {
      const name = item.productName || 'Product';
      if (!productMap[name]) {
        productMap[name] = { name, qty: 0, total: 0 };
      }
      productMap[name].qty += Number(item.qty || 1);
      productMap[name].total += Number(item.total || 0);
    });
  });

  const topProductsInPeriod = Object.values(productMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Export Report CSV
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

    exportToCSV(`electrical_shop_${timeframe}_report`, headers, [{ id: 1 }]);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Banner */}
      <div className="bg-[#273549] p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 border border-[#374151] shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-500/10 text-[#14B8A6] rounded-2xl border border-teal-500/20">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-[#F3F4F6] tracking-tight font-sans">
              Reports & Store Analytics
            </h2>
            <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">
              Comprehensive financial statements, payment breakdowns, product velocities, and CSV export
            </p>
          </div>
        </div>

        <button
          onClick={handleExportReportCSV}
          className="px-4 py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>EXPORT REPORT CSV</span>
        </button>
      </div>

      {/* Timeframe selector bar */}
      <div className="bg-[#273549] p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-[#374151] shadow-sm">
        <div className="flex items-center space-x-2 font-mono text-xs">
          <Calendar className="w-4 h-4 text-[#14B8A6]" />
          <span className="text-[#9CA3AF] font-bold">Select Report Period:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['daily', 'weekly', 'monthly', 'yearly', 'custom'].map(t => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition uppercase ${
                timeframe === t
                  ? 'bg-[#14B8A6] text-white shadow-sm'
                  : 'bg-[#1F2937] text-[#9CA3AF] hover:text-[#F3F4F6] border border-[#374151]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {timeframe === 'custom' && (
          <div className="flex items-center space-x-2 text-xs font-mono">
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="glass-input px-2.5 py-1 rounded-xl text-[#F3F4F6] bg-[#1F2937] border-[#374151]"
            />
            <span className="text-[#9CA3AF]">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="glass-input px-2.5 py-1 rounded-xl text-[#F3F4F6] bg-[#1F2937] border-[#374151]"
            />
          </div>
        )}
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#273549] p-5 rounded-2xl border border-[#374151] space-y-1 shadow-sm">
          <div className="text-xs text-[#9CA3AF] font-mono font-semibold">PERIOD REVENUE</div>
          <div className="text-2xl font-extrabold text-[#14B8A6] font-mono">
            {formatRupees(totalSalesVolume)}
          </div>
          <div className="text-[11px] text-[#9CA3AF] font-mono">
            From {filteredPurchases.length} invoices
          </div>
        </div>

        <div className="bg-[#273549] p-5 rounded-2xl border border-[#374151] space-y-1 shadow-sm">
          <div className="text-xs text-[#9CA3AF] font-mono font-semibold">DISCOUNTS GIVEN</div>
          <div className="text-2xl font-extrabold text-teal-300 font-mono">
            {formatRupees(totalDiscountGiven)}
          </div>
          <div className="text-[11px] text-[#9CA3AF] font-mono">
            Total promotional concessions
          </div>
        </div>

        <div className="bg-[#273549] p-5 rounded-2xl border border-[#374151] space-y-1 shadow-sm">
          <div className="text-xs text-[#9CA3AF] font-mono font-semibold">GST TAX COLLECTED</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {formatRupees(totalTaxCollected)}
          </div>
          <div className="text-[11px] text-[#9CA3AF] font-mono">
            Tax output liability
          </div>
        </div>

        <div className="bg-[#273549] p-5 rounded-2xl border border-[#374151] space-y-1 shadow-sm">
          <div className="text-xs text-[#9CA3AF] font-mono font-semibold">AVERAGE BILL VALUE</div>
          <div className="text-2xl font-extrabold text-purple-400 font-mono">
            {filteredPurchases.length > 0
              ? formatRupees(Math.round(totalSalesVolume / filteredPurchases.length))
              : '₹0.00'}
          </div>
          <div className="text-[11px] text-[#9CA3AF] font-mono">
            Per transaction ticket
          </div>
        </div>
      </div>

      {/* Payment Method Breakdown & Inventory Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Payment Breakdown Card */}
        <div className="bg-[#273549] p-5 rounded-2xl space-y-4 border border-[#374151] shadow-sm">
          <div className="flex items-center justify-between border-b border-[#374151] pb-3">
            <h3 className="font-extrabold text-[#F3F4F6] text-sm font-sans flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-[#14B8A6]" />
              <span>Payment Collection Breakdown</span>
            </h3>
            <span className="text-[10px] font-mono text-[#9CA3AF]">By Channel</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#1F2937] rounded-xl border border-[#374151] space-y-1">
              <div className="text-[11px] font-mono text-emerald-400 font-bold">CASH</div>
              <div className="text-lg font-bold text-[#F3F4F6] font-mono">{formatRupees(paymentBreakdown.CASH)}</div>
            </div>

            <div className="p-3 bg-[#1F2937] rounded-xl border border-[#374151] space-y-1">
              <div className="text-[11px] font-mono text-[#14B8A6] font-bold">UPI / QR CODE</div>
              <div className="text-lg font-bold text-[#F3F4F6] font-mono">{formatRupees(paymentBreakdown.UPI)}</div>
            </div>

            <div className="p-3 bg-[#1F2937] rounded-xl border border-[#374151] space-y-1">
              <div className="text-[11px] font-mono text-purple-400 font-bold">DEBIT / CREDIT CARD</div>
              <div className="text-lg font-bold text-[#F3F4F6] font-mono">{formatRupees(paymentBreakdown.CARD)}</div>
            </div>

            <div className="p-3 bg-[#1F2937] rounded-xl border border-[#374151] space-y-1">
              <div className="text-[11px] font-mono text-red-400 font-bold">STORE CREDIT / DUE</div>
              <div className="text-lg font-bold text-[#F3F4F6] font-mono">{formatRupees(paymentBreakdown.CREDIT)}</div>
            </div>
          </div>
        </div>

        {/* Top Product Movers Card */}
        <div className="bg-[#273549] p-5 rounded-2xl space-y-3 border border-[#374151] shadow-sm">
          <div className="flex items-center justify-between border-b border-[#374151] pb-3">
            <h3 className="font-extrabold text-[#F3F4F6] text-sm font-sans flex items-center space-x-2">
              <Package className="w-4 h-4 text-[#14B8A6]" />
              <span>Top Product Revenue Movers</span>
            </h3>
            <span className="text-[10px] font-mono text-[#9CA3AF]">Selected Period</span>
          </div>

          <div className="space-y-2">
            {topProductsInPeriod.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#9CA3AF] font-mono">No product sales in this timeframe.</div>
            ) : (
              topProductsInPeriod.map((p, idx) => (
                <div key={idx} className="p-2.5 bg-[#1F2937] rounded-xl border border-[#374151] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="text-[#14B8A6] font-bold">#{idx + 1}</span>
                    <span className="font-sans font-bold text-[#F3F4F6]">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-[#14B8A6]">{formatRupees(p.total)}</div>
                    <div className="text-[10px] text-[#9CA3AF]">{p.qty} units</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Top Customers in Period Table (Desktop) & Touch Cards (Mobile) */}
      <div className="bg-[#273549] rounded-2xl overflow-hidden border border-[#374151] p-5 space-y-3 shadow-sm">
        <h3 className="font-extrabold text-[#F3F4F6] text-sm font-sans flex items-center space-x-2">
          <Users className="w-4 h-4 text-[#14B8A6]" />
          <span>Top Purchasing Customers in Period</span>
        </h3>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#1F2937] text-[#9CA3AF] font-mono border-b border-[#374151]">
                <th className="p-3">CUSTOMER NAME</th>
                <th className="p-3">MOBILE NUMBER</th>
                <th className="p-3 text-center">BILLS GENERATED</th>
                <th className="p-3 text-right">TOTAL SPENT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151] font-mono text-[#F3F4F6]">
              {topCustomersInPeriod.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#9CA3AF]">
                    No purchases in this timeframe.
                  </td>
                </tr>
              ) : (
                topCustomersInPeriod.map((c, idx) => (
                  <tr key={idx} className="hover:bg-[#1F2937]/60">
                    <td className="p-3 font-sans font-bold text-[#F3F4F6]">{c.name}</td>
                    <td className="p-3 text-[#14B8A6] font-bold">📱 {c.phone}</td>
                    <td className="p-3 text-center text-[#9CA3AF]">{c.count}</td>
                    <td className="p-3 text-right font-extrabold text-emerald-400">{formatRupees(c.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Touch Cards View */}
        <div className="md:hidden space-y-2.5">
          {topCustomersInPeriod.length === 0 ? (
            <div className="py-6 text-center text-[#9CA3AF] font-mono text-xs">
              No purchases in this timeframe.
            </div>
          ) : (
            topCustomersInPeriod.map((c, idx) => (
              <div key={idx} className="bg-[#1F2937] border border-[#374151] rounded-xl p-3 flex items-center justify-between text-xs font-mono">
                <div>
                  <h4 className="font-bold text-[#F3F4F6] text-sm font-sans">{c.name}</h4>
                  <p className="text-[11px] text-[#14B8A6]">📱 {c.phone}</p>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-emerald-400 text-sm">{formatRupees(c.total)}</div>
                  <div className="text-[10px] text-[#9CA3AF]">{c.count} Invoices</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
