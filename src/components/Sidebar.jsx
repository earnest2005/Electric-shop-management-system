import React, { useState, useEffect } from 'react';
import { ShoppingBag, Users, Package, Receipt, LayoutDashboard, Settings, Zap, AlertTriangle } from 'lucide-react';
import { getCustomers } from '../services/db';

export default function Sidebar({ currentView, setCurrentView }) {
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    const updateDueBadge = async () => {
      const customers = await getCustomers();
      const count = customers.filter(c => (c.totalDue || 0) > 0).length;
      setDueCount(count);
    };
    updateDueBadge();
    window.addEventListener('volt_db_updated', updateDueBadge);
    return () => window.removeEventListener('volt_db_updated', updateDueBadge);
  }, []);

  const navItems = [
    { id: 'pos', label: 'Active POS Billing', icon: ShoppingBag, badge: 'LIVE' },
    { id: 'dues', label: 'Customer Dues Ledger', icon: Users, alertCount: dueCount },
    { id: 'inventory', label: 'Inventory Master', icon: Package },
    { id: 'history', label: 'Sales & Invoices', icon: Receipt },
    { id: 'analytics', label: 'Dashboard & Reports', icon: LayoutDashboard },
    { id: 'settings', label: 'Shop Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-dark-900/60 border-r border-slate-800 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)]">
        <div className="space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
            Main Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500 text-black font-semibold shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-dark-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-black text-amber-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {item.alertCount > 0 && (
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isActive ? 'bg-rose-900 text-white' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    <AlertTriangle className="w-3 h-3" />
                    {item.alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Electrical Shop Info Box */}
        <div className="p-3.5 rounded-xl bg-dark-800/80 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold">
            <Zap className="w-4 h-4 fill-amber-400" />
            <span>COMMERCIAL POS ENGINE</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Real-Time Cloud Firestore Sync with zero UI buffering and 100% Paise precision.
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-900 border-t border-slate-800 z-40 px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center p-1.5 rounded-lg text-[10px] font-medium transition ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[50px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
