import React, { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, DollarSign, Users, AlertCircle, ShoppingBag, Zap, CreditCard, ArrowUpRight } from 'lucide-react';
import { formatRupees } from '../utils/currency';
import { getPurchases, getCustomers, getProducts } from '../services/db';

export default function DashboardAnalytics({ onNavigate }) {
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const loadData = async () => {
    const p = await getPurchases();
    const c = await getCustomers();
    const prod = await getProducts();
    setPurchases(p);
    setCustomers(c);
    setProducts(prod);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('volt_db_updated', loadData);
    return () => window.removeEventListener('volt_db_updated', loadData);
  }, []);

  const totalRevenue = purchases.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalPaidRevenue = purchases.reduce((acc, p) => acc + p.paidAmount, 0);
  const totalOutstandingDues = customers.reduce((acc, c) => acc + (c.totalDue || 0), 0);
  const totalInventoryValuation = products.reduce((acc, p) => acc + ((p.basePrice || 0) * (p.currentStock || 0)), 0);
  const lowStockItems = products.filter(prod => prod.currentStock <= prod.minStockAlert);

  // Calculate payment mode distribution
  const paymentBreakdown = purchases.reduce((acc, p) => {
    const mode = p.paymentMethod || 'Cash';
    acc[mode] = (acc[mode] || 0) + p.totalAmount;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 selection:bg-teal-500 selection:text-white">
      {/* Top Banner Header */}
      <div className="bg-[#273549] border border-[#374151] p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="font-extrabold text-[#F3F4F6] text-2xl font-sans flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-[#14B8A6]" /> Shop Intelligence & Financial Analytics
          </h2>
          <p className="text-xs text-[#9CA3AF] font-mono mt-1">
            Real-time financial performance, pending customer due ledger, and active sales velocity
          </p>
        </div>
        <button
          onClick={() => onNavigate('pos')}
          className="flex items-center space-x-2 px-5 py-3 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-lg transition shrink-0"
        >
          <Zap className="w-4 h-4 fill-white" />
          <span>OPEN POS CHECKOUT</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#273549] border border-[#374151] p-4 rounded-2xl space-y-2 shadow-sm">
          <div className="flex justify-between items-center text-xs text-[#9CA3AF]">
            <span>Gross Sales Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-[#F3F4F6] font-mono">{formatRupees(totalRevenue)}</div>
          <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Collected: {formatRupees(totalPaidRevenue)}
          </div>
        </div>

        <div className="bg-[#273549] border border-red-500/30 p-4 rounded-2xl space-y-2 shadow-sm">
          <div className="flex justify-between items-center text-xs text-[#9CA3AF]">
            <span>Total Pending Dues</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-extrabold text-red-400 font-mono">{formatRupees(totalOutstandingDues)}</div>
          <button
            onClick={() => onNavigate('dues')}
            className="text-[11px] text-red-400 font-mono hover:underline block"
          >
            Click to view Due Ledger →
          </button>
        </div>

        <div className="bg-[#273549] border border-[#374151] p-4 rounded-2xl space-y-2 shadow-sm">
          <div className="flex justify-between items-center text-xs text-[#9CA3AF]">
            <span>Total Catalog Valuation</span>
            <DollarSign className="w-4 h-4 text-[#14B8A6]" />
          </div>
          <div className="text-2xl font-extrabold text-[#14B8A6] font-mono">{formatRupees(totalInventoryValuation)}</div>
          <div className="text-[11px] text-[#9CA3AF] font-mono">{products.length} Products Stocked</div>
        </div>

        <div className="bg-[#273549] border border-[#374151] p-4 rounded-2xl space-y-2 shadow-sm">
          <div className="flex justify-between items-center text-xs text-[#9CA3AF]">
            <span>Low Stock Alerts</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">{lowStockItems.length} Products</div>
          <button
            onClick={() => onNavigate('inventory')}
            className="text-[11px] text-[#14B8A6] font-mono hover:underline block"
          >
            Manage Stock Catalog →
          </button>
        </div>
      </div>

      {/* Payment Method Breakdown & Recent Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Payment Methods & Inventory Health */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[#273549] border border-[#374151] p-5 rounded-2xl space-y-4 shadow-sm">
            <h3 className="font-bold text-[#F3F4F6] text-base font-sans">Payment Method Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(paymentBreakdown).map(([mode, amount]) => {
                const percent = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
                return (
                  <div key={mode} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#F3F4F6] font-semibold">{mode}</span>
                      <span className="text-[#14B8A6] font-bold">{formatRupees(amount)} ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 bg-[#1F2937] rounded-full overflow-hidden border border-[#374151]">
                      <div
                        className="h-full bg-[#14B8A6] rounded-full"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Low Stock Items Box */}
          <div className="bg-[#273549] border border-[#374151] p-5 rounded-2xl space-y-3 shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[#F3F4F6] text-base">Low Inventory Stock Warning</h3>
              <span className="text-xs text-red-400 font-mono bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                Action Needed
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lowStockItems.length === 0 ? (
                <div className="text-xs text-[#9CA3AF] font-mono py-4 text-center">
                  All electrical products are adequately stocked.
                </div>
              ) : (
                lowStockItems.map(item => (
                  <div key={item.barcode} className="flex items-center justify-between p-2.5 bg-[#1F2937] rounded-xl border border-[#374151] text-xs">
                    <div>
                      <div className="font-bold text-[#F3F4F6]">{item.productName}</div>
                      <div className="text-[10px] text-[#9CA3AF] font-mono">Barcode: {item.barcode}</div>
                    </div>
                    <span className="text-red-400 font-mono font-bold bg-red-500/10 border border-red-500/20 px-2 py-1 rounded">
                      {item.currentStock} left (Min: {item.minStockAlert})
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Recent Transactions */}
        <div className="lg:col-span-6">
          <div className="bg-[#273549] border border-[#374151] p-5 rounded-2xl space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[#F3F4F6] text-base">Recent Billing Feed</h3>
              <button onClick={() => onNavigate('history')} className="text-xs text-[#14B8A6] hover:underline font-mono">
                View All Invoices →
              </button>
            </div>

            <div className="space-y-2.5">
              {purchases.slice(0, 7).map(p => (
                <div key={p.id} className="p-3 bg-[#1F2937] rounded-xl border border-[#374151] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#14B8A6] font-mono">{p.billNumber}</div>
                    <div className="text-[11px] text-[#9CA3AF]">{p.customerName} ({p.paymentMethod})</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#F3F4F6] font-mono text-sm">{formatRupees(p.totalAmount)}</div>
                    {p.dueAmount > 0 ? (
                      <span className="text-[10px] text-red-400 font-mono font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                        Due: {formatRupees(p.dueAmount)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-mono">Fully Paid</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
