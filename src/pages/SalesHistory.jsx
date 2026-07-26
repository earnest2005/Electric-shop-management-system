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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-white text-2xl font-sans flex items-center gap-2">
            <Receipt className="w-7 h-7 text-amber-400" /> Transaction Logs & Sales Invoices
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Deterministic search and reprint center for all generated electrical billing invoices
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-dark-800 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-xs rounded-xl transition self-start md:self-auto"
          title="Export Filtered Sales Report to CSV"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>Export Sales CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Total Billed Invoices</div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">{purchases.length}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Gross Sales Value</div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">
            {formatRupees(totalSalesRevenue)}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Uncollected Dues in Invoices</div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono mt-1">
            {formatRupees(totalDuesInInvoices)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Paid', 'Due'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-dark-800 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === 'All' ? 'All Invoices' : st === 'Paid' ? 'Fully Paid' : 'Pending Dues'}
            </button>
          ))}

          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="glass-input px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-amber-400 bg-dark-800"
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
            className="w-full glass-input pl-10 pr-4 py-2 rounded-xl text-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-800/80 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Bill Number & Date</th>
                <th className="px-6 py-3.5">Customer Info</th>
                <th className="px-6 py-3.5">Payment Mode</th>
                <th className="px-6 py-3.5 text-right">Total Amount</th>
                <th className="px-6 py-3.5 text-right">Paid vs Due</th>
                <th className="px-6 py-3.5 text-center">Receipt Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500 font-mono">
                    No sales invoices found.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-dark-800/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-amber-400 font-mono text-sm">{p.billNumber}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(p.timestamp).toLocaleDateString('en-IN')} {new Date(p.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm">{p.customerName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">+91 {p.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <span className="bg-dark-800 border border-slate-700 px-2.5 py-1 rounded text-slate-300">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-white text-sm">
                      {formatRupees(p.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      <div className="text-emerald-400 font-semibold">Paid: {formatRupees(p.paidAmount)}</div>
                      {p.dueAmount > 0 && (
                        <div className="text-rose-400 font-bold text-[11px]">Due: {formatRupees(p.dueAmount)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => onViewReceipt(p)}
                          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-400 font-semibold rounded-lg transition flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Bill</span>
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(p)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition border border-rose-500/20"
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
      </div>
    </div>
  );
}
