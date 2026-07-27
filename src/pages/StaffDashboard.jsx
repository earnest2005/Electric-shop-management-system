import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Package, Receipt, Users, AlertTriangle, 
  Sparkles, ArrowRight, Clock, Zap, DollarSign, Tag, CheckCircle2
} from 'lucide-react';
import { formatRupees } from '../utils/currency';
import { getPurchases, getProducts, getOffers } from '../services/db';
import { useAuth } from '../context/AuthContext';

export default function StaffDashboard({ onNavigate }) {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);

  const loadData = async () => {
    const [pList, prList, oList] = await Promise.all([
      getPurchases(),
      getProducts(),
      getOffers()
    ]);
    setPurchases(pList);
    setProducts(prList);
    setOffers(oList.filter(o => o.status === 'active'));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('volt_db_updated', loadData);
    return () => window.removeEventListener('volt_db_updated', loadData);
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPurchases = purchases.filter(p => p.timestamp && p.timestamp.slice(0, 10) === todayStr);
  const todaySales = todayPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const todayBills = todayPurchases.length;
  const lowStockProducts = products.filter(p => (p.currentStock || 0) <= (p.minStockAlert || 10));

  const recentBills = [...purchases]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 4);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans selection:bg-teal-500 selection:text-white">
      {/* Welcome Banner */}
      <div className="bg-[#273549] p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 border border-[#374151] shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-[#14B8A6] font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4 fill-[#14B8A6]" />
            <span>Staff Terminal Dashboard</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#F3F4F6] tracking-tight">
            Welcome back, {user?.username || 'Cashier'}!
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-1 font-mono">
            Fast billing terminal • Active promotional offers • Inventory status
          </p>
        </div>

        <button
          onClick={() => onNavigate && onNavigate('pos')}
          className="px-6 py-3.5 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-sm rounded-2xl shadow-md transition flex items-center space-x-2 shrink-0 group"
        >
          <ShoppingBag className="w-5 h-5" />
          <span>START NEW POS BILLING</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Large Quick Action Shortcut Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate && onNavigate('pos')}
          className="p-5 bg-[#273549] hover:bg-[#1F2937] border border-[#374151] hover:border-[#14B8A6] rounded-2xl text-left transition group space-y-3 shadow-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-[#14B8A6] text-white flex items-center justify-center shadow-md">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="font-extrabold text-[#F3F4F6] text-base group-hover:text-[#14B8A6] transition">
              Active POS Counter
            </div>
            <div className="text-xs text-[#9CA3AF] font-mono mt-0.5">
              Create instant retail invoice with barcode scanner & discount offers
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate && onNavigate('inventory')}
          className="p-5 bg-[#273549] hover:bg-[#1F2937] border border-[#374151] hover:border-[#14B8A6] rounded-2xl text-left transition group space-y-3 shadow-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-[#1F2937] text-white flex items-center justify-center shadow-md border border-[#374151]">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="font-extrabold text-[#F3F4F6] text-base group-hover:text-[#14B8A6] transition">
              Inventory Search
            </div>
            <div className="text-xs text-[#9CA3AF] font-mono mt-0.5">
              Lookup stock levels, prices, barcode details, and item specifications
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate && onNavigate('history')}
          className="p-5 bg-[#273549] hover:bg-[#1F2937] border border-[#374151] hover:border-[#14B8A6] rounded-2xl text-left transition group space-y-3 shadow-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-[#14B8A6] flex items-center justify-center shadow-md border border-teal-500/20">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="font-extrabold text-[#F3F4F6] text-base group-hover:text-[#14B8A6] transition">
              Sales & Receipts
            </div>
            <div className="text-xs text-[#9CA3AF] font-mono mt-0.5">
              Reprint customer invoices and review historical transaction logs
            </div>
          </div>
        </button>
      </div>

      {/* Today Counter Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#273549] p-5 rounded-2xl border border-[#374151] space-y-1 shadow-sm">
          <div className="text-xs text-[#9CA3AF] font-mono font-semibold">TODAY'S TOTAL SALES</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {formatRupees(todaySales)}
          </div>
          <div className="text-[11px] text-[#9CA3AF] font-mono">Live counter revenue</div>
        </div>

        <div className="bg-[#273549] p-5 rounded-2xl border border-[#374151] space-y-1 shadow-sm">
          <div className="text-xs text-[#9CA3AF] font-mono font-semibold">BILLS ISSUED TODAY</div>
          <div className="text-2xl font-extrabold text-[#14B8A6] font-mono">
            {todayBills}
          </div>
          <div className="text-[11px] text-[#9CA3AF] font-mono">Transactions processed</div>
        </div>

        <div className="bg-[#273549] p-5 rounded-2xl border border-[#374151] space-y-1 shadow-sm">
          <div className="text-xs text-[#9CA3AF] font-mono font-semibold">ACTIVE OFFERS</div>
          <div className="text-2xl font-extrabold text-purple-400 font-mono">
            {offers.length} Offers Live
          </div>
          <div className="text-[11px] text-[#9CA3AF] font-mono">Promotions active at POS</div>
        </div>
      </div>

      {/* Active Promotional Banner Section */}
      {offers.length > 0 && (
        <div className="bg-[#273549] p-5 rounded-3xl border border-[#374151] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[#14B8A6] font-mono text-xs font-bold uppercase">
              <Sparkles className="w-4 h-4 fill-[#14B8A6]" />
              <span>ACTIVE PROMOTIONAL CAMPAIGNS FOR CASHIERS</span>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('active-offers')}
              className="text-xs text-[#14B8A6] hover:underline font-mono font-bold"
            >
              View All Offers ({offers.length}) →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {offers.slice(0, 3).map(offer => (
              <div key={offer.id} className="p-3.5 bg-[#1F2937] rounded-2xl border border-[#374151] space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded font-bold border border-teal-500/20">
                    {offer.offerType}
                  </span>
                  <span className="text-[11px] font-mono font-extrabold text-[#14B8A6]">
                    {offer.offerType === 'Percentage Discount' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                  </span>
                </div>
                <div className="font-bold text-[#F3F4F6] text-xs font-sans truncate">{offer.title}</div>
                <div className="text-[10px] text-[#9CA3AF] line-clamp-2">{offer.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Bills & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Counter Bills */}
        <div className="bg-[#273549] p-5 rounded-2xl space-y-3 border border-[#374151] shadow-sm">
          <div className="flex items-center justify-between border-b border-[#374151] pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#14B8A6]" />
              <h3 className="font-bold text-[#F3F4F6] text-sm font-sans">Recent Generated Bills</h3>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('history')}
              className="text-xs text-[#14B8A6] hover:underline font-mono font-semibold"
            >
              View All →
            </button>
          </div>

          <div className="space-y-2">
            {recentBills.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#9CA3AF] font-mono">No bills generated yet today.</div>
            ) : (
              recentBills.map(b => (
                <div key={b.id || b.billNumber} className="p-3 bg-[#1F2937] rounded-xl border border-[#374151] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#F3F4F6] font-mono">{b.billNumber}</div>
                    <div className="text-[11px] text-[#9CA3AF]">
                      {b.customer?.name || b.customerName || 'Walk-in'} • {b.paymentMethod || 'CASH'}
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

        {/* Low Stock Warning Box */}
        <div className="bg-[#273549] p-5 rounded-2xl space-y-3 border border-[#374151] shadow-sm">
          <div className="flex items-center justify-between border-b border-[#374151] pb-3">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <h3 className="font-bold text-[#F3F4F6] text-sm font-sans">Low Stock Counter Notice</h3>
            </div>
            <span className="text-xs text-red-400 font-mono font-bold">
              {lowStockProducts.length} Items Low
            </span>
          </div>

          <div className="space-y-2">
            {lowStockProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-emerald-400 font-mono font-bold">
                ✓ All product stocks are healthy!
              </div>
            ) : (
              lowStockProducts.slice(0, 5).map(p => (
                <div key={p.barcode} className="p-2.5 bg-[#1F2937] rounded-xl border border-red-500/30 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-medium text-[#F3F4F6] truncate max-w-[180px]">{p.productName}</span>
                    <div className="text-[10px] text-[#9CA3AF] font-mono">Barcode: {p.barcode}</div>
                  </div>
                  <span className="text-red-400 font-mono font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                    Stock: {p.currentStock}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
