import React, { useState, useEffect } from 'react';
import { Zap, Wifi, WifiOff, AlertCircle, Lock, Sun, Moon, Keyboard, Clock } from 'lucide-react';
import { formatRupees } from '../utils/currency';
import { getCustomers, getShopDetails, DEFAULT_SHOP_DETAILS } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ currentView, onOpenShortcuts, onOpenDrafts, draftCount = 0 }) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [totalDue, setTotalDue] = useState(0);
  const [dueCustomerCount, setDueCustomerCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shopDetails, setShopDetails] = useState(DEFAULT_SHOP_DETAILS);

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

    loadDues();
    loadShop();

    const handleShopUpdate = (e) => {
      if (e.detail) setShopDetails(e.detail);
    };

    window.addEventListener('volt_db_updated', loadDues);
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
    <header className="h-16 border-b border-slate-800 bg-dark-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-lg">
      {/* Brand Identity */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
          <Zap className="w-6 h-6 text-black fill-black" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-sans uppercase truncate max-w-[180px] sm:max-w-none">
              {shopDetails.shopName || 'VOLT ELECTRICALS'}
            </h1>
            <span className="text-[10px] sm:text-xs bg-amber-500/10 text-amber-400 font-mono px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
              POS v2.5
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono hidden md:block">
            {shopDetails.tagline || 'Power, Lighting & Hardware Billing Management System'}
          </p>
        </div>
      </div>

      {/* Center Live Clock & Due Summary Pill */}
      <div className="hidden lg:flex items-center space-x-4">
        {totalDue > 0 && (
          <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-full text-xs text-rose-300 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Pending Dues: <strong>{formatRupees(totalDue)}</strong> ({dueCustomerCount} customers)</span>
          </div>
        )}
        <div className="text-xs text-slate-400 font-mono bg-dark-800 px-3 py-1 rounded-md border border-slate-800">
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
            className="relative flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-dark-800 hover:bg-slate-800 text-slate-300 border border-slate-700 transition text-xs font-mono"
            title="Held Draft Bills"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Drafts</span>
            {draftCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black font-extrabold font-mono text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-md">
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
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-dark-800 hover:bg-slate-800 text-slate-300 border border-slate-700 transition text-xs font-mono"
            title="Counter Keyboard Hotkeys"
          >
            <Keyboard className="w-4 h-4 text-amber-400" />
            <span>Hotkeys</span>
          </button>
        )}

        {/* Theme Switcher Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-dark-800 hover:bg-slate-800 text-amber-400 border border-slate-700 transition"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* Connection Status Indicator */}
        <div className={`hidden md:flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full border font-mono font-medium ${
          isOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          {isOnline ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
          <span>{isOnline ? 'Live Cloud' : 'Offline'}</span>
        </div>

        {/* Lock POS Button */}
        <button
          type="button"
          onClick={logout}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition text-xs font-mono font-semibold"
          title="Lock POS Terminal"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Lock</span>
        </button>
      </div>
    </header>
  );
}
