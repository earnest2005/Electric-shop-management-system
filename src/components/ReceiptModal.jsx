import React, { useState, useEffect } from 'react';
import { X, Printer, CheckCircle, Zap, Phone, MapPin, User, AlertCircle } from 'lucide-react';
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
  }, []);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Top Actions Header (Hidden in Print) */}
        <div className="p-4 border-b border-slate-800 bg-dark-800 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Sales Receipt #{invoice.billNumber}</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-amber-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT RECEIPT</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div className="p-6 overflow-y-auto font-sans" id="printable-receipt">
          {/* Receipt Shop Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-700">
            <div className="flex items-center justify-center space-x-2 text-amber-400 font-extrabold text-xl">
              <Zap className="w-5 h-5 fill-amber-400" />
              <span>{shopInfo.shopName || 'VOLT ELECTRICALS'}</span>
            </div>
            {shopInfo.tagline && (
              <p className="text-xs text-slate-300 font-medium">{shopInfo.tagline}</p>
            )}
            {shopInfo.address && (
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-slate-400" /> {shopInfo.address}
              </p>
            )}
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" /> {shopInfo.phone || '+91 98765 00000'} {shopInfo.gstin ? `| GSTIN: ${shopInfo.gstin}` : ''}
            </p>
          </div>

          {/* Customer & Invoice Meta */}
          <div className="py-3 border-b border-dashed border-slate-700 text-xs space-y-1">
            <div className="flex justify-between text-slate-300 font-mono">
              <span>Invoice No: <strong>{invoice.billNumber}</strong></span>
              <span>Date: {new Date(invoice.timestamp).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-amber-400" /> Customer: <strong>{invoice.customerName}</strong>
              </span>
              <span>Ph: {invoice.customerPhone}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Payment Mode: <span className="text-amber-300 font-semibold">{invoice.paymentMethod}</span>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="w-full text-xs py-3 border-b border-dashed border-slate-700 my-2">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-left">
                <th className="py-1">Item</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Rate</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono text-slate-200">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="py-1">
                  <td className="py-1.5 pr-2 font-sans font-medium text-slate-100">{item.productName}</td>
                  <td className="text-center py-1.5">{item.qty}</td>
                  <td className="text-right py-1.5">₹{formatNumberIN(item.basePrice)}</td>
                  <td className="text-right py-1.5 font-bold">₹{formatNumberIN(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Summary */}
          <div className="py-3 border-b border-dashed border-slate-700 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-300">
              <span>Subtotal:</span>
              <span>{formatRupees(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>GST (Included {shopInfo.defaultTaxPercent || 18}%):</span>
              <span>{formatRupees(invoice.tax)}</span>
            </div>
            {invoice.discounts > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount Applied:</span>
                <span>-{formatRupees(invoice.discounts)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-slate-800">
              <span>TOTAL AMOUNT:</span>
              <span className="text-amber-400">{formatRupees(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-200 pt-1">
              <span>Amount Paid Now:</span>
              <span className="text-emerald-400 font-bold">{formatRupees(invoice.paidAmount)}</span>
            </div>

            {/* Outstanding Due Highlight */}
            {invoice.dueAmount > 0 ? (
              <div className="flex justify-between text-rose-300 font-bold bg-rose-500/10 p-2 rounded border border-rose-500/30 mt-2">
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-rose-400" /> Pending Due Balance:
                </span>
                <span>{formatRupees(invoice.dueAmount)}</span>
              </div>
            ) : (
              <div className="text-emerald-400 text-center text-[11px] font-sans font-semibold pt-1">
                ✓ FULLY PAID - NO DUES PENDING
              </div>
            )}
          </div>

          {/* Barcode & Thank You Footer */}
          <div className="text-center pt-4 space-y-2">
            <div className="font-mono text-[10px] tracking-widest text-slate-400 bg-slate-800/40 p-2 rounded">
              ||| |||| ||||| || |||||| | ||||| |||| ||
              <div>{invoice.billNumber}</div>
            </div>
            <p className="text-[11px] text-slate-400 font-sans italic">
              {shopInfo.invoiceFooterNote || "Thank you for shopping at Volt Electricals! Warranty valid against invoice."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
