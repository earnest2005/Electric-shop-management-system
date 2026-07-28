import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Download, Printer, FileText, Phone, 
  Calendar, DollarSign, UserCheck, Clock, ChevronRight, Eye, RefreshCw
} from 'lucide-react';
import { formatRupees, formatNumberIN } from '../utils/currency';
import { getCustomers, getPurchases } from '../services/db';
import { exportCustomerLedgerCSV, exportToCSV } from '../utils/exporter';
import AdminInvoiceModal from '../components/AdminInvoiceModal';

export default function CustomerRecords() {
  const [customers, setCustomers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [minAmountFilter, setMinAmountFilter] = useState('');

  // Selected customer modal state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const [cList, pList] = await Promise.all([getCustomers(), getPurchases()]);
    setCustomers(cList);
    setPurchases(pList);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('volt_db_updated', loadData);
    return () => window.removeEventListener('volt_db_updated', loadData);
  }, []);

  // Distinct staff names
  const staffNames = Array.from(
    new Set(purchases.map(p => p.staffName || p.staff || 'Staff').filter(Boolean))
  );

  // Filter logic
  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase().trim();
    const cleanPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
    
    // Find customer's bills
    const custBills = purchases.filter(p => {
      const pPhone = (p.customer?.phone || p.customerPhone || '').replace(/\D/g, '');
      return pPhone === cleanPhone || pPhone === c.phone;
    });

    const matchQuery = 
      !query ||
      (c.name && c.name.toLowerCase().includes(query)) ||
      cleanPhone.includes(query) ||
      custBills.some(b => (b.billNumber || '').toLowerCase().includes(query));

    const matchStaff = 
      staffFilter === 'ALL' ||
      custBills.some(b => (b.staffName || b.staff || 'Staff') === staffFilter);

    const matchDate = 
      !dateFilter ||
      (c.lastPurchaseAt && c.lastPurchaseAt.slice(0, 10) === dateFilter) ||
      custBills.some(b => b.timestamp && b.timestamp.slice(0, 10) === dateFilter);

    const matchAmount = 
      !minAmountFilter ||
      (c.totalPurchases || 0) >= Number(minAmountFilter) * 100;

    return matchQuery && matchStaff && matchDate && matchAmount;
  });

  // Export CSV
  const handleExportCSV = () => {
    exportCustomerLedgerCSV(filteredCustomers);
  };

  // Export Detailed Customer Bills CSV
  const handleExportDetailedCSV = () => {
    const headers = [
      { label: 'Customer Name', accessor: r => r.custName },
      { label: 'Mobile Number', accessor: r => r.custPhone },
      { label: 'Bill Number', accessor: r => r.billNumber },
      { label: 'Date', accessor: r => r.date },
      { label: 'Products', accessor: r => r.products },
      { label: 'Total Amount (₹)', accessor: r => (r.totalAmount / 100).toFixed(2) },
      { label: 'Payment Method', accessor: r => r.paymentMethod },
      { label: 'Staff Name', accessor: r => r.staffName }
    ];

    const rows = [];
    filteredCustomers.forEach(c => {
      const cleanPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
      const custBills = purchases.filter(p => {
        const pPhone = (p.customer?.phone || p.customerPhone || '').replace(/\D/g, '');
        return pPhone === cleanPhone || pPhone === c.phone;
      });

      custBills.forEach(b => {
        rows.push({
          custName: c.name || 'Walk-in',
          custPhone: c.phone || 'N/A',
          billNumber: b.billNumber,
          date: b.timestamp ? new Date(b.timestamp).toLocaleDateString('en-IN') : '',
          products: (b.items || []).map(i => `${i.productName} (x${i.qty})`).join('; '),
          totalAmount: b.totalAmount || 0,
          paymentMethod: b.paymentMethod || 'CASH',
          staffName: b.staffName || b.staff || 'Staff'
        });
      });
    });

    exportToCSV(rows, headers, `Customer_Detailed_Bills_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans selection:bg-teal-500 selection:text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#F3F4F6] font-sans tracking-tight flex items-center space-x-2">
            <Users className="w-7 h-7 text-[#14B8A6]" />
            <span>Customer Purchase Records & History</span>
          </h2>
          <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">
            Filter customer profiles by staff salesman, purchase date, invoice number, or spend threshold.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-[#273549] hover:bg-[#1F2937] text-[#F3F4F6] font-mono text-xs font-bold rounded-xl border border-[#374151] transition flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-[#14B8A6]" />
            <span>EXPORT SUMMARY CSV</span>
          </button>
          <button
            onClick={handleExportDetailedCSV}
            className="px-4 py-2 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT FULL BILLS CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-[#273549] p-4 rounded-2xl border border-[#374151] shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Name, Phone, or Bill #..."
            className="w-full glass-input pl-10 pr-4 py-2 rounded-xl text-xs font-mono border-[#374151] focus:border-[#14B8A6]"
          />
        </div>

        {/* Filter by Staff */}
        <select
          value={staffFilter}
          onChange={e => setStaffFilter(e.target.value)}
          className="glass-input px-3 py-2 rounded-xl text-xs font-mono text-[#F3F4F6] bg-[#1F2937] border-[#374151]"
        >
          <option value="ALL">Filter by Staff: All Staff</option>
          {staffNames.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Filter by Date */}
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="glass-input px-3 py-2 rounded-xl text-xs font-mono text-[#F3F4F6] bg-[#1F2937] border-[#374151]"
        />

        {/* Min Amount Filter */}
        <input
          type="number"
          value={minAmountFilter}
          onChange={e => setMinAmountFilter(e.target.value)}
          placeholder="Min Total Amount (₹)..."
          className="glass-input px-3 py-2 rounded-xl text-xs font-mono text-[#F3F4F6] bg-[#1F2937] border-[#374151]"
        />
      </div>

      {/* Customer Records Table (Desktop) & Touch Cards (Mobile) */}
      <div className="bg-[#273549] rounded-2xl overflow-hidden border border-[#374151] shadow-sm">
        <div className="p-4 border-b border-[#374151] flex items-center justify-between bg-[#1F2937]">
          <div className="text-xs font-bold text-[#F3F4F6] font-mono flex items-center space-x-2">
            <span>REGISTERED CUSTOMER PROFILES</span>
            <span className="bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded text-[10px] border border-teal-500/20 font-bold">
              {filteredCustomers.length} Records
            </span>
          </div>
          <button
            onClick={loadData}
            className="text-xs text-[#9CA3AF] hover:text-[#F3F4F6] flex items-center space-x-1 font-mono min-h-[36px] px-2 rounded-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#1F2937] text-[#9CA3AF] font-mono border-b border-[#374151]">
                <th className="p-3.5">CUSTOMER DETAILS</th>
                <th className="p-3.5">MOBILE NUMBER</th>
                <th className="p-3.5 text-right">TOTAL PURCHASES</th>
                <th className="p-3.5 text-right">OUTSTANDING DUE</th>
                <th className="p-3.5 text-center">LAST PURCHASE</th>
                <th className="p-3.5 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151] font-mono text-[#F3F4F6]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#9CA3AF]">
                    No customer records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(cust => {
                  const cleanPhone = cust.phone ? cust.phone.replace(/\D/g, '') : '';
                  const custBills = purchases.filter(p => {
                    const pPhone = (p.customer?.phone || p.customerPhone || '').replace(/\D/g, '');
                    return pPhone === cleanPhone || pPhone === cust.phone;
                  });

                  return (
                    <tr key={cust.id || cust.phone} className="hover:bg-[#1F2937]/60 transition">
                      <td className="p-3.5 font-sans font-bold text-[#F3F4F6]">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-300 font-mono font-bold flex items-center justify-center text-xs shrink-0 border border-teal-500/20">
                            {cust.name ? cust.name[0].toUpperCase() : 'C'}
                          </div>
                          <div>
                            <div>{cust.name || 'Walk-in Customer'}</div>
                            <div className="text-[10px] text-[#9CA3AF] font-mono">{custBills.length} Invoices Generated</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-[#14B8A6] font-bold">
                        📱 {cust.phone}
                      </td>

                      <td className="p-3.5 text-right font-extrabold text-emerald-400">
                        {formatRupees(cust.totalPurchases || 0)}
                      </td>

                      <td className="p-3.5 text-right font-extrabold">
                        {(cust.totalDue || 0) > 0 ? (
                          <span className="text-red-400 font-bold">{formatRupees(cust.totalDue || 0)}</span>
                        ) : (
                          <span className="text-[#9CA3AF] font-normal">₹0.00</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center text-[#9CA3AF] text-[11px]">
                        {cust.lastPurchaseAt ? new Date(cust.lastPurchaseAt).toLocaleDateString('en-IN') : 'N/A'}
                      </td>

                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedCustomer(cust)}
                          className="px-3 py-1.5 bg-[#1F2937] hover:bg-[#374151] text-[#14B8A6] border border-[#374151] rounded-xl transition text-[11px] font-bold inline-flex items-center space-x-1 min-h-[36px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Timeline</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Touch Cards View */}
        <div className="md:hidden p-3 space-y-3">
          {filteredCustomers.length === 0 ? (
            <div className="py-12 text-center text-[#9CA3AF] font-mono text-xs">
              No customer records match the selected filters.
            </div>
          ) : (
            filteredCustomers.map(cust => {
              const cleanPhone = cust.phone ? cust.phone.replace(/\D/g, '') : '';
              const custBills = purchases.filter(p => {
                const pPhone = (p.customer?.phone || p.customerPhone || '').replace(/\D/g, '');
                return pPhone === cleanPhone || pPhone === cust.phone;
              });

              return (
                <div key={cust.id || cust.phone} className="bg-[#1F2937] border border-[#374151] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-300 font-mono font-bold flex items-center justify-center text-sm shrink-0 border border-teal-500/20">
                        {cust.name ? cust.name[0].toUpperCase() : 'C'}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#F3F4F6] text-sm">{cust.name || 'Walk-in Customer'}</h4>
                        <div className="text-[11px] text-[#14B8A6] font-mono">📱 {cust.phone}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedCustomer(cust)}
                      className="p-2 bg-[#273549] text-[#14B8A6] border border-[#374151] rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
                      title="View Customer Timeline"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-[#374151]">
                    <div>
                      <div className="text-[10px] text-[#9CA3AF]">Total Purchases</div>
                      <div className="font-bold text-emerald-400">{formatRupees(cust.totalPurchases || 0)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#9CA3AF]">Outstanding Due</div>
                      {(cust.totalDue || 0) > 0 ? (
                        <div className="font-bold text-red-400">{formatRupees(cust.totalDue || 0)}</div>
                      ) : (
                        <div className="text-[#9CA3AF]">₹0.00</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] font-mono pt-1">
                    <span>{custBills.length} Invoices</span>
                    <span>Last: {cust.lastPurchaseAt ? new Date(cust.lastPurchaseAt).toLocaleDateString('en-IN') : 'N/A'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Customer Timeline Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#273549] border border-[#374151] rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#374151] pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-300 flex items-center justify-center font-bold text-lg border border-teal-500/20">
                  {selectedCustomer.name ? selectedCustomer.name[0].toUpperCase() : 'C'}
                </div>
                <div>
                  <h3 className="font-extrabold text-[#F3F4F6] text-lg">{selectedCustomer.name}</h3>
                  <p className="text-xs text-[#14B8A6] font-mono">Mobile: {selectedCustomer.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-3 py-1 bg-[#1F2937] text-[#9CA3AF] hover:text-[#F3F4F6] rounded-lg text-xs font-semibold border border-[#374151]"
              >
                ✕ Close
              </button>
            </div>

            {/* Timeline Purchases List */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-[#9CA3AF] font-mono uppercase tracking-wider">
                Purchase History Timeline
              </h4>

              {(() => {
                const cleanPhone = selectedCustomer.phone ? selectedCustomer.phone.replace(/\D/g, '') : '';
                const custBills = purchases.filter(p => {
                  const pPhone = (p.customer?.phone || p.customerPhone || '').replace(/\D/g, '');
                  return pPhone === cleanPhone || pPhone === selectedCustomer.phone;
                });

                if (custBills.length === 0) {
                  return <div className="text-xs text-[#9CA3AF] py-4 font-mono">No detailed bill history found for this customer.</div>;
                }

                return custBills.map(b => (
                  <div key={b.id || b.billNumber} className="bg-[#1F2937] p-4 rounded-2xl border border-[#374151] space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-[#F3F4F6] text-sm">Bill #{b.billNumber}</span>
                        <span className="text-[#9CA3AF] ml-2 font-mono text-[11px]">
                          {b.timestamp ? new Date(b.timestamp).toLocaleString('en-IN') : ''}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-[#273549] text-[#9CA3AF] border border-[#374151] px-2 py-0.5 rounded font-mono text-[10px]">
                          Staff: {b.staffName || b.staff || 'Staff'}
                        </span>
                        <span className="bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-teal-500/20">
                          {b.paymentMethod || 'CASH'}
                        </span>
                      </div>
                    </div>

                    {/* Products list */}
                    <div className="divide-y divide-[#374151] text-xs">
                      {(b.items || []).map((item, idx) => (
                        <div key={idx} className="py-1.5 flex justify-between">
                          <span className="text-[#F3F4F6]">{item.productName} (x{item.qty})</span>
                          <span className="text-[#9CA3AF] font-mono">{formatRupees(item.total)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#374151] flex items-center justify-between text-xs font-mono">
                      <div>
                        Total: <strong className="text-[#14B8A6]">{formatRupees(b.totalAmount)}</strong>
                      </div>
                      <button
                        onClick={() => setSelectedInvoice(b)}
                        className="px-3 py-1 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold rounded-lg text-xs transition flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Invoice</span>
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Receipt Modal */}
      {selectedInvoice && (
        <AdminInvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
