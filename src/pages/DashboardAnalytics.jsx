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
  const lowStockItems = products.filter(prod => prod.currentStock <= prod.minStockAlert);

  // Calculate payment mode distribution
  const paymentBreakdown = purchases.reduce((acc, p) => {
    const mode = p.paymentMethod || 'Cash';
    acc[mode] = (acc[mode] || 0) + p.totalAmount;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-white text-2xl font-sans flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-amber-400" /> Shop Intelligence & Financial Analytics
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time financial performance, pending customer due ledger, and active sales velocity
          </p>
        </div>
        <button
          onClick={() => onNavigate('pos')}
          className="flex items-center space-x-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow-xl shadow-amber-500/20 transition shrink-0"
        >
          <Zap className="w-4 h-4 fill-black" />
          <span>OPEN POS CHECKOUT</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Gross Sales Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{formatRupees(totalRevenue)}</div>
          <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Collected: {formatRupees(totalPaidRevenue)}
          </div>
        </div>

        <div className="glass-panel-glow p-4 rounded-2xl space-y-2 border-rose-500/40">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Total Pending Dues</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono">{formatRupees(totalOutstandingDues)}</div>
          <button
            onClick={() => onNavigate('dues')}
            className="text-[11px] text-rose-300 font-mono hover:underline block"
          >
            Click to view Due Ledger →
          </button>
        </div>

        <div className="glass-panel p-4 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Total Sales Billed</span>
            <ShoppingBag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{purchases.length} Invoices</div>
          <div className="text-[11px] text-slate-400 font-mono">100% Paise Integer Stored</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Low Stock Alerts</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">{lowStockItems.length} Products</div>
          <button
            onClick={() => onNavigate('inventory')}
            className="text-[11px] text-amber-400 font-mono hover:underline block"
          >
            Manage Stock Catalog →
          </button>
        </div>
      </div>

      {/* Payment Method Breakdown & Recent Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Payment Methods & Inventory Health */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-base font-sans">Payment Method Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(paymentBreakdown).map(([mode, amount]) => {
                const percent = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
                return (
                  <div key={mode} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-semibold">{mode}</span>
                      <span className="text-amber-400 font-bold">{formatRupees(amount)} ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 bg-dark-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Low Stock Items Box */}
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base">Low Inventory Stock Warning</h3>
              <span className="text-xs text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded">
                Action Needed
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lowStockItems.length === 0 ? (
                <div className="text-xs text-slate-500 font-mono py-4 text-center">
                  All electrical products are adequately stocked.
                </div>
              ) : (
                lowStockItems.map(item => (
                  <div key={item.barcode} className="flex items-center justify-between p-2.5 bg-dark-900 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <div className="font-bold text-white">{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Barcode: {item.barcode}</div>
                    </div>
                    <span className="text-rose-400 font-mono font-bold bg-rose-500/10 px-2 py-1 rounded">
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
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base">Recent Billing Feed</h3>
              <button onClick={() => onNavigate('history')} className="text-xs text-amber-400 hover:underline font-mono">
                View All Invoices →
              </button>
            </div>

            <div className="space-y-2.5">
              {purchases.slice(0, 7).map(p => (
                <div key={p.id} className="p-3 bg-dark-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white font-mono">{p.billNumber}</div>
                    <div className="text-[11px] text-slate-400">{p.customerName} ({p.paymentMethod})</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-400 font-mono text-sm">{formatRupees(p.totalAmount)}</div>
                    {p.dueAmount > 0 ? (
                      <span className="text-[10px] text-rose-400 font-mono font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">
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
