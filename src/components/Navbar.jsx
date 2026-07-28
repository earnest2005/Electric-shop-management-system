import React, { useState, useEffect } from 'react';
import { Zap, Wifi, WifiOff, AlertCircle, Lock, Sun, Moon, Keyboard, Clock, Menu, AlertTriangle } from 'lucide-react';
import { formatRupees } from '../utils/currency';
import { getCustomers, getShopDetails, getProducts, DEFAULT_SHOP_DETAILS } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LowStockModal from './LowStockModal';

export default function Navbar({ currentView, onOpenShortcuts, onOpenDrafts, onToggleMobileMenu, draftCount = 0 }) {
  const { logout, userRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [totalDue, setTotalDue] = useState(0);
  const [dueCustomerCount, setDueCustomerCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shopDetails, setShopDetails] = useState(DEFAULT_SHOP_DETAILS);

  // Low stock state
  const [products, setProducts] = useState([]);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const loadDues = async () => {
      const customers = await getCustomers();
      const dues = customers.filter(c => (c.totalDue || 0) > 0);
      const sum = dues.reduce((acc, c) => acc + (c.totalDue || 0), 0);
      setTotalDue(sum);
      setDueCustomerCount(dues.length);
    };

    const loadShop = async () => {
      const details = await getShopDetails();
      if (details) setShopDetails(details);
    };

    const loadProductsData = async () => {
      const prList = await getProducts();
      setProducts(prList || []);
    };

    loadDues();
    loadShop();
    loadProductsData();

    const handleShopUpdate = (e) => {
      if (e.detail) setShopDetails(e.detail);
    };

    window.addEventListener('volt_db_updated', () => {
      loadDues();
      loadProductsData();
    });
    window.addEventListener('volt_shop_updated', handleShopUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('volt_db_updated', loadDues);
      window.removeEventListener('volt_shop_updated', handleShopUpdate);
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="h-16 border-b border-[#374151] bg-[#1E293B] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm font-sans">
      {/* Brand Identity & Mobile Menu Toggle */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-2 rounded-xl bg-[#273549] hover:bg-[#374151] text-[#F3F4F6] border border-[#374151] transition lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Toggle Menu"
            aria-label="Open Drawer Navigation"
          >
            <Menu className="w-5 h-5 text-[#F3F4F6]" />
          </button>
        )}

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#14B8A6] flex items-center justify-center shadow-sm shrink-0">
          <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <h1 className="font-extrabold text-base sm:text-xl tracking-tight text-[#F3F4F6] font-sans uppercase truncate max-w-[130px] sm:max-w-none">
              {shopDetails.shopName || 'VOLT ELECTRICALS'}
            </h1>
            <span className="text-[10px] sm:text-xs bg-teal-500/10 text-teal-300 font-mono px-1.5 sm:px-2 py-0.5 rounded border border-teal-500/30 shrink-0 hidden xs:inline-block font-bold">
              POS v2.5
            </span>
          </div>
          <p className="text-xs text-[#9CA3AF] font-mono hidden md:block">
            {shopDetails.tagline || 'Power, Lighting & Hardware Billing Management System'}
          </p>
        </div>
      </div>

      {/* Center Live Clock & Due Summary Pill */}
      <div className="hidden lg:flex items-center space-x-4">
        {totalDue > 0 && (
          <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs text-amber-300 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Pending Dues: <strong className="text-amber-200">{formatRupees(totalDue)}</strong> ({dueCustomerCount} customers)</span>
          </div>
        )}
        <div className="text-xs text-[#9CA3AF] font-mono bg-[#273549] px-3 py-1 rounded-md border border-[#374151]">
          {currentTime.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} • {currentTime.toLocaleTimeString('en-IN')}
        </div>
      </div>

      {/* Right Controls Bar */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Held Draft Invoices Button */}
        {onOpenDrafts && (
          <button
            type="button"
            onClick={onOpenDrafts}
            className="relative flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-[#273549] hover:bg-[#374151] text-[#F3F4F6] border border-[#374151] transition text-xs font-mono font-medium"
            title="Held Draft Bills"
          >
            <Clock className="w-4 h-4 text-[#14B8A6]" />
            <span className="hidden sm:inline">Drafts</span>
            {draftCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#14B8A6] text-white font-extrabold font-mono text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {draftCount}
              </span>
            )}
          </button>
        )}

        {/* Keyboard Shortcuts Trigger Button */}
        {onOpenShortcuts && (
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-[#273549] hover:bg-[#374151] text-[#F3F4F6] border border-[#374151] transition text-xs font-mono font-medium"
            title="Counter Keyboard Hotkeys"
          >
            <Keyboard className="w-4 h-4 text-[#14B8A6]" />
            <span>Hotkeys</span>
          </button>
        )}



        {/* Low Stock Alert Notification Button */}
        {(() => {
          const lowCount = products.filter(p => (p.currentStock || 0) <= (p.minStockAlert || 10)).length;
          if (lowCount === 0) return null;

          return (
            <button
              type="button"
              onClick={() => setShowLowStockModal(true)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border transition text-xs font-mono font-bold ${
                userRole === 'admin'
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
              title={userRole === 'admin' ? 'Low Stock Alerts - Click to Restock' : 'Low Stock Items Counter Notice'}
            >
              <AlertTriangle className={`w-4 h-4 ${userRole === 'admin' ? 'text-red-400' : 'text-amber-400'}`} />
              <span>{userRole === 'admin' ? `🔴 Low Stock (${lowCount})` : `⚠️ Low Stock Items (${lowCount})`}</span>
            </button>
          );
        })()}

        {/* Lock POS Button */}
        <button
          type="button"
          onClick={logout}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#273549] hover:bg-red-500/10 text-[#9CA3AF] hover:text-red-400 border border-[#374151] hover:border-red-500/30 transition text-xs font-mono font-semibold"
          title="Lock POS Terminal"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Lock</span>
        </button>
      </div>

      {showLowStockModal && (
        <LowStockModal
          products={products}
          onClose={() => setShowLowStockModal(false)}
          onRefreshData={() => {
            getProducts().then(p => setProducts(p || []));
          }}
        />
      )}
    </header>
  );
}
