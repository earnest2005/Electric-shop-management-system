import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Filter, Download, Printer, Eye, Calendar, 
  DollarSign, User, RefreshCw, CreditCard, CheckCircle2
} from 'lucide-react';
import { formatRupees, formatNumberIN } from '../utils/currency';
import { getPurchases } from '../services/db';
import { exportSalesCSV, exportToCSV } from '../utils/exporter';
import ReceiptModal from '../components/ReceiptModal';

export default function BillRecords() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Receipt Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const pList = await getPurchases();
    setPurchases(pList);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('volt_db_updated', loadData);
    return () => window.removeEventListener('volt_db_updated', loadData);
  }, []);

  const staffNames = Array.from(
    new Set(purchases.map(p => p.staffName || p.staff || 'Staff').filter(Boolean))
  );

  const filteredPurchases = purchases.filter(p => {
    const query = searchQuery.toLowerCase().trim();
    const billNum = (p.billNumber || p.id || '').toLowerCase();
    const custName = (p.customer?.name || p.customerName || '').toLowerCase();
    const custPhone = (p.customer?.phone || p.customerPhone || '').replace(/\D/g, '');

    const matchQuery = 
      !query ||
      billNum.includes(query) ||
      custName.includes(query) ||
      custPhone.includes(query);

    const matchStaff = 
      staffFilter === 'ALL' ||
      (p.staffName || p.staff || 'Staff') === staffFilter;

    const matchPayment = 
      paymentFilter === 'ALL' ||
      (p.paymentMethod || 'CASH') === paymentFilter;

    const matchDate = 
      !dateFilter ||
      (p.timestamp && p.timestamp.slice(0, 10) === dateFilter);

    return matchQuery && matchStaff && matchPayment && matchDate;
  });

  const handleExportCSV = () => {
    exportSalesCSV(filteredPurchases);
  };

  const totalFilteredAmount = filteredPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Header */}
      <div className="bg-[#273549] p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 border border-[#374151] shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-500/10 text-[#14B8A6] rounded-2xl border border-teal-500/20">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-[#F3F4F6] tracking-tight font-sans">
              All Sales Bill Records
            </h2>
            <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">
              Complete invoice registry with staff attribution, itemized lists, and receipt printing
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT BILLS CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#273549] p-4 rounded-2xl border border-[#374151] shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Bill #, Customer, Phone..."
            className="w-full glass-input pl-10 pr-4 py-2 rounded-xl text-xs font-mono border-[#374151] focus:border-[#14B8A6]"
          />
        </div>

        {/* Staff Filter */}
        <select
          value={staffFilter}
          onChange={e => setStaffFilter(e.target.value)}
          className="glass-input px-3 py-2 rounded-xl text-xs font-mono text-[#F3F4F6] bg-[#1F2937] border-[#374151]"
        >
          <option value="ALL">Filter Staff: All Staff</option>
          {staffNames.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Payment Filter */}
        <select
          value={paymentFilter}
          onChange={e => setPaymentFilter(e.target.value)}
          className="glass-input px-3 py-2 rounded-xl text-xs font-mono text-[#F3F4F6] bg-[#1F2937] border-[#374151]"
        >
          <option value="ALL">Payment Method: All</option>
          <option value="CASH">CASH</option>
          <option value="UPI">UPI / QR</option>
          <option value="CARD">CARD</option>
          <option value="CREDIT">STORE CREDIT</option>
        </select>

        {/* Date Filter */}
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="glass-input px-3 py-2 rounded-xl text-xs font-mono text-[#F3F4F6] bg-[#1F2937] border-[#374151]"
        />
      </div>

      {/* Bills Summary Header Bar */}
      <div className="bg-[#273549] border border-[#374151] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#9CA3AF] gap-2 shadow-sm">
        <div>
          Showing <strong className="text-[#F3F4F6]">{filteredPurchases.length}</strong> invoices matching criteria
        </div>
        <div className="text-[#14B8A6] font-extrabold text-sm">
          Filtered Revenue: {formatRupees(totalFilteredAmount)}
        </div>
      </div>

      {/* Bills Table (Desktop) & Touch Cards (Mobile) */}
      <div className="bg-[#273549] rounded-2xl overflow-hidden border border-[#374151] shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#1F2937] text-[#9CA3AF] font-mono border-b border-[#374151]">
                <th className="p-3.5">BILL NUMBER</th>
                <th className="p-3.5">DATE & TIME</th>
                <th className="p-3.5">CUSTOMER DETAILS</th>
                <th className="p-3.5 text-center">PAYMENT</th>
                <th className="p-3.5 text-center">STAFF MEMBER</th>
                <th className="p-3.5 text-right">TOTAL AMOUNT</th>
                <th className="p-3.5 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151] font-mono text-[#F3F4F6]">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#9CA3AF]">
                    No bill records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(bill => (
                  <tr key={bill.id || bill.billNumber} className="hover:bg-[#1F2937]/60 transition">
                    <td className="p-3.5 font-bold text-[#F3F4F6]">
                      {bill.billNumber}
                    </td>

                    <td className="p-3.5 text-[#9CA3AF] text-[11px]">
                      {bill.timestamp ? new Date(bill.timestamp).toLocaleString('en-IN') : 'N/A'}
                    </td>

                    <td className="p-3.5 font-sans">
                      <div className="font-bold text-[#F3F4F6]">{bill.customer?.name || bill.customerName || 'Walk-in'}</div>
                      <div className="text-[10px] text-[#14B8A6] font-mono">📱 {bill.customer?.phone || bill.customerPhone || 'N/A'}</div>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                        {bill.paymentMethod || 'CASH'}
                      </span>
                    </td>

                    <td className="p-3.5 text-center text-[#F3F4F6] font-bold">
                      👤 {bill.staffName || bill.staff || 'Staff'}
                    </td>

                    <td className="p-3.5 text-right font-extrabold text-[#14B8A6] text-sm">
                      {formatRupees(bill.totalAmount)}
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedInvoice(bill)}
                        className="px-3 py-1.5 bg-[#1F2937] hover:bg-[#374151] text-[#14B8A6] border border-[#374151] rounded-xl transition text-[11px] font-bold inline-flex items-center space-x-1 min-h-[36px]"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Touch Cards View */}
        <div className="md:hidden p-3 space-y-3">
          {filteredPurchases.length === 0 ? (
            <div className="py-12 text-center text-[#9CA3AF] font-mono text-xs">
              No bill records found matching your filters.
            </div>
          ) : (
            filteredPurchases.map(bill => (
              <div key={bill.id || bill.billNumber} className="bg-[#1F2937] border border-[#374151] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-[#14B8A6] font-mono text-sm">{bill.billNumber}</div>
                  <span className="bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                    {bill.paymentMethod || 'CASH'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-[#F3F4F6]">{bill.customer?.name || bill.customerName || 'Walk-in'}</div>
                    <div className="text-[11px] text-[#9CA3AF] font-mono">📱 {bill.customer?.phone || bill.customerPhone || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#9CA3AF] font-mono">Staff: {bill.staffName || bill.staff || 'Staff'}</div>
                    <div className="text-[10px] text-[#9CA3AF] font-mono">
                      {bill.timestamp ? new Date(bill.timestamp).toLocaleDateString('en-IN') : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#374151]">
                  <div className="font-mono font-extrabold text-[#F3F4F6] text-base">
                    {formatRupees(bill.totalAmount)}
                  </div>
                  <button
                    onClick={() => setSelectedInvoice(bill)}
                    className="px-4 py-2 bg-[#273549] hover:bg-[#374151] text-[#14B8A6] border border-[#374151] rounded-xl transition text-xs font-bold flex items-center space-x-1.5 min-h-[44px]"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Invoice</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <ReceiptModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
