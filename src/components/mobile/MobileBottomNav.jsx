import React from 'react';
import { LayoutDashboard, Package, Users, FileText, Menu, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MobileBottomNav({ currentView, onNavigate, onOpenMore }) {
  const { userRole } = useAuth();

  const primaryDashboard = userRole === 'admin' ? 'admin-dashboard' : 'staff-dashboard';
  const customerView = userRole === 'admin' ? 'customer-records' : 'dues';
  const billView = userRole === 'admin' ? 'bill-records' : 'history';

  const tabs = [
    { id: primaryDashboard, label: 'Dashboard', icon: LayoutDashboard },
    { id: userRole === 'staff' ? 'pos' : 'inventory', label: userRole === 'staff' ? 'POS' : 'Inventory', icon: userRole === 'staff' ? ShoppingBag : Package },
    { id: customerView, label: 'Customers', icon: Users },
    { id: billView, label: 'Bills', icon: FileText },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#18212F] border-t border-[#374151] z-40 px-2 flex items-center justify-around shadow-2xl font-sans">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onNavigate(tab.id)}
            className={`flex flex-col items-center justify-center rounded-xl transition flex-1 py-1 min-h-[48px] ${
              isActive 
                ? 'text-white bg-[#14B8A6] font-bold shadow-md' 
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-mono tracking-tight">{tab.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center rounded-xl transition flex-1 py-1 min-h-[48px] text-[#9CA3AF] hover:text-[#F3F4F6]"
      >
        <Menu className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] font-mono tracking-tight">More</span>
      </button>
    </nav>
  );
}
