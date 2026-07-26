import React, { useState, useEffect } from 'react';
import { Users, Search, AlertCircle, CheckCircle2, History, Plus, Phone, MapPin, ArrowDownRight, X, Send, Receipt, Calendar, CreditCard, ChevronRight, Trash2, Download, MessageSquare } from 'lucide-react';
import { formatRupees, rupeesToPaise, formatNumberIN } from '../utils/currency';
import { getCustomers, recordDuePayment, getCustomerPayments, getPurchases, saveCustomer, deleteCustomer } from '../services/db';
import { useAlert } from '../context/AlertContext';
import { exportCustomerLedgerCSV } from '../utils/exporter';

export default function CustomerLedger() {
  const { toast, confirm } = useAlert();
  const [customers, setCustomers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'dues_history'
  const [filterType, setFilterType] = useState('all'); // 'all' | 'dues' | 'cleared'
  
  // Repayment Modal State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [payAmountRupees, setPayAmountRupees] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [refNo, setRefNo] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [customerPayments, setCustomerPayments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dedicated Customer History Card View Modal
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);

  // Add Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  const loadData = async () => {
    const custs = await getCustomers();
    const sales = await getPurchases();
    setCustomers(custs);
    setPurchases(sales);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('volt_db_updated', loadData);
    return () => window.removeEventListener('volt_db_updated', loadData);
  }, []);

  const handleSendWhatsAppReminder = (customer) => {
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const dueAmountStr = formatRupees(customer.totalDue);
    const message = encodeURIComponent(
      `Dear ${customer.name},\n\nThis is a friendly payment reminder from Volt Electricals regarding your outstanding balance of ${dueAmountStr}.\n\nPlease arrange for payment at your earliest convenience.\n\nThank you!`
    );
    window.open(`https://wa.me/${phoneWithCode}?text=${message}`, '_blank');
  };

  const handleExportLedger = () => {
    if (customers.length === 0) {
      toast.warning("No customer records found to export.", "Empty Ledger");
      return;
    }
    exportCustomerLedgerCSV(customers);
    toast.success("Exported customer ledger statement CSV!", "Export Downloaded");
  };

  // Filter customers for directory & dues
  const filteredCustomers = customers.filter(c => {
    const matchSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchSearch) return false;
    if (filterType === 'dues') return (c.totalDue || 0) > 0;
    if (filterType === 'cleared') return (c.totalDue || 0) === 0;
    return true;
  });

  // Calculate Metrics
  const totalDuesOutstanding = customers.reduce((acc, c) => acc + (c.totalDue || 0), 0);
  const customersWithDuesCount = customers.filter(c => (c.totalDue || 0) > 0).length;

  // View Customer History in a separate dedicated Card Modal
  const handleOpenCustomerHistory = async (customer) => {
    setHistoryCustomer(customer);
    const userInvoices = purchases.filter(p => p.customerPhone.replace(/\D/g, '') === customer.phone.replace(/\D/g, ''));
    const userPayments = await getCustomerPayments(customer.phone);
    setCustomerInvoices(userInvoices);
    setCustomerPayments(userPayments);
  };

  const handleDeleteCustomer = async (cust) => {
    const ok = await confirm({
      title: 'Delete Customer Profile',
      message: `Delete customer profile for ${cust.name} (+91 ${cust.phone}) permanently from Firebase & Local storage?`,
      confirmText: 'Delete Customer',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;

    await deleteCustomer(cust.phone);
    toast.success(`Customer profile for ${cust.name} deleted.`, 'Customer Deleted');
    loadData();
  };

  // Open Repayment Modal
  const handleOpenRepayment = async (customer) => {
    setSelectedCustomer(customer);
    setPayAmountRupees((customer.totalDue / 100).toString());
    const history = await getCustomerPayments(customer.phone);
    setCustomerPayments(history);
  };

  // Submit Due Repayment
  const handleSubmitRepayment = async (e) => {
    e.preventDefault();
    if (!payAmountRupees || parseFloat(payAmountRupees) <= 0) {
      toast.error("Enter a valid payment amount.", "Invalid Input");
      return;
    }
    const paise = rupeesToPaise(payAmountRupees);
    if (paise > selectedCustomer.totalDue) {
      const ok = await confirm({
        title: 'Excess Payment Warning',
        message: 'Payment amount exceeds current due balance. Proceed anyway?',
        confirmText: 'Proceed',
        cancelText: 'Cancel',
        variant: 'warning'
      });
      if (!ok) return;
    }

    setIsSubmitting(true);
    try {
      await recordDuePayment({
        customerPhone: selectedCustomer.phone,
        customerName: selectedCustomer.name,
        amountPaid: paise,
        paymentMethod: payMethod,
        referenceNo: refNo,
        notes: payNotes
      });

      toast.success(`Payment of ${formatRupees(paise)} recorded successfully!`, "Payment Recorded");
      setSelectedCustomer(null);
      setPayAmountRupees('');
      setRefNo('');
      setPayNotes('');
      loadData();
    } catch (err) {
      toast.error("Failed to record payment: " + err.message, "Payment Failure");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create new customer profile manually
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    const cleanPhone = newCustPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Enter valid 10 digit mobile number.", "Invalid Input");
      return;
    }
    if (!newCustName.trim()) {
      toast.error("Enter customer name.", "Invalid Input");
      return;
    }

    await saveCustomer({
      phone: cleanPhone,
      name: newCustName.trim(),
      address: newCustAddress.trim() || 'Local Customer'
    });

    toast.success(`Customer profile for ${newCustName} created successfully!`, "Profile Saved");
    setShowAddModal(false);
    setNewCustPhone('');
    setNewCustName('');
    setNewCustAddress('');
    setActiveTab('directory');
    setFilterType('all');
    loadData();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-white text-2xl font-sans flex items-center gap-2">
            <Users className="w-7 h-7 text-amber-400" /> Customer Management & Dues Ledger
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Manage registered buyer directory, view purchase histories in dedicated cards, and track credit balances
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleExportLedger}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-dark-800 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-xs rounded-xl transition"
            title="Export Customer Ledger Statement CSV"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export Ledger CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-xs rounded-xl shadow-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>ADD NEW CUSTOMER</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => { setActiveTab('dues_history'); setFilterType('all'); }}
          className={`glass-panel p-4 rounded-2xl cursor-pointer transition hover:border-amber-500/40 group ${
            activeTab === 'directory' ? 'ring-2 ring-amber-500/50 bg-amber-500/10' : ''
          }`}
        >
          <div className="flex justify-between items-start text-xs text-slate-400">
            <span className="font-semibold text-slate-300 group-hover:text-amber-400 transition">Registered Customers</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">
            {customers.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono flex items-center justify-between">
            <span>Electrical buyers directory</span>
            <span className="text-amber-400 text-[10px] font-bold group-hover:underline">View Directory →</span>
          </p>
        </div>

        <div 
          onClick={() => { setActiveTab('dues_history'); setFilterType('dues'); }}
          className={`glass-panel-glow p-4 rounded-2xl border-rose-500/30 cursor-pointer transition hover:border-rose-500 ${
            activeTab === 'dues_history' && filterType === 'dues' ? 'ring-2 ring-rose-500/50 bg-rose-500/10' : ''
          }`}
        >
          <div className="flex justify-between items-start text-xs text-slate-400">
            <span className="font-semibold text-rose-300">Total Dues Outstanding</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono mt-1">
            {formatRupees(totalDuesOutstanding)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono flex items-center justify-between">
            <span>Across {customersWithDuesCount} pending accounts</span>
            <span className="text-rose-400 text-[10px] font-bold">View Dues Ledger →</span>
          </p>
        </div>

        <div 
          onClick={() => { setActiveTab('dues_history'); setFilterType('cleared'); }}
          className={`glass-panel p-4 rounded-2xl cursor-pointer transition hover:border-emerald-500/40 group ${
            filterType === 'cleared' ? 'ring-2 ring-emerald-500/50 bg-emerald-500/10' : ''
          }`}
        >
          <div className="flex justify-between items-start text-xs text-slate-400">
            <span className="font-semibold text-slate-300 group-hover:text-emerald-400 transition">Fully Cleared Accounts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
            {customers.length - customersWithDuesCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono flex items-center justify-between">
            <span>Zero pending credit</span>
            <span className="text-emerald-400 text-[10px] font-bold group-hover:underline">View Cleared →</span>
          </p>
        </div>
      </div>

      {/* Main View Selection Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'directory'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-dark-800 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Registered Customers Directory ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dues_history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'dues_history'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'bg-dark-800 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Customer Dues & History Ledger</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search customer name or phone..."
            className="w-full glass-input pl-9 pr-4 py-2 rounded-xl text-xs"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
        </div>
      </div>

      {/* TAB 1: Registered Customers Directory Card */}
      {activeTab === 'directory' && (
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base font-sans flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" /> Registered Customer Directory
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Newly added customer profiles are displayed here
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 font-mono">
                No registered customers found. Click "+ ADD NEW CUSTOMER" to create a profile.
              </div>
            ) : (
              filteredCustomers.map(cust => (
                <div 
                  key={cust.phone}
                  className="bg-dark-900/80 p-4 rounded-xl border border-slate-800 space-y-3 hover:border-amber-500/40 transition group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-base group-hover:text-amber-400 transition">{cust.name}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" /> {cust.address || 'Local Customer'}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      REGISTERED
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div className="font-mono text-amber-300 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> +91 {cust.phone}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenCustomerHistory(cust)}
                        className="px-3 py-1.5 bg-dark-800 hover:bg-slate-800 text-slate-200 font-semibold rounded-lg text-xs transition flex items-center space-x-1 border border-slate-700"
                      >
                        <span>View History</span>
                        <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(cust)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition border border-rose-500/20"
                        title="Delete Customer from Firebase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Customer Dues & Transaction History Ledger Card */}
      {activeTab === 'dues_history' && (
        <div className="space-y-4">
          {/* Sub Filters */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filterType === 'all' ? 'bg-amber-500 text-black' : 'bg-dark-800 text-slate-400'
              }`}
            >
              All Accounts ({customers.length})
            </button>
            <button
              onClick={() => setFilterType('dues')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filterType === 'dues' ? 'bg-rose-500 text-white' : 'bg-dark-800 text-slate-400'
              }`}
            >
              Pending Dues Only ({customersWithDuesCount})
            </button>
            <button
              onClick={() => setFilterType('cleared')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filterType === 'cleared' ? 'bg-emerald-500 text-black' : 'bg-dark-800 text-slate-400'
              }`}
            >
              Cleared Accounts
            </button>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-800/80 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Customer Info</th>
                    <th className="px-6 py-3.5">Contact Details</th>
                    <th className="px-6 py-3.5 text-right">Lifetime Purchases</th>
                    <th className="px-6 py-3.5 text-right">Current Pending Due</th>
                    <th className="px-6 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-500 font-mono">
                        No customer dues or accounts matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(cust => (
                      <tr key={cust.phone} className="hover:bg-dark-800/50 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white text-sm">{cust.name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" /> {cust.address || 'Local Customer'}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-amber-400" />
                            <span>+91 {cust.phone}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-semibold text-slate-200">
                          {formatRupees(cust.totalPurchases || 0)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono">
                          {(cust.totalDue || 0) > 0 ? (
                            <span className="text-rose-400 font-bold text-sm bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/30">
                              {formatRupees(cust.totalDue)}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                              ₹0.00 Cleared
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {(cust.totalDue || 0) > 0 && (
                              <>
                                <button
                                  onClick={() => handleSendWhatsAppReminder(cust)}
                                  className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold rounded-lg text-xs transition flex items-center space-x-1"
                                  title="Send WhatsApp Payment Reminder"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </button>
                                <button
                                  onClick={() => handleOpenRepayment(cust)}
                                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg text-xs transition shadow-md shadow-rose-500/20"
                                >
                                  Record Due
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleOpenCustomerHistory(cust)}
                              className="px-3 py-1.5 bg-dark-800 hover:bg-slate-800 text-slate-300 font-semibold rounded-lg text-xs transition border border-slate-700"
                            >
                              History Card
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(cust)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition border border-rose-500/20"
                              title="Delete Customer from Firebase"
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
      )}

      {/* SEPARATE DEDICATED CUSTOMER HISTORY CARD MODAL */}
      {historyCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-dark-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Customer Billing & Purchase History</h3>
                  <p className="text-xs text-slate-400 font-mono">{historyCustomer.name} (+91 {historyCustomer.phone})</p>
                </div>
              </div>
              <button onClick={() => setHistoryCustomer(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Profile Summary Header */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-dark-800 rounded-xl border border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Total Billed:</span>
                  <div className="text-base font-bold text-amber-400">{formatRupees(historyCustomer.totalPurchases || 0)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Current Outstanding Due:</span>
                  <div className={`text-base font-bold ${(historyCustomer.totalDue || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatRupees(historyCustomer.totalDue || 0)}
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-400">Address / Site:</span>
                  <div className="text-slate-200 font-sans text-[11px] truncate">{historyCustomer.address || 'Local Customer'}</div>
                </div>
              </div>

              {/* Invoices History Card Section */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-1.5 font-sans">
                  <Receipt className="w-4 h-4 text-amber-400" /> Billed Invoices ({customerInvoices.length})
                </h4>

                {customerInvoices.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 font-mono text-xs bg-dark-800/40 rounded-xl border border-slate-800">
                    No billed invoices found for this customer.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customerInvoices.map(inv => (
                      <div key={inv.id} className="p-3.5 bg-dark-800/60 rounded-xl border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-white">{inv.billNumber}</span>
                          <span className="text-slate-400">{new Date(inv.timestamp).toLocaleDateString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-slate-300 font-mono">
                          <span>Amount Billed: <strong>{formatRupees(inv.totalAmount)}</strong></span>
                          <span>Payment: <strong className="text-amber-300">{inv.paymentMethod}</strong></span>
                        </div>
                        {inv.dueAmount > 0 && (
                          <div className="text-rose-400 font-mono text-[11px] font-bold bg-rose-500/10 p-1.5 rounded border border-rose-500/20">
                            Pending Due on Invoice: {formatRupees(inv.dueAmount)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Records Section */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-1.5 font-sans">
                  <CreditCard className="w-4 h-4 text-emerald-400" /> Due Repayment Payments Log ({customerPayments.length})
                </h4>

                {customerPayments.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 font-mono text-xs bg-dark-800/40 rounded-xl border border-slate-800">
                    No payment history recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customerPayments.map(p => (
                      <div key={p.id} className="p-3 bg-dark-800/40 rounded-xl border border-slate-800 flex justify-between items-center text-xs font-mono">
                        <div>
                          <div className="font-bold text-emerald-400">+{formatRupees(p.amountPaid)} ({p.paymentMethod})</div>
                          <div className="text-[10px] text-slate-400">{new Date(p.timestamp).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="text-right text-[11px] text-slate-300">
                          Ref: {p.referenceNo || 'CASH'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Due Repayment Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4">
            <div className="p-4 border-b border-slate-800 bg-dark-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ArrowDownRight className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">Record Customer Due Repayment</h3>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRepayment} className="p-6 space-y-4 text-xs font-sans">
              <div className="p-3 bg-dark-800 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">{selectedCustomer.name}</div>
                  <div className="text-slate-400 font-mono">+91 {selectedCustomer.phone}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Current Pending Due</div>
                  <div className="text-lg font-bold text-rose-400 font-mono">
                    {formatRupees(selectedCustomer.totalDue)}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-400 font-mono">
                  <label>Repayment Amount (₹)*</label>
                  <button
                    type="button"
                    onClick={() => setPayAmountRupees((selectedCustomer.totalDue / 100).toString())}
                    className="text-amber-400 hover:underline text-[11px]"
                  >
                    Clear Full Due ({formatRupees(selectedCustomer.totalDue)})
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={payAmountRupees}
                  onChange={e => setPayAmountRupees(e.target.value)}
                  placeholder="Enter amount paid by customer..."
                  className="w-full glass-input px-3 py-2 rounded-xl text-base font-mono font-bold text-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400 font-mono">Payment Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {['UPI', 'Cash', 'Card', 'Bank Transfer'].map(m => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPayMethod(m)}
                      className={`py-2 rounded-xl font-mono text-xs font-semibold transition ${
                        payMethod === m ? 'bg-amber-500 text-black shadow-md' : 'bg-dark-800 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Reference No / UTR</label>
                  <input
                    type="text"
                    value={refNo}
                    onChange={e => setRefNo(e.target.value)}
                    placeholder="e.g. UPI987654"
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Remarks / Notes</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    placeholder="Partial settlement..."
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold flex items-center space-x-1.5 shadow-lg shadow-rose-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'PROCESSING...' : 'SUBMIT REPAYMENT'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-dark-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Add New Customer Profile</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Mobile Number (10 Digits)*</label>
                <input
                  type="text"
                  maxLength={10}
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full glass-input px-3 py-2 rounded-xl font-mono text-amber-400"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-mono mb-1">Customer Full Name*</label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  placeholder="e.g. Ramesh Electrical Contractor"
                  className="w-full glass-input px-3 py-2 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-mono mb-1">Address / Site Details</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={e => setNewCustAddress(e.target.value)}
                  placeholder="Shop #12, Market Complex"
                  className="w-full glass-input px-3 py-2 rounded-xl"
                />
              </div>
              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
