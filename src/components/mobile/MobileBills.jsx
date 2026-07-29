import React, { useState, useEffect } from 'react';
import { FileText, Search, Printer, MessageSquare, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { formatRupees } from '../../utils/currency';
import { getPurchases } from '../../services/db';
import { sendInvoiceWhatsApp } from '../../services/whatsappService';
import { useAlert } from '../../context/AlertContext';
import WhatsAppPhoneBadge from '../WhatsAppPhoneBadge';

export default function MobileBills({ onViewReceipt }) {
  const { toast } = useAlert();
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBills();
    const handleUpdate = () => loadBills();
    window.addEventListener('volt_db_updated', handleUpdate);
    return () => window.removeEventListener('volt_db_updated', handleUpdate);
  }, []);

  async function loadBills() {
    setLoading(true);
    const data = await getPurchases();
    // Sort latest bill first
    const sorted = (data || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setBills(sorted);
    setLoading(false);
  }

  const filteredBills = bills.filter(b => {
    const custName = b.customer?.name || b.customerName || '';
    const billNum = b.billNumber || '';
    const phone = b.customer?.phone || b.customerPhone || '';
    return custName.toLowerCase().includes(search.toLowerCase()) ||
           billNum.toLowerCase().includes(search.toLowerCase()) ||
           phone.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-4 space-y-4 font-sans max-w-md mx-auto selection:bg-teal-500 selection:text-white">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#F3F4F6] font-sans flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#14B8A6]" /> Bill & Sales Records
          </h2>
          <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">
            {filteredBills.length} Completed Invoices
          </p>
        </div>
      </div>

      {/* Clean Mobile Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by invoice #, customer name, mobile..."
          className="w-full pl-11 pr-4 py-3 bg-[#1F2937] border border-[#374151] rounded-2xl text-sm text-[#F3F4F6] placeholder-[#9CA3AF] focus:outline-none focus:border-[#14B8A6] shadow-sm"
        />
      </div>

      {/* Stacked Bill Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#9CA3AF] font-mono">Loading bill history...</div>
        ) : filteredBills.length === 0 ? (
          <div className="p-8 text-center bg-[#1E293B] border border-[#374151] rounded-2xl text-xs text-[#9CA3AF] font-mono">
            No sales invoices match your search.
          </div>
        ) : (
          filteredBills.map((b) => {
            const custName = b.customer?.name || b.customerName || 'Walk-in Customer';
            const custPhone = b.customer?.phone || b.customerPhone || '';
            const dueAmount = b.dueAmount || 0;
            const formattedDate = b.timestamp 
              ? new Date(b.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Recent';

            return (
              <div 
                key={b.id || b.billNumber}
                className="bg-[#1E293B] border border-[#374151] rounded-2xl p-4 shadow-sm space-y-3"
              >
                {/* Bill Header: Invoice # & Date */}
                <div className="flex items-center justify-between border-b border-[#374151] pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-[#14B8A6] bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
                      #{b.billNumber}
                    </span>
                    <span className="text-xs font-mono text-[#9CA3AF]">{formattedDate}</span>
                  </div>

                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#273549] text-[#F3F4F6] border border-[#374151] rounded">
                    {b.paymentMethod || 'Cash'}
                  </span>
                </div>

                {/* Customer & Amount Details */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#F3F4F6]">
                      {custName}
                    </h4>
                    {custPhone && <WhatsAppPhoneBadge phone={custPhone} />}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[#9CA3AF] font-mono block">TOTAL AMOUNT</span>
                    <strong className="text-base font-mono font-extrabold text-emerald-400">
                      {formatRupees(b.totalAmount || 0)}
                    </strong>
                  </div>
                </div>

                {/* Min 48px Touch Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => sendInvoiceWhatsApp(b, toast)}
                    className="min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WHATSAPP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onViewReceipt && onViewReceipt(b)}
                    className="min-h-[48px] bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <Eye className="w-4 h-4" />
                    <span>VIEW RECEIPT</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
