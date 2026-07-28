import React, { useState, useEffect } from 'react';
import { X, Printer, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatNumberIN } from '../utils/currency';
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

    // Prevent accidental instant closure for 400ms after opening
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

    // Trigger Celebration Confetti Burst on Modal Pop-Up
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
  const custAddress = invoice.customer?.address || invoice.customerAddress || 'Local Store';

  const subtotal = invoice.subtotal || 0;
  const taxAmount = invoice.taxAmount ?? invoice.tax ?? 0;
  const discountAmount = invoice.discountAmount ?? invoice.discounts ?? 0;
  const totalAmount = invoice.totalAmount || 0;
  const paidAmount = invoice.paidAmount || 0;
  const dueAmount = invoice.dueAmount || 0;
  const items = invoice.items || [];

  const cashReceived = invoice.cashReceived;
  const changeReturned = invoice.changeReturned;

  const formattedDate = invoice.timestamp 
    ? new Date(invoice.timestamp).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 print:bg-transparent print:p-0 print:static print:block font-mono"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-[#273549] border border-[#374151] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:overflow-visible print:border-none print:shadow-none print:bg-white print:w-full print:block"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Action Bar (Hidden in Print) */}
        <div className="p-4 border-b border-[#374151] bg-[#1F2937] flex items-center justify-between print:hidden font-sans">
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
              <span>PRINT RECEIPT</span>
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

        {/* Printable Thermal Receipt (80mm / 58mm target) */}
        <div 
          className="p-4 bg-white text-black font-mono text-[11px] leading-tight overflow-y-auto print:p-0 print:overflow-visible print:bg-white print:text-black select-text" 
          id="printable-receipt"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}
        >
          {/* HEADER (Centered) */}
          <div className="text-center pb-2 border-b border-black space-y-1">
            <div className="font-extrabold text-base tracking-tight uppercase">
              {shopInfo.shopName || 'VOLT ELECTRICALS'}
            </div>
            <div className="text-[11px] font-bold">
              {shopInfo.tagline || 'Power, Lighting & Hardware Store'}
            </div>
            <div className="text-[10px] whitespace-pre-line leading-tight">
              {shopInfo.address || 'Main Market Road,\nElectrical Substation,\nSector 4'}
            </div>
            <div className="text-[10px] pt-0.5 space-y-0.5">
              <div>Phone : {shopInfo.phone || '+91 9876543210'}</div>
              <div>GSTIN : {shopInfo.gstin || '07AAAAA0000A1Z5'}</div>
            </div>
          </div>

          {/* INVOICE DETAILS (Two-Column Layout) */}
          <div className="py-2 border-b border-black text-[11px] space-y-1">
            <div className="flex justify-between">
              <span>Invoice No : <strong>{invoice.billNumber}</strong></span>
              <span>Date : <strong>{formattedDate}</strong></span>
            </div>
            <div className="flex justify-between">
              <span>Cashier    : <strong>{invoice.staffName || invoice.staff || 'Staff'}</strong></span>
              <span>Payment : <strong>{invoice.paymentMethod || 'Cash'}</strong></span>
            </div>
          </div>

          {/* CUSTOMER DETAILS */}
          <div className="py-2 border-b border-black text-[11px] space-y-1">
            <div>Customer : <strong>{custName}</strong></div>
            <div>Mobile   : <strong>{custPhone}</strong></div>
            <div>Address  : <strong>{custAddress}</strong></div>
          </div>

          {/* ITEM TABLE (Fixed Width Columns & Exact Alignment) */}
          <div className="py-2 border-b border-black">
            <table className="w-full text-[11px] border-collapse font-mono">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="py-1 text-left" style={{ width: '45%' }}>ITEM</th>
                  <th className="py-1 text-center" style={{ width: '12%' }}>QTY</th>
                  <th className="py-1 text-right" style={{ width: '21%' }}>RATE</th>
                  <th className="py-1 text-right" style={{ width: '22%' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {items.map((item, idx) => {
                  const rate = item.unitPrice || item.basePrice || 0;
                  const lineTotal = item.total || (rate * item.qty);
                  return (
                    <tr key={idx} className="align-top">
                      <td className="py-1 pr-1 break-words font-medium">
                        {item.productName}
                      </td>
                      <td className="py-1 text-center font-bold">
                        {item.qty}
                      </td>
                      <td className="py-1 text-right whitespace-nowrap">
                        ₹{formatNumberIN(rate)}
                      </td>
                      <td className="py-1 text-right font-bold whitespace-nowrap">
                        ₹{formatNumberIN(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* TOTALS (Right Aligned Amounts) */}
          <div className="py-2 border-b border-black text-[11px] space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{formatNumberIN(subtotal)}</span>
            </div>

            {taxAmount > 0 && (
              <div className="flex justify-between">
                <span>GST ({shopInfo.defaultTaxPercent || 18}%)</span>
                <span>₹{formatNumberIN(taxAmount)}</span>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-₹{formatNumberIN(discountAmount)}</span>
              </div>
            )}

            <div className="border-t border-black pt-1 flex justify-between text-xs font-black">
              <span>NET TOTAL</span>
              <span>₹{formatNumberIN(totalAmount)}</span>
            </div>

            <div className="flex justify-between">
              <span>Amount Paid</span>
              <span>₹{formatNumberIN(paidAmount)}</span>
            </div>

            <div className="flex justify-between">
              <span>Balance Due</span>
              <span>₹{formatNumberIN(dueAmount)}</span>
            </div>

            <div className="pt-1 text-center">
              {dueAmount <= 0 ? (
                <div className="py-1 font-bold border border-black rounded text-center">
                  ✓ FULLY PAID
                </div>
              ) : (
                <div className="py-1 font-bold border border-black rounded text-center">
                  Pending Due : ₹{formatNumberIN(dueAmount)}
                </div>
              )}
            </div>
          </div>

          {/* PAYMENT BREAKDOWN */}
          <div className="py-2 border-b border-black text-[11px] space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Payment Mode :</span>
              <strong>{invoice.paymentMethod || 'Cash'}</strong>
            </div>

            {cashReceived !== undefined && cashReceived !== null && cashReceived > 0 && (
              <div className="flex justify-between">
                <span>Cash Received :</span>
                <strong>₹{formatNumberIN(cashReceived)}</strong>
              </div>
            )}

            {changeReturned !== undefined && changeReturned > 0 && (
              <div className="flex justify-between">
                <span>Change Return :</span>
                <strong>₹{formatNumberIN(changeReturned)}</strong>
              </div>
            )}
          </div>

          {/* FOOTER & BARCODE */}
          <div className="pt-2 text-center font-mono space-y-1.5">
            <div className="text-[11px] font-bold">Thank you for shopping with us!</div>
            <div className="text-[10px]">Goods once sold cannot be returned.</div>
            <div className="text-[11px] font-bold">Visit Again</div>

            {/* BARCODE */}
            <div className="pt-2">
              <div className="text-xs tracking-widest font-bold">
                ||| |||| ||||| || |||||| | ||||| |||| ||
              </div>
              <div className="text-[10px] font-bold mt-0.5">
                {invoice.billNumber}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Footer (Hidden in Print) */}
        <div className="p-4 border-t border-[#374151] bg-[#1F2937] flex justify-end space-x-2 print:hidden font-sans">
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
