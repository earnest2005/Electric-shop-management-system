import React, { useState, useEffect } from 'react';
import { X, Printer, CheckCircle2, Zap, Phone, MapPin, User, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatRupees, formatNumberIN } from '../utils/currency';
import { getShopDetails, DEFAULT_SHOP_DETAILS } from '../services/db';

export default function ReceiptModal({ invoice, onClose }) {
  const [shopInfo, setShopInfo] = useState(DEFAULT_SHOP_DETAILS);

  useEffect(() => {
    async function loadShop() {
      const data = await getShopDetails();
      if (data) setShopInfo(data);
    }
    loadShop();

    // Trigger Celebration Confetti Papers Burst on Modal Pop-Up
    if (invoice) {
      setTimeout(() => {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { x: 0.3, y: 0.5 },
            colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ffffff']
          });
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { x: 0.7, y: 0.5 },
            colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ffffff']
          });
        } catch (e) {}
      }, 100);
    }
  }, [invoice]);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const custName = invoice.customer?.name || invoice.customerName || 'Walk-in Customer';
  const custPhone = invoice.customer?.phone || invoice.customerPhone || 'N/A';
  const custAddress = invoice.customer?.address || invoice.customerAddress || '';

  const subtotal = invoice.subtotal || 0;
  const taxAmount = invoice.taxAmount ?? invoice.tax ?? 0;
  const discountAmount = invoice.discountAmount ?? invoice.discounts ?? 0;
  const totalAmount = invoice.totalAmount || 0;
  const paidAmount = invoice.paidAmount || 0;
  const dueAmount = invoice.dueAmount || 0;
  const items = invoice.items || [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-dark-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Action Bar (Hidden in Print) */}
        <div className="p-4 border-b border-slate-800 bg-dark-800 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-extrabold text-white text-base">Invoice Generated</h3>
              <p className="text-[11px] text-slate-400 font-mono">#{invoice.billNumber}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-amber-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT INVOICE</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 overflow-y-auto font-sans bg-dark-900 text-slate-100" id="printable-receipt">
          {/* Shop Brand Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-700 space-y-1">
            <div className="flex items-center justify-center space-x-2 text-amber-400 font-extrabold text-xl">
              <Zap className="w-6 h-6 fill-amber-400" />
              <span>{shopInfo.shopName || 'VOLT ELECTRICALS'}</span>
            </div>
            {shopInfo.tagline && (
              <p className="text-xs text-slate-300 font-medium">{shopInfo.tagline}</p>
            )}
            <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-2 pt-1">
              {shopInfo.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400" /> {shopInfo.address}
                </span>
              )}
              {shopInfo.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-amber-400" /> {shopInfo.phone}
                </span>
              )}
            </div>
            {shopInfo.gstin && (
              <p className="text-[10px] text-slate-500 font-mono">GSTIN: {shopInfo.gstin}</p>
            )}
          </div>

          {/* Customer & Invoice Meta info */}
          <div className="py-3 border-b border-dashed border-slate-700 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-300 font-mono">
              <span>Bill No: <strong className="text-white">{invoice.billNumber}</strong></span>
              <span>Date: {invoice.timestamp ? new Date(invoice.timestamp).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-400" /> Customer: <strong className="text-white">{custName}</strong>
              </span>
              <span className="font-mono">Mob: {custPhone}</span>
            </div>
            {custAddress && (
              <div className="text-[11px] text-slate-400 truncate">
                Address: {custAddress}
              </div>
            )}
            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span>Payment Mode: <strong className="text-amber-400 font-mono">{invoice.paymentMethod || 'CASH'}</strong></span>
              <span className="text-emerald-400 font-bold">STATUS: CONFIRMED</span>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="w-full text-xs my-3">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-left font-mono">
                <th className="py-1.5">ITEM DESCRIPTION</th>
                <th className="text-center py-1.5">QTY</th>
                <th className="text-right py-1.5">RATE</th>
                <th className="text-right py-1.5">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
              {items.map((item, idx) => (
                <tr key={idx} className="py-1.5">
                  <td className="py-2 pr-2 font-sans font-medium text-white">{item.productName}</td>
                  <td className="text-center py-2 text-amber-400 font-bold">{item.qty}</td>
                  <td className="text-right py-2">₹{formatNumberIN(item.unitPrice || item.basePrice || 0)}</td>
                  <td className="text-right py-2 font-bold text-white">₹{formatNumberIN(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Totals */}
          <div className="py-3 border-t border-b border-dashed border-slate-700 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span>{formatRupees(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>GST (Included {shopInfo.defaultTaxPercent || 18}%):</span>
              <span>{formatRupees(taxAmount)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Discount Applied:</span>
                <span>-{formatRupees(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-white pt-1.5 border-t border-slate-800">
              <span>NET TOTAL AMOUNT:</span>
              <span className="text-amber-400">{formatRupees(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-200 pt-1">
              <span>Amount Paid Now:</span>
              <span className="text-emerald-400 font-bold">{formatRupees(paidAmount)}</span>
            </div>

            {/* Outstanding Due Highlight */}
            {dueAmount > 0 ? (
              <div className="flex justify-between text-rose-300 font-bold bg-rose-500/15 p-2.5 rounded-xl border border-rose-500/30 mt-2">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" /> Pending Due Balance:
                </span>
                <span className="text-rose-400">{formatRupees(dueAmount)}</span>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center text-xs font-sans font-bold p-2 rounded-xl mt-2">
                ✓ FULLY PAID — NO DUES PENDING
              </div>
            )}
          </div>

          {/* Receipt Footer */}
          <div className="text-center pt-4 space-y-2">
            <div className="font-mono text-[10px] tracking-widest text-slate-400 bg-slate-800/40 p-2 rounded-xl">
              ||| |||| ||||| || |||||| | ||||| |||| ||
              <div className="mt-0.5 text-[9px]">{invoice.billNumber}</div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              {shopInfo.invoiceFooterNote || "Thank you for shopping at Volt Electricals! Warranty valid against invoice."}
            </p>
          </div>
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="p-4 border-t border-slate-800 bg-dark-800 flex justify-end space-x-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow-lg transition"
          >
            CLOSE & START NEW SALE
          </button>
        </div>
      </div>
    </div>
  );
}
