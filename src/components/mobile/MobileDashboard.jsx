import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, AlertTriangle, Package, Calendar, Zap, Award, 
  Clock, Search, FileText, ArrowRight, Store, PlusCircle, ShoppingBag
} from 'lucide-react';
import { formatRupees, formatNumberIN } from '../../utils/currency';
import { getPurchases, getCustomers, getProducts, getShopDetails } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

export default function MobileDashboard({ onNavigate }) {
  const { userRole, user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [shopDetails, setShopDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      const [pur, cust, prod, shop] = await Promise.all([
        getPurchases(),
        getCustomers(),
        getProducts(),
        getShopDetails()
      ]);
      setPurchases(pur || []);
      setCustomers(cust || []);
      setProducts(prod || []);
      setShopDetails(shop);
    }
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('volt_db_updated', handleUpdate);
    return () => window.removeEventListener('volt_db_updated', handleUpdate);
  }, []);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Compute key totals
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = useMemo(() => {
    return purchases
      .filter(p => p.timestamp && p.timestamp.slice(0, 10) === todayStr)
      .reduce((acc, p) => acc + (p.totalAmount || 0), 0);
  }, [purchases, todayStr]);

  const totalDues = useMemo(() => {
    return customers.reduce((acc, c) => acc + (c.totalDue || 0), 0);
  }, [customers]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => (p.currentStock || 0) <= (p.minStockAlert || 10)).length;
  }, [products]);

  return (
    <div className="p-4 space-y-4 font-sans max-w-md mx-auto selection:bg-teal-500 selection:text-white">
      {/* 1. Compact Native Greeting Section (Max Height 90px) */}
      <div className="bg-[#1E293B] border border-[#374151] rounded-2xl p-3.5 shadow-md flex items-center justify-between min-h-[76px]">
        <div>
          <h2 className="text-base font-extrabold text-[#F3F4F6] flex items-center gap-1.5 font-sans">
            <span>{getTimeGreeting()}, {user?.username || (userRole === 'admin' ? 'Admin' : 'Staff')}</span> 👋
          </h2>
          <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">
            Welcome back to {shopDetails?.shopName || 'Volt Electricals'}.
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 fill-teal-400" />
        </div>
      </div>

      {/* 2. Clean Single Mobile Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products, customers, or bills..."
          className="w-full pl-11 pr-4 py-3 bg-[#1F2937] border border-[#374151] rounded-2xl text-sm text-[#F3F4F6] placeholder-[#9CA3AF] focus:outline-none focus:border-[#14B8A6] font-sans shadow-sm"
        />
      </div>

      {/* 3. Primary Mobile Quick Action Buttons (Min Height 48px) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('pos')}
          className="min-h-[48px] px-4 py-3 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center space-x-2"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>NEW SALE POS</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('inventory')}
          className="min-h-[48px] px-4 py-3 bg-[#273549] hover:bg-[#374151] text-[#F3F4F6] border border-[#374151] font-bold text-xs rounded-2xl shadow-sm transition flex items-center justify-center space-x-2"
        >
          <Package className="w-4 h-4 text-teal-400" />
          <span>INVENTORY</span>
        </button>
      </div>

      {/* 4. Full-Width Mobile Metric Cards */}
      <div className="space-y-3">
        {/* Today Sales Metric */}
        <div className="bg-[#1E293B] border border-[#374151] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[#9CA3AF] font-mono uppercase tracking-wider">Today's Total Sales</span>
            <div className="text-xl font-extrabold text-[#F3F4F6] font-mono">
              {formatRupees(todaySales)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Dues Metric */}
        <div 
          onClick={() => onNavigate(userRole === 'admin' ? 'customer-records' : 'dues')}
          className="bg-[#1E293B] border border-[#374151] rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer active:scale-98 transition"
        >
          <div className="space-y-1">
            <span className="text-xs text-[#9CA3AF] font-mono uppercase tracking-wider">Pending Customer Dues</span>
            <div className="text-xl font-extrabold text-amber-300 font-mono">
              {formatRupees(totalDues)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Low Stock Alert Metric */}
        {lowStockCount > 0 && (
          <div 
            onClick={() => onNavigate('inventory', 'low-stock')}
            className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer active:scale-98 transition"
          >
            <div className="space-y-1">
              <span className="text-xs text-red-300 font-mono uppercase tracking-wider font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Low Stock Warning
              </span>
              <div className="text-sm font-bold text-red-200">
                {lowStockCount} Products need restock
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-red-300 bg-red-500/20 px-3 py-1.5 rounded-xl border border-red-500/40">
              RESTOCK
            </div>
          </div>
        )}
      </div>

      {/* 5. Mobile Secondary Quick Actions */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={() => onNavigate(userRole === 'admin' ? 'customer-records' : 'dues')}
          className="min-h-[48px] px-3 py-2.5 bg-[#1F2937] hover:bg-[#273549] border border-[#374151] rounded-2xl text-xs font-bold text-[#F3F4F6] flex items-center justify-center space-x-2"
        >
          <Users className="w-4 h-4 text-teal-400" />
          <span>CUSTOMERS</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate(userRole === 'admin' ? 'bill-records' : 'history')}
          className="min-h-[48px] px-3 py-2.5 bg-[#1F2937] hover:bg-[#273549] border border-[#374151] rounded-2xl text-xs font-bold text-[#F3F4F6] flex items-center justify-center space-x-2"
        >
          <FileText className="w-4 h-4 text-teal-400" />
          <span>BILL RECORDS</span>
        </button>
      </div>
    </div>
  );
}
