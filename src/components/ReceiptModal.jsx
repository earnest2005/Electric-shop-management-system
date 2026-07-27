import React, { useState, useEffect } from 'react';
import { X, Printer, CheckCircle2, Zap, Phone, MapPin, User, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatRupees, formatNumberIN } from '../utils/currency';
import { getShopDetails, DEFAULT_SHOP_DETAILS } from '../services/db';
import { printReceiptHtml } from '../utils/print';

export default function ReceiptModal({ invoice, onClose }) {
  const [shopInfo, setShopInfo] = useState(DEFAULT_SHOP_DETAILS);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    async function loadShop() {
      const data = await getShopDetails();
      if (data) setShopInfo(data);
    }
    loadShop();

    // Prevent accidental instant closure (from Enter key press or double click) for 400ms after opening
    const guardTimer = setTimeout(() => {
      setCanClose(true);
    }, 400);

    // Close on Escape key press safely
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Trigger Celebration Confetti Papers Burst on Modal Pop-Up
    if (invoice) {
      setTimeout(() => {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { x: 0.3, y: 0.5 },
            colors: ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
          });
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { x: 0.7, y: 0.5 },
            colors: ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
          });
        } catch (e) {}
      }, 100);
    }

    return () => {
      clearTimeout(guardTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [invoice, onClose]);

  if (!invoice) return null;

  const handlePrint = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const receiptElem = document.getElementById('printable-receipt');
    if (receiptElem) {
      printReceiptHtml(receiptElem.outerHTML);
    } else {
      window.print();
    }
  };

  const handleSafeClose = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (canClose) {
      onClose();
    }
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
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 print:bg-transparent print:p-0 print:static print:block font-sans"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-[#273549] border border-[#374151] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:overflow-visible print:border-none print:shadow-none print:bg-white print:w-full print:block"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Action Bar (Hidden in Print) */}
        <div className="p-4 border-b border-[#374151] bg-[#1F2937] flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-extrabold text-[#F3F4F6] text-base">Invoice Generated</h3>
              <p className="text-[11px] text-[#9CA3AF] font-mono">#{invoice.billNumber}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT INVOICE</span>
            </button>
            <button
              type="button"
              onClick={handleSafeClose}
              className="p-2 text-[#9CA3AF] hover:text-[#F3F4F6] rounded-xl hover:bg-[#374151] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 overflow-y-auto font-sans bg-white text-slate-900 print:p-0 print:overflow-visible print:bg-white print:text-black" id="printable-receipt">
          {/* Shop Brand Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300 space-y-1">
            <div className="flex items-center justify-center space-x-2 text-blue-600 font-extrabold text-xl">
              <Zap className="w-6 h-6 fill-blue-600" />
              <span>{shopInfo.shopName || 'VOLT ELECTRICALS'}</span>
            </div>
            {shopInfo.tagline && (
              <p className="text-xs text-slate-600 font-medium">{shopInfo.tagline}</p>
            )}
            <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-center gap-2 pt-1">
              {shopInfo.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-600" /> {shopInfo.address}
                </span>
              )}
              {shopInfo.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-blue-600" /> {shopInfo.phone}
                </span>
              )}
            </div>
            {shopInfo.gstin && (
              <p className="text-[10px] text-slate-500 font-mono">GSTIN: {shopInfo.gstin}</p>
            )}
          </div>

          {/* Customer & Invoice Meta info */}
          <div className="py-3 border-b border-dashed border-slate-300 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600 font-mono">
              <span>Bill No: <strong className="text-slate-900">{invoice.billNumber}</strong></span>
              <span>Date: {invoice.timestamp ? new Date(invoice.timestamp).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" /> Customer: <strong className="text-slate-900">{custName}</strong>
              </span>
              <span className="font-mono">Mob: {custPhone}</span>
            </div>
            {custAddress && (
              <div className="text-[11px] text-slate-500 truncate">
                Address: {custAddress}
              </div>
            )}
            <div className="flex justify-between text-[11px] text-slate-500 pt-1">
              <span>Payment Mode: <strong className="text-blue-600 font-mono">{invoice.paymentMethod || 'CASH'}</strong></span>
              <span className="text-emerald-600 font-bold">STATUS: CONFIRMED</span>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="w-full text-xs my-3">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200 text-left font-mono">
                <th className="py-1.5">ITEM DESCRIPTION</th>
                <th className="text-center py-1.5">QTY</th>
                <th className="text-right py-1.5">RATE</th>
                <th className="text-right py-1.5">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {items.map((item, idx) => (
                <tr key={idx} className="py-1.5">
                  <td className="py-2 pr-2 font-sans font-medium text-slate-900">{item.productName}</td>
                  <td className="text-center py-2 text-blue-600 font-bold">{item.qty}</td>
                  <td className="text-right py-2">₹{formatNumberIN(item.unitPrice || item.basePrice || 0)}</td>
                  <td className="text-right py-2 font-bold text-slate-900">
                    ₹{formatNumberIN(item.total || ((item.unitPrice || item.basePrice || 0) * item.qty))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Totals */}
          <div className="py-3 border-t border-b border-dashed border-slate-300 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatRupees(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST (Included {shopInfo.defaultTaxPercent || 18}%):</span>
              <span>{formatRupees(taxAmount)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Discount Applied:</span>
                <span>-{formatRupees(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>NET TOTAL AMOUNT:</span>
              <span className="text-blue-600">{formatRupees(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-700 pt-1">
              <span>Amount Paid Now:</span>
              <span className="text-emerald-600 font-bold">{formatRupees(paidAmount)}</span>
            </div>

            {/* Outstanding Due Highlight */}
            {dueAmount > 0 ? (
              <div className="flex justify-between text-rose-800 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200 mt-2">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> Pending Due Balance:
                </span>
                <span className="text-rose-600">{formatRupees(dueAmount)}</span>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-center text-xs font-sans font-bold p-2 rounded-xl mt-2">
                ✓ FULLY PAID — NO DUES PENDING
              </div>
            )}
          </div>

          {/* Receipt Footer */}
          <div className="text-center pt-4 space-y-2">
            <div className="font-mono text-[10px] tracking-widest text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-200">
              ||| |||| ||||| || |||||| | ||||| |||| ||
              <div className="mt-0.5 text-[9px]">{invoice.billNumber}</div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              {shopInfo.invoiceFooterNote || "Thank you for shopping at Volt Electricals! Warranty valid against invoice."}
            </p>
          </div>
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="p-4 border-t border-[#374151] bg-[#1F2937] flex justify-end space-x-2 print:hidden">
          <button
            type="button"
            onClick={handleSafeClose}
            className="w-full py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-sm transition"
          >
            CLOSE & START NEW SALE
          </button>
        </div>
      </div>
    </div>
  );
}
