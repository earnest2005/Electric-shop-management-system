import React, { useState, useEffect } from 'react';
import { Receipt, Search, Eye, Printer, Calendar, User, Phone, CheckCircle, AlertCircle, FileText, Trash2, Download } from 'lucide-react';
import { formatRupees } from '../utils/currency';
import { getPurchases, deleteInvoice } from '../services/db';
import { useAlert } from '../context/AlertContext';
import { exportSalesCSV } from '../utils/exporter';

export default function SalesHistory({ onViewReceipt }) {
  const { toast, confirm } = useAlert();
  const [purchases, setPurchases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Paid' | 'Due'
  const [dateRange, setDateRange] = useState('All Time'); // 'All Time' | 'Today' | 'This Week' | 'This Month'

  const loadData = async () => {
    const data = await getPurchases();
    setPurchases(data);
  };

  const handleDeleteInvoice = async (invoice) => {
    const ok = await confirm({
      title: 'Delete Billing Invoice',
      message: `Delete invoice ${invoice.billNumber} permanently from Firebase & Local storage?`,
      confirmText: 'Delete Invoice',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;

    await deleteInvoice(invoice.billNumber);
    toast.success(`Invoice ${invoice.billNumber} deleted successfully.`, "Invoice Deleted");
    loadData();
  };

  useEffect(() => {
    loadData();
    window.addEventListener('volt_db_updated', loadData);
    return () => window.removeEventListener('volt_db_updated', loadData);
  }, []);

  const handleExportCSV = () => {
    if (filteredPurchases.length === 0) {
      toast.warning("No sales transactions available to export.", "Empty Sales Log");
      return;
    }
    exportSalesCSV(filteredPurchases);
    toast.success("Exported sales invoices report CSV!", "Export Downloaded");
  };

  const filteredPurchases = purchases.filter(p => {
    const matchSearch = 
      p.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.customerPhone || '').includes(searchQuery);

    if (!matchSearch) return false;
    if (statusFilter === 'Paid' && (p.dueAmount || 0) > 0) return false;
    if (statusFilter === 'Due' && (p.dueAmount || 0) <= 0) return false;

    if (dateRange !== 'All Time' && p.timestamp) {
      const pDate = new Date(p.timestamp);
      const now = new Date();
      if (dateRange === 'Today') {
        if (pDate.toDateString() !== now.toDateString()) return false;
      } else if (dateRange === 'This Week') {
        const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
        if (pDate < sevenDaysAgo) return false;
      } else if (dateRange === 'This Month') {
        if (pDate.getMonth() !== new Date().getMonth() || pDate.getFullYear() !== new Date().getFullYear()) return false;
      }
    }

    return true;
  });

  const totalSalesRevenue = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalDuesInInvoices = purchases.reduce((sum, p) => sum + (p.dueAmount || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans selection:bg-teal-500 selection:text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-[#F3F4F6] text-2xl font-sans flex items-center gap-2">
            <Receipt className="w-7 h-7 text-[#14B8A6]" /> Transaction Logs & Sales Invoices
          </h2>
          <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">
            Deterministic search and reprint center for all generated electrical billing invoices
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#273549] hover:bg-[#1F2937] text-[#F3F4F6] border border-[#374151] font-semibold text-xs rounded-xl transition shadow-sm self-start md:self-auto"
          title="Export Filtered Sales Report to CSV"
        >
          <Download className="w-4 h-4 text-[#14B8A6]" />
          <span>Export Sales CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#273549] p-4 rounded-2xl border border-[#374151] shadow-sm">
          <div className="text-xs text-[#9CA3AF] font-mono font-semibold">Total Billed Invoices</div>
          <div className="text-2xl font-extrabold text-[#F3F4F6] font-mono mt-1">{purchases.length}</div>
        </div>

        <div className="bg-[#273549] p-4 rounded-2xl border border-[#374151] shadow-sm">
          <div className="text-xs text-[#9CA3AF] font-mono font-semibold">Gross Sales Value</div>
          <div className="text-2xl font-extrabold text-[#14B8A6] font-mono mt-1">
            {formatRupees(totalSalesRevenue)}
          </div>
        </div>

        <div className="bg-[#273549] p-4 rounded-2xl border border-[#374151] shadow-sm">
          <div className="text-xs text-[#9CA3AF] font-mono font-semibold">Uncollected Dues in Invoices</div>
          <div className="text-2xl font-extrabold text-red-400 font-mono mt-1">
            {formatRupees(totalDuesInInvoices)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#273549] p-4 rounded-2xl border border-[#374151] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Paid', 'Due'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-[#14B8A6] text-white shadow-sm font-bold'
                  : 'bg-[#1F2937] text-[#9CA3AF] hover:text-[#F3F4F6] border border-[#374151]'
              }`}
            >
              {st === 'All' ? 'All Invoices' : st === 'Paid' ? 'Fully Paid' : 'Pending Dues'}
            </button>
          ))}

          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="glass-input px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-[#14B8A6] bg-[#1F2937] border-[#374151]"
          >
            <option value="All Time">🗓️ All Time</option>
            <option value="Today">⚡ Today</option>
            <option value="This Week">📅 This Week</option>
            <option value="This Month">📆 This Month</option>
          </select>
        </div>

        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Invoice #, Customer, or Phone..."
            className="w-full glass-input pl-10 pr-4 py-2 rounded-xl text-xs border-[#374151] focus:border-[#14B8A6]"
          />
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-2.5" />
        </div>
      </div>

      {/* Invoices Table (Desktop) & Touch Cards (Mobile) */}
      <div className="bg-[#273549] rounded-2xl border border-[#374151] shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1F2937] text-[#9CA3AF] uppercase tracking-wider font-mono border-b border-[#374151]">
              <tr>
                <th className="px-6 py-3.5">Bill Number & Date</th>
                <th className="px-6 py-3.5">Customer Info</th>
                <th className="px-6 py-3.5">Payment Mode</th>
                <th className="px-6 py-3.5 text-right">Total Amount</th>
                <th className="px-6 py-3.5 text-right">Paid vs Due</th>
                <th className="px-6 py-3.5 text-center">Receipt Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151] font-sans text-[#F3F4F6]">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-[#9CA3AF] font-mono">
                    No sales invoices found.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-[#1F2937]/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#14B8A6] font-mono text-sm">{p.billNumber}</div>
                      <div className="text-[11px] text-[#9CA3AF] font-mono flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-[#9CA3AF]" />
                        {new Date(p.timestamp).toLocaleDateString('en-IN')} {new Date(p.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#F3F4F6] text-sm">{p.customerName}</div>
                      <div className="text-[11px] text-[#9CA3AF] font-mono">+91 {p.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <span className="bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded text-teal-300 font-semibold">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-[#F3F4F6] text-sm">
                      {formatRupees(p.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      <div className="text-emerald-400 font-semibold">Paid: {formatRupees(p.paidAmount)}</div>
                      {p.dueAmount > 0 && (
                        <div className="text-red-400 font-bold text-[11px]">Due: {formatRupees(p.dueAmount)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => onViewReceipt(p)}
                          className="px-3 py-1.5 bg-[#1F2937] hover:bg-[#374151] text-[#14B8A6] font-semibold rounded-lg border border-[#374151] transition flex items-center space-x-1 min-h-[36px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Bill</span>
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(p)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition border border-red-500/30 min-w-[36px] min-h-[36px] flex items-center justify-center"
                          title="Delete Invoice from Firebase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
            <div className="py-8 text-center text-[#9CA3AF] font-mono text-xs">
              No sales invoices found.
            </div>
          ) : (
            filteredPurchases.map(p => (
              <div key={p.id} className="bg-[#1F2937] border border-[#374151] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-[#14B8A6] font-mono text-sm">{p.billNumber}</div>
                  <span className="bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded text-[10px] font-mono text-teal-300 font-bold">
                    {p.paymentMethod}
                  </span>
                </div>

                <div className="flex justify-between items-start text-xs">
                  <div>
                    <h4 className="font-bold text-[#F3F4F6] text-sm">{p.customerName}</h4>
                    <p className="text-[11px] text-[#14B8A6] font-mono">📱 {p.customerPhone}</p>
                  </div>
                  <div className="text-right text-[10px] text-[#9CA3AF] font-mono">
                    {new Date(p.timestamp).toLocaleDateString('en-IN')}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-[#374151]">
                  <div>
                    <div className="text-[#F3F4F6] font-extrabold text-sm">{formatRupees(p.totalAmount)}</div>
                    {p.dueAmount > 0 ? (
                      <div className="text-red-400 text-[10px] font-bold">Due: {formatRupees(p.dueAmount)}</div>
                    ) : (
                      <div className="text-emerald-400 text-[10px]">Paid Full</div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onViewReceipt(p)}
                      className="px-3 py-2 bg-[#273549] hover:bg-[#374151] text-[#14B8A6] font-semibold rounded-xl border border-[#374151] transition text-xs flex items-center space-x-1 min-h-[44px]"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => handleDeleteInvoice(p)}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition border border-red-500/30 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title="Delete Invoice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
