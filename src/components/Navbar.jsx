import React, { useState, useEffect } from 'react';
import { Zap, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { isRealFirebase } from '../firebase/config';
import { formatRupees } from '../utils/currency';
import { getCustomers, getShopDetails, DEFAULT_SHOP_DETAILS } from '../services/db';

export default function Navbar({ currentView }) {
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
    <header className="h-16 border-b border-slate-800 bg-dark-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 shadow-lg">
      {/* Brand Identity */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Zap className="w-6 h-6 text-black fill-black" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-extrabold text-xl tracking-tight text-white font-sans uppercase">
              {shopDetails.shopName || 'VOLT ELECTRICALS'}
            </h1>
            <span className="text-xs bg-amber-500/10 text-amber-400 font-mono px-2 py-0.5 rounded border border-amber-500/20">
              ACTIVE POS v2.4
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono hidden sm:block">
            {shopDetails.tagline || 'Power, Lighting & Hardware Billing Management System'}
          </p>
        </div>
      </div>

      {/* Center Live Clock & Due Summary Pill */}
      <div className="hidden md:flex items-center space-x-4">
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

      {/* Right System Connection Status Indicator */}
      <div className="flex items-center space-x-3">
        <div className={`flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full border font-mono font-medium ${
          isOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          {isOnline ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
          <span>
            {isOnline ? 'Cloud Firestore Active' : 'Offline Mode'}
          </span>
        </div>
      </div>
    </header>
  );
}
