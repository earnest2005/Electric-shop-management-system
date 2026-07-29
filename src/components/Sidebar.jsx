import React, { useState, useEffect } from 'react';
import { ShoppingBag, Users, Package, Receipt, LayoutDashboard, Settings, Zap, AlertTriangle, Tag, FileText, TrendingUp, LogOut, Shield, X } from 'lucide-react';
import { getCustomers } from '../services/db';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentView, setCurrentView, isMobileOpen, setIsMobileOpen }) {
  const { userRole, logout, user } = useAuth();
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

  // Prevent background body scrolling when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const adminNavItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'customer-records', label: 'Customer Records', icon: Users },
    { id: 'bill-records', label: 'Bill Records', icon: FileText },
    { id: 'offers', label: 'Offers & Promotions', icon: Tag },
    { id: 'reports', label: 'Reports & Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Shop Settings', icon: Settings },
  ];

  const staffNavItems = [
    { id: 'staff-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'POS Billing', icon: ShoppingBag, badge: 'POS' },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'history', label: 'Sales History', icon: Receipt },
    { id: 'dues', label: 'Customer Ledger', icon: Users, alertCount: dueCount },
    { id: 'active-offers', label: 'Active Offers', icon: Tag },
  ];

  const navItems = userRole === 'admin' ? adminNavItems : staffNavItems;

  const handleNavClick = (id) => {
    setCurrentView(id);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  const renderNavContent = () => (
    <div className="flex flex-col justify-between h-full space-y-4 font-sans">
      <div className="space-y-4">
        {/* User Role Profile Card Header */}
        <div className="p-3.5 rounded-xl border border-[#374151] bg-[#1F2937]/80 flex items-center space-x-3 text-[#F3F4F6]">
          <div className="w-9 h-9 rounded-lg bg-[#14B8A6] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
            {userRole === 'admin' ? <Shield className="w-5 h-5" /> : 'S'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-mono uppercase font-bold text-[#F3F4F6] tracking-wider">
              {userRole === 'admin' ? 'ADMIN PORTAL' : 'STAFF PORTAL'}
            </div>
            <div className="text-[11px] text-[#9CA3AF] font-mono truncate">
              User: {user?.username || userRole}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider font-mono">
            Navigation Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 min-h-[48px] ${
                  isActive
                    ? 'bg-[#14B8A6] text-white font-bold shadow-sm'
                    : 'text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#273549]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#9CA3AF]'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-white/20 text-white' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {item.alertCount > 0 && (
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isActive ? 'bg-red-700 text-white' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    <AlertTriangle className="w-3 h-3" />
                    {item.alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer with Logout button */}
      <div className="space-y-3 pt-4 border-t border-[#374151]">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-3.5 py-3 rounded-xl text-xs font-mono font-bold text-red-400 hover:bg-red-500/10 border border-red-500/20 transition min-h-[48px]"
        >
          <LogOut className="w-4 h-4" />
          <span>LOGOUT TERMINAL</span>
        </button>

        <div className="p-3 rounded-xl bg-[#1F2937]/80 border border-[#374151] space-y-1 text-center">
          <div className="flex items-center justify-center space-x-1 text-[#14B8A6] text-[10px] font-mono font-semibold">
            <Zap className="w-3.5 h-3.5 fill-[#14B8A6]" />
            <span>VOLT POS SYSTEM</span>
          </div>
          <p className="text-[10px] text-[#9CA3AF] font-mono">
            Role: {userRole?.toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent on lg screens 1024px+) */}
      <aside className="w-64 bg-[#18212F] border-r border-[#374151] p-4 hidden lg:flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] text-[#F3F4F6]">
        {renderNavContent()}
      </aside>

      {/* Mobile / Tablet Drawer Overlay (Slide-out on screens <1024px) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Sidebar Content */}
          <aside className="relative w-72 max-w-[85vw] bg-[#18212F] border-r border-[#374151] p-4 flex flex-col justify-between z-10 shadow-2xl overflow-y-auto text-[#F3F4F6]">
            <div className="flex items-center justify-between border-b border-[#374151] pb-3 mb-2">
              <div className="flex items-center space-x-2 text-[#14B8A6] font-mono text-xs font-bold">
                <Zap className="w-4 h-4 fill-[#14B8A6]" />
                <span>VOLT POS MENU</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#F3F4F6] bg-[#273549] border border-[#374151] min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavContent()}
          </aside>
        </div>
      )}

      {/* Mobile Bottom Quick Touch Navigation Bar (< 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#18212F] border-t border-[#374151] z-40 px-1 py-1 flex items-center justify-around overflow-x-auto shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center justify-center rounded-xl transition shrink-0 px-2 py-1.5 min-w-[60px] min-h-[48px] ${
                isActive 
                  ? 'text-white bg-[#14B8A6] font-bold shadow-sm' 
                  : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-mono truncate max-w-[64px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        <button
          onClick={logout}
          className="flex flex-col items-center justify-center rounded-xl text-red-400 shrink-0 px-2 py-1.5 min-w-[56px] min-h-[48px] hover:bg-red-500/10"
          title="Logout"
        >
          <LogOut className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-mono">Exit</span>
        </button>
      </nav>
    </>
  );
}

