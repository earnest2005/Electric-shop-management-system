import React, { useState, useEffect } from 'react';
import { Menu, Zap, Bell, User, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getShopDetails, getProducts, DEFAULT_SHOP_DETAILS } from '../../services/db';
import LowStockModal from '../LowStockModal';

export default function MobileHeader({ title, onOpenMenu }) {
  const { userRole, user } = useAuth();
  const [shopDetails, setShopDetails] = useState(DEFAULT_SHOP_DETAILS);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [products, setProducts] = useState([]);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      const shop = await getShopDetails();
      if (shop) setShopDetails(shop);
      const pr = await getProducts();
      setProducts(pr || []);
      const count = (pr || []).filter(p => (p.currentStock || 0) <= (p.minStockAlert || 10)).length;
      setLowStockCount(count);
    }
    loadData();

    const handleUpdate = async () => {
      const pr = await getProducts();
      setProducts(pr || []);
      const count = (pr || []).filter(p => (p.currentStock || 0) <= (p.minStockAlert || 10)).length;
      setLowStockCount(count);
    };

    window.addEventListener('volt_db_updated', handleUpdate);
    return () => window.removeEventListener('volt_db_updated', handleUpdate);
  }, []);

  return (
    <header className="h-14 bg-[#1E293B] border-b border-[#374151] px-4 flex items-center justify-between sticky top-0 z-40 shadow-sm font-sans shrink-0">
      {/* Left: Hamburger & Shop Logo */}
      <div className="flex items-center space-x-2.5">
        <button
          type="button"
          onClick={onOpenMenu}
          className="p-2 rounded-xl bg-[#273549] text-[#F3F4F6] border border-[#374151] active:scale-95 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-[#14B8A6] flex items-center justify-center shadow-sm shrink-0">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <h1 className="font-extrabold text-sm text-[#F3F4F6] uppercase tracking-tight truncate max-w-[140px]">
            {title || shopDetails.shopName || 'VOLT POS'}
          </h1>
        </div>
      </div>

      {/* Right: Low Stock Notification Bell & Profile Avatar */}
      <div className="flex items-center space-x-2">
        {lowStockCount > 0 && (
          <button
            type="button"
            onClick={() => setShowLowStockModal(true)}
            className="relative p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 active:scale-95 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
            title={`${lowStockCount} Low Stock Items`}
          >
            <Bell className="w-5 h-5 text-amber-400" />
            <span className="absolute -top-1 -right-1 bg-red-600 text-white font-mono text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {lowStockCount}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenMenu}
          className="w-9 h-9 rounded-xl bg-[#14B8A6] text-white flex items-center justify-center font-bold text-xs shadow-sm border border-teal-400/30 shrink-0"
          title={`User: ${user?.username || userRole}`}
        >
          {userRole === 'admin' ? <Shield className="w-4 h-4" /> : 'S'}
        </button>
      </div>

      {showLowStockModal && (
        <LowStockModal
          products={products}
          onClose={() => setShowLowStockModal(false)}
          onRefreshData={async () => {
            const pr = await getProducts();
            setProducts(pr || []);
          }}
        />
      )}
    </header>
  );
}
