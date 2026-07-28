import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, AlertTriangle, Package, Calendar, ChevronRight, Zap, Award, 
  Clock, Search, Bell, LogOut, FileText, RefreshCw, ArrowRight, Store, Tag, CheckCircle2, AlertOctagon
} from 'lucide-react';
import { formatRupees, formatNumberIN } from '../utils/currency';
import { getPurchases, getCustomers, getProducts, getShopDetails, getOffers } from '../services/db';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard({ onNavigate }) {
  const { logout, user } = useAuth();

  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [shopDetails, setShopDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Quick Search query in top bar
  const [quickSearch, setQuickSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // Real-time clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pList, cList, prList, sInfo, oList] = await Promise.all([
        getPurchases(),
        getCustomers(),
        getProducts(),
        getShopDetails(),
        getOffers()
      ]);
      setPurchases(pList || []);
      setCustomers(cList || []);
      setProducts(prList || []);
      setShopDetails(sInfo || null);
      setOffers(oList || []);
    } catch (e) {
      console.error("Dashboard data load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('volt_db_updated', loadData);
    return () => window.removeEventListener('volt_db_updated', loadData);
  }, []);

  // Operational Inventory Categorization
  const outOfStockProducts = useMemo(() => 
    products.filter(p => (p.currentStock || 0) <= 0),
    [products]
  );

  const lowStockProducts = useMemo(() => 
    products.filter(p => (p.currentStock || 0) > 0 && (p.currentStock || 0) <= (p.minStockAlert || 10)),
    [products]
  );

  const healthyStockProducts = useMemo(() =>
    products.filter(p => (p.currentStock || 0) > (p.minStockAlert || 10)),
    [products]
  );

  // Pending Due Customers (Sorted by due amount descending)
  const pendingDueCustomers = useMemo(() => {
    return customers
      .filter(c => (c.totalDue || 0) > 0)
      .sort((a, b) => (b.totalDue || 0) - (a.totalDue || 0))
      .slice(0, 10);
  }, [customers]);

  // Latest 10 Invoices (Recent Bill Records)
  const latest10Bills = useMemo(() => {
    return [...purchases]
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 10);
  }, [purchases]);

  // Active Promotional Offers
  const activeOffers = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return offers.filter(o => o.status === 'active' || (o.validUntil && o.validUntil >= today)).slice(0, 5);
  }, [offers]);

  // Recent Inventory Activity Audit Log
  const inventoryActivities = useMemo(() => {
    const activities = [];
    
    // Out of Stock alerts
    outOfStockProducts.forEach(p => {
      activities.push({
        id: 'out-' + (p.barcode || p.id),
        type: 'OUT_OF_STOCK',
        title: `Out of Stock: ${p.productName}`,
        desc: `0 units available in catalog`,
        time: p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Alert'
      });
    });

    // Low stock warnings
    lowStockProducts.forEach(p => {
      activities.push({
        id: 'low-' + (p.barcode || p.id),
        type: 'LOW_STOCK',
        title: `Low Stock Alert: ${p.productName}`,
        desc: `Only ${p.currentStock} units remaining (min: ${p.minStockAlert || 10})`,
        time: p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Today'
      });
    });

    // Recent bill sales
    purchases.slice(0, 5).forEach(b => {
      activities.push({
        id: 'bill-' + (b.billNumber || b.id),
        type: 'SALE',
        title: `Stock Deducted via Bill #${b.billNumber || b.id}`,
        desc: `${(b.items || []).length} items sold to ${b.customer?.name || 'Walk-in'}`,
        time: b.timestamp ? new Date(b.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recently'
      });
    });

    // Product catalog updates
    products.slice(0, 3).forEach(p => {
      activities.push({
        id: 'prod-' + (p.barcode || p.id),
        type: 'PRODUCT',
        title: `Inventory Catalog Active`,
        desc: `${p.productName} • ₹${formatNumberIN(p.basePrice)} (${p.unit || 'Pcs'})`,
        time: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-IN') : 'Active'
      });
    });

    return activities.slice(0, 10);
  }, [outOfStockProducts, lowStockProducts, purchases, products]);

  // Dynamic Greeting based on time of day
  const getGreeting = () => {
    const hr = currentTime.getHours();
    if (hr < 12) return "Good Morning";
    if (hr < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Quick search navigation handler
  const handleQuickSearchSubmit = (e) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    const q = quickSearch.trim().toLowerCase();
    if (q.includes('inv') || q.includes('bill')) {
      if (onNavigate) onNavigate('bill-records');
    } else if (q.includes('cust') || q.includes('due')) {
      if (onNavigate) onNavigate('customer-records');
    } else if (q.includes('offer')) {
      if (onNavigate) onNavigate('offers');
    } else if (q.includes('report')) {
      if (onNavigate) onNavigate('reports');
    } else {
      if (onNavigate) onNavigate('inventory');
    }
  };

  return (
    <div className="min-h-screen bg-[#111827] text-[#F3F4F6] font-sans p-3 sm:p-5 space-y-4 selection:bg-teal-500 selection:text-white">
      
      {/* 1. TOP ERP CONTROL HEADER */}
      <header className="bg-[#1F2937] border border-[#374151] rounded-2xl px-4 py-3 shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Center: Quick Search Bar */}
        <form onSubmit={handleQuickSearchSubmit} className="relative w-full md:w-72 lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={quickSearch}
            onChange={e => setQuickSearch(e.target.value)}
            placeholder="Quick search inventory, customers, bills, offers..."
            className="w-full bg-[#111827] border border-[#374151] focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 rounded-xl pl-9 pr-4 py-1.5 text-xs font-mono text-[#F3F4F6] placeholder-slate-500 focus:outline-none transition"
          />
        </form>

        {/* Right: System Notifications & Admin Profile */}
        <div className="flex items-center space-x-2 shrink-0 w-full md:w-auto justify-end">
          {/* Notifications Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl bg-[#111827] border border-[#374151] text-slate-300 hover:text-white hover:border-teal-400/50 transition relative"
              title="System Operational Alerts"
            >
              <Bell className="w-4 h-4" />
              {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-[#1F2937] border border-[#374151] rounded-xl shadow-2xl z-50 p-3 text-xs space-y-2">
                <div className="font-bold text-slate-200 border-b border-[#374151] pb-1.5 font-mono flex items-center justify-between">
                  <span>Operational Alerts</span>
                  <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-mono">
                    {outOfStockProducts.length + lowStockProducts.length} items
                  </span>
                </div>
                {outOfStockProducts.length === 0 && lowStockProducts.length === 0 ? (
                  <div className="text-slate-400 text-center py-2 font-mono">No inventory alerts requiring attention.</div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono">
                    {outOfStockProducts.map(p => (
                      <div key={'not-out-' + (p.barcode || p.id)} className="p-2 bg-[#111827] rounded-lg border border-red-500/40 flex items-center justify-between">
                        <div className="truncate pr-2">
                          <div className="font-bold text-red-300 truncate">{p.productName}</div>
                          <div className="text-[10px] text-red-400">OUT OF STOCK (0 units)</div>
                        </div>
                        <button
                          onClick={() => {
                            setShowNotifications(false);
                            if (onNavigate) onNavigate('inventory');
                          }}
                          className="px-2 py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded text-[10px] font-bold shrink-0"
                        >
                          Restock
                        </button>
                      </div>
                    ))}
                    {lowStockProducts.map(p => (
                      <div key={'not-low-' + (p.barcode || p.id)} className="p-2 bg-[#111827] rounded-lg border border-amber-500/30 flex items-center justify-between">
                        <div className="truncate pr-2">
                          <div className="font-bold text-slate-200 truncate">{p.productName}</div>
                          <div className="text-[10px] text-amber-400">Low Stock: {p.currentStock} left</div>
                        </div>
                        <button
                          onClick={() => {
                            setShowNotifications(false);
                            if (onNavigate) onNavigate('inventory');
                          }}
                          className="px-2 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded text-[10px] font-bold shrink-0"
                        >
                          Restock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile Badge */}
          <div className="flex items-center space-x-2 bg-[#111827] border border-[#374151] px-3 py-1.5 rounded-xl text-xs font-mono">
            <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-xs">
              A
            </div>
            <div>
              <div className="font-bold text-[#F3F4F6] text-[11px] leading-tight">{user?.username || 'Admin'}</div>
              <div className="text-[9px] text-teal-400 leading-tight">Store Manager</div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition text-xs font-mono font-bold flex items-center space-x-1"
            title="Logout Admin Session"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* 2. WELCOME BANNER (FULL WIDTH) */}
      <div className="bg-gradient-to-r from-[#1F2937] via-[#273549] to-[#1F2937] border border-[#374151] rounded-2xl p-4 shadow-md">
        <h2 className="text-xl font-black text-[#F3F4F6] font-sans tracking-tight">
          {getGreeting()}, <span className="text-teal-400">{user?.username || 'Admin'}</span> 👋
        </h2>
        <p className="text-xs text-slate-400 font-mono mt-1 leading-relaxed max-w-5xl">
          Welcome back to {shopDetails?.shopName || 'VOLT ELECTRICALS'} Administration Portal. Monitor your shop operations, manage inventory, track customer records, review reports, and oversee daily business activities from one place.
        </p>
      </div>

      {/* 3. OPERATIONAL CONTROL PANELS GRID */}
      
      {/* ROW 1: INVENTORY ALERTS (50%) + PENDING DUE CUSTOMERS (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* PANEL 1: INVENTORY ALERTS */}
        <div className="bg-[#1F2937] border border-[#374151] p-4 rounded-2xl space-y-3 shadow-md flex flex-col">
          <div className="flex items-center justify-between border-b border-[#374151] pb-2.5">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-[#F3F4F6] text-xs sm:text-sm font-mono">INVENTORY STOCK ALERTS</h3>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('inventory')}
              className="text-xs text-teal-400 hover:underline font-mono font-bold flex items-center gap-1"
            >
              <span>Inventory Catalog</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Summary Counts */}
          <div className="grid grid-cols-3 gap-2 font-mono text-center">
            <div className="p-2 bg-[#111827] rounded-xl border border-red-500/30">
              <div className="text-[9px] text-slate-400 font-bold uppercase">Out of Stock</div>
              <div className="text-sm font-black text-red-400">{outOfStockProducts.length}</div>
            </div>
            <div className="p-2 bg-[#111827] rounded-xl border border-amber-500/30">
              <div className="text-[9px] text-slate-400 font-bold uppercase">Low Stock</div>
              <div className="text-sm font-black text-amber-400">{lowStockProducts.length}</div>
            </div>
            <div className="p-2 bg-[#111827] rounded-xl border border-emerald-500/30">
              <div className="text-[9px] text-slate-400 font-bold uppercase">Healthy Stock</div>
              <div className="text-sm font-black text-emerald-400">{healthyStockProducts.length}</div>
            </div>
          </div>

          {/* Alert Products Table */}
          <div className="overflow-x-auto flex-1">
            {(outOfStockProducts.length === 0 && lowStockProducts.length === 0) ? (
              <div className="py-8 text-center text-xs text-emerald-400 font-mono">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
                All product inventory stock levels are healthy!
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-[#111827] text-slate-400 font-bold uppercase text-[10px] border-b border-[#374151]">
                  <tr>
                    <th className="py-2 px-2">Product</th>
                    <th className="py-2 px-2 text-center">Stock Status</th>
                    <th className="py-2 px-2 text-center">Available</th>
                    <th className="py-2 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#374151]">
                  {/* Out of stock first */}
                  {outOfStockProducts.slice(0, 5).map(p => (
                    <tr key={'out-row-' + (p.barcode || p.id)} className="hover:bg-[#273549]/50 transition">
                      <td className="py-2 px-2 font-bold text-slate-200 truncate max-w-[130px]">
                        {p.productName}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 border border-red-500/40 rounded text-[9px] font-bold">
                          OUT OF STOCK
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-extrabold text-red-400">
                        0 {p.unit || 'Pcs'}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          onClick={() => onNavigate && onNavigate('inventory')}
                          className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded text-[10px] font-bold transition"
                        >
                          Restock
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Low stock next */}
                  {lowStockProducts.slice(0, 5).map(p => (
                    <tr key={'low-row-' + (p.barcode || p.id)} className="hover:bg-[#273549]/50 transition">
                      <td className="py-2 px-2 font-bold text-slate-200 truncate max-w-[130px]">
                        {p.productName}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[9px] font-bold">
                          LOW STOCK
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-extrabold text-amber-400">
                        {p.currentStock} {p.unit || 'Pcs'}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          onClick={() => onNavigate && onNavigate('inventory')}
                          className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold transition"
                        >
                          Restock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* PANEL 2: PENDING DUE CUSTOMERS */}
        <div className="bg-[#1F2937] border border-[#374151] p-4 rounded-2xl space-y-3 shadow-md flex flex-col">
          <div className="flex items-center justify-between border-b border-[#374151] pb-2.5">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h3 className="font-bold text-[#F3F4F6] text-xs sm:text-sm font-mono">PENDING DUE CUSTOMERS</h3>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('customer-records')}
              className="text-xs text-amber-400 hover:underline font-mono font-bold flex items-center gap-1"
            >
              <span>Customer Records</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            {pendingDueCustomers.length === 0 ? (
              <div className="py-12 text-center text-xs text-emerald-400 font-mono">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
                All customer accounts are clear with zero pending dues!
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-[#111827] text-slate-400 font-bold uppercase text-[10px] border-b border-[#374151]">
                  <tr>
                    <th className="py-2 px-2">Customer Name</th>
                    <th className="py-2 px-2">Phone / Contact</th>
                    <th className="py-2 px-2 text-right">Outstanding Amount</th>
                    <th className="py-2 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#374151]">
                  {pendingDueCustomers.map(c => (
                    <tr key={c.id || c.phone} className="hover:bg-[#273549]/50 transition">
                      <td className="py-2 px-2 font-bold text-slate-200 truncate max-w-[130px]">
                        {c.name}
                      </td>
                      <td className="py-2 px-2 text-slate-400 font-bold">
                        {c.phone || 'N/A'}
                      </td>
                      <td className="py-2 px-2 text-right font-black text-amber-400 whitespace-nowrap">
                        ₹{formatNumberIN(c.totalDue)}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          onClick={() => onNavigate && onNavigate('customer-records')}
                          className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold transition"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* ROW 2: RECENT BILL RECORDS (50%) + ACTIVE OFFERS (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* PANEL 3: RECENT BILL RECORDS */}
        <div className="bg-[#1F2937] border border-[#374151] p-4 rounded-2xl space-y-3 shadow-md flex flex-col">
          <div className="flex items-center justify-between border-b border-[#374151] pb-2.5">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-[#F3F4F6] text-xs sm:text-sm font-mono">RECENT BILL RECORDS</h3>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('bill-records')}
              className="text-xs text-teal-400 hover:underline font-mono font-bold flex items-center gap-1"
            >
              <span>View All Bills</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            {latest10Bills.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-mono">No recent invoices recorded in system.</div>
            ) : (
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-[#111827] text-slate-400 font-bold uppercase text-[10px] border-b border-[#374151]">
                  <tr>
                    <th className="py-2 px-2">Invoice No</th>
                    <th className="py-2 px-2">Customer</th>
                    <th className="py-2 px-2 text-right">Bill Total</th>
                    <th className="py-2 px-2 text-center">Date & Time</th>
                    <th className="py-2 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#374151]">
                  {latest10Bills.map(b => (
                    <tr key={b.id || b.billNumber} className="hover:bg-[#273549]/50 transition">
                      <td className="py-2 px-2 font-bold text-teal-300 whitespace-nowrap">
                        {b.billNumber}
                      </td>
                      <td className="py-2 px-2 text-slate-300 truncate max-w-[120px]">
                        {b.customer?.name || b.customerName || 'Walk-in'}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-[#F3F4F6] whitespace-nowrap">
                        ₹{formatNumberIN(b.totalAmount)}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-400 text-[10px] whitespace-nowrap">
                        {b.timestamp ? new Date(b.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today'}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          onClick={() => onNavigate && onNavigate('bill-records')}
                          className="px-2 py-0.5 bg-[#111827] hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded text-[10px] font-bold transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* PANEL 4: ACTIVE OFFERS & PROMOTIONS */}
        <div className="bg-[#1F2937] border border-[#374151] p-4 rounded-2xl space-y-3 shadow-md flex flex-col">
          <div className="flex items-center justify-between border-b border-[#374151] pb-2.5">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-teal-400" />
              <h3 className="font-bold text-[#F3F4F6] text-xs sm:text-sm font-mono">ACTIVE PROMOTIONAL OFFERS</h3>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('offers')}
              className="text-xs text-teal-400 hover:underline font-mono font-bold flex items-center gap-1"
            >
              <span>Manage Offers</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[260px] pr-1 font-mono">
            {activeOffers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No active promotional offer campaigns.
              </div>
            ) : (
              activeOffers.map((o, idx) => (
                <div key={o.id || idx} className="p-3 bg-[#111827] rounded-xl border border-[#374151] flex items-center justify-between">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="font-bold text-slate-200 text-xs truncate flex items-center gap-1.5">
                      <span>{o.title || o.offerTitle}</span>
                      <span className="text-[9px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
                        {o.discountType === 'percentage' ? `${o.discountValue}% OFF` : `₹${o.discountValue} OFF`}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Category: {o.targetCategory || 'All Electrical Items'}
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-teal-400 font-bold shrink-0">
                    {o.validUntil ? `Valid till ${new Date(o.validUntil).toLocaleDateString('en-IN')}` : 'Active'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ROW 3: PANEL 5: RECENT INVENTORY ACTIVITY (AUDIT LOG) */}
      <div className="bg-[#1F2937] border border-[#374151] p-4 rounded-2xl space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-[#374151] pb-2.5">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-[#F3F4F6] text-xs sm:text-sm font-mono">RECENT INVENTORY ACTIVITY (AUDIT LOG)</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono font-bold">Operational Events</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
          {inventoryActivities.map(act => (
            <div key={act.id} className="p-2.5 bg-[#111827] rounded-xl border border-[#374151] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div className={`p-1.5 rounded-lg border shrink-0 ${
                  act.type === 'OUT_OF_STOCK'
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : act.type === 'LOW_STOCK'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : act.type === 'SALE'
                    ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>
                  {act.type === 'OUT_OF_STOCK' || act.type === 'LOW_STOCK' ? <AlertTriangle className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-200 truncate text-[11px]">{act.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{act.desc}</div>
                </div>
              </div>
              <div className="text-right text-[9px] text-slate-500 font-mono shrink-0">
                {act.time}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
