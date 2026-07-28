import React, { useState } from 'react';
import { AlertTriangle, Package, X, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { formatRupees } from '../utils/currency';
import { saveProduct } from '../services/db';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';

export default function LowStockModal({ products, onClose, onRefreshData }) {
  const { userRole } = useAuth();
  const { toast } = useAlert();
  const isAdmin = userRole === 'admin';

  const [restockQtyMap, setRestockQtyMap] = useState({});
  const [updatingId, setUpdatingId] = useState(null);

  // Filter low stock products (currentStock <= minStockAlert)
  const lowStockItems = products
    .filter(p => (p.currentStock || 0) <= (p.minStockAlert || 10))
    .sort((a, b) => (a.currentStock || 0) - (b.currentStock || 0));

  const handleRestock = async (product) => {
    if (!isAdmin) {
      toast.error("Permission Denied: Staff members cannot modify product stock.", "Restock Blocked");
      return;
    }

    const addQty = parseInt(restockQtyMap[product.barcode || product.id] || '50', 10);
    if (isNaN(addQty) || addQty <= 0) {
      toast.error("Please enter a valid positive restock quantity.", "Invalid Quantity");
      return;
    }

    setUpdatingId(product.barcode || product.id);
    try {
      const newStock = (product.currentStock || 0) + addQty;
      await saveProduct({
        ...product,
        currentStock: newStock
      });

      toast.success(`Restocked ${product.productName} by +${addQty} units (New total: ${newStock})`, "Restock Successful");
      if (onRefreshData) onRefreshData();
      setRestockQtyMap(prev => ({ ...prev, [product.barcode || product.id]: '' }));
    } catch (e) {
      toast.error("Failed to update stock: " + e.message, "Restock Error");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#1F2937] border border-[#374151] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0">
        
        {/* Header */}
        <div className="p-4 bg-[#111827] border-b border-[#374151] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl border ${
              isAdmin ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#F3F4F6] text-base font-sans flex items-center gap-2">
                <span>{isAdmin ? '🔴 Low Stock Restock Manager' : '⚠️ Low Stock Counter Notice'}</span>
                <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-mono border border-red-500/30 font-bold">
                  {lowStockItems.length} Items
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {isAdmin ? 'Review inventory alerts & quickly add restock units' : 'Read-only low stock alert list for store cashiers'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-[#1F2937] hover:bg-[#374151] rounded-xl border border-[#374151] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 max-h-[420px] overflow-y-auto space-y-2">
          {lowStockItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-emerald-300 font-mono">All inventory stock levels are healthy!</p>
              <p className="text-xs text-slate-400 font-mono">Zero products are currently below reorder thresholds.</p>
            </div>
          ) : (
            lowStockItems.map(prod => {
              const isOut = (prod.currentStock || 0) === 0;
              const prodId = prod.barcode || prod.id;
              return (
                <div
                  key={prodId}
                  className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono ${
                    isOut
                      ? 'bg-red-950/30 border-red-500/50 shadow-inner'
                      : 'bg-[#111827] border-[#374151] hover:border-amber-500/40'
                  }`}
                >
                  {/* Left Product Info */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[#F3F4F6] font-sans text-sm truncate">{prod.productName}</span>
                      {isOut && (
                        <span className="bg-red-600 text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded animate-pulse">
                          CRITICAL OUT OF STOCK
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                      <span>Code: <strong className="text-teal-300">{prod.productCode || prod.barcode}</strong></span>
                      <span>Cat: <strong className="text-slate-300">{prod.category}</strong></span>
                      <span>Brand: <strong className="text-slate-300">{prod.brand || 'General'}</strong></span>
                      <span>Last Updated: <strong className="text-slate-300">{prod.updatedAt ? new Date(prod.updatedAt).toLocaleDateString('en-IN') : 'Recent'}</strong></span>
                    </div>
                  </div>

                  {/* Stock Pill & Action */}
                  <div className="flex items-center space-x-3 shrink-0 justify-between sm:justify-end">
                    <div className="text-right">
                      <div className={`font-black text-sm ${isOut ? 'text-red-400' : 'text-amber-400'}`}>
                        {prod.currentStock || 0} / {prod.minStockAlert || 10} units
                      </div>
                      <div className="text-[10px] text-slate-500">Available / Minimum</div>
                    </div>

                    {/* Admin Restock Control */}
                    {isAdmin ? (
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="number"
                          placeholder="+Qty"
                          value={restockQtyMap[prodId] ?? ''}
                          onChange={e => setRestockQtyMap({ ...restockQtyMap, [prodId]: e.target.value })}
                          className="w-16 bg-[#1F2937] border border-[#374151] rounded-lg px-2 py-1 text-xs text-center font-bold text-teal-300 focus:border-teal-400 focus:outline-none"
                        />
                        <button
                          onClick={() => handleRestock(prod)}
                          disabled={updatingId === prodId}
                          className="px-3 py-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-extrabold rounded-lg text-xs transition shadow flex items-center space-x-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${updatingId === prodId ? 'animate-spin' : ''}`} />
                          <span>Restock</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] bg-[#1F2937] text-slate-400 px-2.5 py-1 rounded-lg border border-[#374151] font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-amber-400" /> Read-Only
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#111827] border-t border-[#374151] flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400">
            {isAdmin ? '💡 Changes instantly update Firestore database' : '🔒 Restock permissions restricted to Store Admin'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1F2937] hover:bg-[#374151] text-slate-200 font-bold rounded-xl border border-[#374151] transition"
          >
            Close Alert
          </button>
        </div>

      </div>
    </div>
  );
}
