import React, { useState, useEffect } from 'react';
import { Users, Search, AlertCircle, CheckCircle2, History, Plus, Phone, MapPin, ArrowDownRight, X, Send, Receipt, Calendar, CreditCard, ChevronRight, Trash2, Download, MessageSquare } from 'lucide-react';
import { formatRupees, rupeesToPaise, formatNumberIN } from '../utils/currency';
import { getCustomers, recordDuePayment, getCustomerPayments, getPurchases, saveCustomer, deleteCustomer } from '../services/db';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { exportCustomerLedgerCSV } from '../utils/exporter';

export default function CustomerLedger() {
  const { toast, confirm } = useAlert();
  const { user } = useAuth();
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
    if (isSubmitting) return;

    const numVal = parseFloat(payAmountRupees);
    if (isNaN(numVal) || numVal <= 0) {
      toast.error("Please enter a valid payment amount greater than ₹0.", "Invalid Input");
      return;
    }

    const paise = rupeesToPaise(payAmountRupees);
    if (paise > (selectedCustomer.totalDue || 0)) {
      toast.error(`Payment amount (${formatRupees(paise)}) cannot exceed total outstanding due of ${formatRupees(selectedCustomer.totalDue)}.`, "Excess Payment Blocked");
      return;
    }

    setIsSubmitting(true);
    try {
      const staffName = user?.username || 'Staff';
      await recordDuePayment({
        customerPhone: selectedCustomer.phone,
        customerName: selectedCustomer.name,
        amountPaid: paise,
        paymentMethod: payMethod,
        referenceNo: refNo,
        notes: payNotes,
        staffName
      });

      toast.success(`Due repayment of ${formatRupees(paise)} recorded successfully!`, "Payment Recorded");
      setSelectedCustomer(null);
      setPayAmountRupees('');
      setRefNo('');
      setPayNotes('');
      await loadData();
    } catch (err) {
      toast.error("Failed to record due payment: " + err.message, "Payment Error");
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans selection:bg-teal-500 selection:text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-[#F3F4F6] text-2xl font-sans flex items-center gap-2">
            <Users className="w-7 h-7 text-[#14B8A6]" /> Customer Management & Dues Ledger
          </h2>
          <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">
            Manage registered buyer directory, view purchase histories in dedicated cards, and track credit balances
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleExportLedger}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#273549] hover:bg-[#1F2937] text-[#F3F4F6] border border-[#374151] font-semibold text-xs rounded-xl transition shadow-sm"
            title="Export Customer Ledger Statement CSV"
          >
            <Download className="w-4 h-4 text-[#14B8A6]" />
            <span>Export Ledger CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-sm transition"
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
          className={`bg-[#273549] p-4 rounded-2xl cursor-pointer transition border hover:border-[#14B8A6] shadow-sm group ${
            activeTab === 'directory' ? 'border-[#14B8A6] bg-teal-500/10' : 'border-[#374151]'
          }`}
        >
          <div className="flex justify-between items-start text-xs text-[#9CA3AF] font-mono font-semibold">
            <span className="text-[#F3F4F6] group-hover:text-[#14B8A6] transition">Registered Customers</span>
            <Users className="w-4 h-4 text-[#14B8A6]" />
          </div>
          <div className="text-2xl font-extrabold text-[#F3F4F6] font-mono mt-1">
            {customers.length}
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-1 font-mono flex items-center justify-between">
            <span>Electrical buyers directory</span>
            <span className="text-[#14B8A6] text-[10px] font-bold group-hover:underline">View Directory →</span>
          </p>
        </div>

        <div 
          onClick={() => { setActiveTab('dues_history'); setFilterType('dues'); }}
          className={`bg-[#273549] p-4 rounded-2xl border cursor-pointer transition hover:border-red-500/50 shadow-sm ${
            activeTab === 'dues_history' && filterType === 'dues' ? 'border-red-500/50 bg-red-500/10' : 'border-[#374151]'
          }`}
        >
          <div className="flex justify-between items-start text-xs text-[#9CA3AF] font-mono font-semibold">
            <span className="text-red-400">Total Dues Outstanding</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-extrabold text-red-400 font-mono mt-1">
            {formatRupees(totalDuesOutstanding)}
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-1 font-mono flex items-center justify-between">
            <span>Across {customersWithDuesCount} pending accounts</span>
            <span className="text-red-400 text-[10px] font-bold">View Dues Ledger →</span>
          </p>
        </div>

        <div 
          onClick={() => { setActiveTab('dues_history'); setFilterType('cleared'); }}
          className={`bg-[#273549] p-4 rounded-2xl cursor-pointer transition border hover:border-emerald-500/50 shadow-sm group ${
            filterType === 'cleared' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-[#374151]'
          }`}
        >
          <div className="flex justify-between items-start text-xs text-[#9CA3AF] font-mono font-semibold">
            <span className="text-[#F3F4F6] group-hover:text-emerald-400 transition">Fully Cleared Accounts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
            {customers.length - customersWithDuesCount}
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-1 font-mono flex items-center justify-between">
            <span>Zero pending credit</span>
            <span className="text-emerald-400 text-[10px] font-bold group-hover:underline">View Cleared →</span>
          </p>
        </div>
      </div>

      {/* Main View Selection Tabs */}
      <div className="flex items-center justify-between border-b border-[#374151] pb-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'directory'
                ? 'bg-[#14B8A6] text-white shadow-sm font-extrabold'
                : 'bg-[#273549] text-[#9CA3AF] hover:text-[#F3F4F6] border border-[#374151]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Registered Customers Directory ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dues_history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'dues_history'
                ? 'bg-red-600 text-white shadow-sm font-extrabold'
                : 'bg-[#273549] text-[#9CA3AF] hover:text-[#F3F4F6] border border-[#374151]'
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
            className="w-full glass-input pl-9 pr-4 py-2 rounded-xl text-xs border-[#374151] focus:border-[#14B8A6]"
          />
          <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-3" />
        </div>
      </div>

      {/* TAB 1: Registered Customers Directory Card */}
      {activeTab === 'directory' && (
        <div className="bg-[#273549] p-6 rounded-2xl border border-[#374151] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#F3F4F6] text-base font-sans flex items-center gap-2">
              <Users className="w-5 h-5 text-[#14B8A6]" /> Registered Customer Directory
            </h3>
            <span className="text-xs text-[#9CA3AF] font-mono">
              Newly added customer profiles are displayed here
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.length === 0 ? (
              <div className="col-span-full py-12 text-center text-[#9CA3AF] font-mono">
                No registered customers found. Click "+ ADD NEW CUSTOMER" to create a profile.
              </div>
            ) : (
              filteredCustomers.map(cust => (
                <div 
                  key={cust.phone}
                  className="bg-[#1F2937] p-4 rounded-xl border border-[#374151] space-y-3 hover:border-[#14B8A6] transition group shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-[#F3F4F6] text-base group-hover:text-[#14B8A6] transition">{cust.name}</h4>
                      <p className="text-xs text-[#9CA3AF] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#9CA3AF]" /> {cust.address || 'Local Customer'}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 font-bold">
                      REGISTERED
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#374151] flex items-center justify-between text-xs">
                    <div className="font-mono text-[#14B8A6] font-bold flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> +91 {cust.phone}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenCustomerHistory(cust)}
                        className="px-3 py-1.5 bg-[#273549] hover:bg-[#374151] text-[#F3F4F6] font-semibold rounded-lg text-xs transition flex items-center space-x-1 border border-[#374151] shadow-sm"
                      >
                        <span>View History</span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#14B8A6]" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(cust)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition border border-red-500/20"
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'all' ? 'bg-[#14B8A6] text-white font-bold' : 'bg-[#273549] text-[#9CA3AF] border border-[#374151]'
              }`}
            >
              All Accounts ({customers.length})
            </button>
            <button
              onClick={() => setFilterType('dues')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'dues' ? 'bg-red-600 text-white font-bold' : 'bg-[#273549] text-[#9CA3AF] border border-[#374151]'
              }`}
            >
              Pending Dues Only ({customersWithDuesCount})
            </button>
            <button
              onClick={() => setFilterType('cleared')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'cleared' ? 'bg-emerald-600 text-white font-bold' : 'bg-[#273549] text-[#9CA3AF] border border-[#374151]'
              }`}
            >
              Cleared Accounts
            </button>
          </div>

          {/* Customer Dues Table (Desktop) & Touch Cards (Mobile) */}
          <div className="bg-[#273549] rounded-2xl border border-[#374151] shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1F2937] text-[#9CA3AF] uppercase tracking-wider font-mono border-b border-[#374151]">
                  <tr>
                    <th className="px-6 py-3.5">Customer Info</th>
                    <th className="px-6 py-3.5">Contact Details</th>
                    <th className="px-6 py-3.5 text-right">Lifetime Purchases</th>
                    <th className="px-6 py-3.5 text-right">Current Pending Due</th>
                    <th className="px-6 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#374151] font-sans text-[#F3F4F6]">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-[#9CA3AF] font-mono">
                        No customer dues or accounts matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(cust => (
                      <tr key={cust.phone} className="hover:bg-[#1F2937]/60 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-[#F3F4F6] text-sm">{cust.name}</div>
                          <div className="text-[11px] text-[#9CA3AF] flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#9CA3AF] shrink-0" /> {cust.address || 'Local Customer'}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-[#14B8A6] font-bold">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-[#14B8A6]" />
                            <span>+91 {cust.phone}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-semibold text-[#9CA3AF]">
                          {formatRupees(cust.totalPurchases || 0)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono">
                          {(cust.totalDue || 0) > 0 ? (
                            <span className="text-red-400 font-bold text-sm bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/30">
                              {formatRupees(cust.totalDue)}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
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
                                  className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold rounded-lg text-xs transition flex items-center space-x-1 min-h-[36px]"
                                  title="Send WhatsApp Payment Reminder"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </button>
                                <button
                                  onClick={() => handleOpenRepayment(cust)}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition shadow-sm min-h-[36px]"
                                >
                                  Record Due
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleOpenCustomerHistory(cust)}
                              className="px-3 py-1.5 bg-[#1F2937] hover:bg-[#374151] text-[#F3F4F6] font-semibold rounded-lg text-xs transition border border-[#374151] shadow-sm min-h-[36px]"
                            >
                              History Card
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(cust)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition border border-red-500/30 min-w-[36px] min-h-[36px] flex items-center justify-center"
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

            {/* Mobile Touch Cards View */}
            <div className="md:hidden p-3 space-y-3">
              {filteredCustomers.length === 0 ? (
                <div className="py-8 text-center text-[#9CA3AF] font-mono text-xs">
                  No customer dues or accounts matching filter.
                </div>
              ) : (
                filteredCustomers.map(cust => (
                  <div key={cust.phone} className="bg-[#1F2937] border border-[#374151] rounded-xl p-3.5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-[#F3F4F6] text-base">{cust.name}</h4>
                        <p className="text-[11px] text-[#14B8A6] font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#14B8A6]" /> +91 {cust.phone}
                        </p>
                      </div>
                      <div>
                        {(cust.totalDue || 0) > 0 ? (
                          <span className="text-red-400 font-bold text-xs font-mono bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/30 inline-block">
                            Due: {formatRupees(cust.totalDue)}
                          </span>
                        ) : (
                          <span className="text-emerald-400 text-xs font-mono bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30 inline-block">
                            ₹0.00 Cleared
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-[#9CA3AF] font-mono flex justify-between pt-2 border-t border-[#374151]">
                      <span>Lifetime Purchases:</span>
                      <span className="text-[#F3F4F6] font-bold">{formatRupees(cust.totalPurchases || 0)}</span>
                    </div>

                    {/* Touch Action Bar */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {(cust.totalDue || 0) > 0 && (
                        <>
                          <button
                            onClick={() => handleSendWhatsAppReminder(cust)}
                            className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold rounded-xl text-xs transition flex items-center space-x-1 min-h-[44px]"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => handleOpenRepayment(cust)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-sm min-h-[44px]"
                          >
                            Pay Due
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleOpenCustomerHistory(cust)}
                        className="px-3 py-2 bg-[#273549] hover:bg-[#374151] text-[#F3F4F6] font-semibold rounded-xl text-xs transition border border-[#374151] shadow-sm min-h-[44px]"
                      >
                        History
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(cust)}
                        className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition border border-red-500/30 min-w-[44px] min-h-[44px] flex items-center justify-center ml-auto"
                        title="Delete Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SEPARATE DEDICATED CUSTOMER HISTORY CARD MODAL */}
      {historyCustomer && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#273549] border border-[#374151] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 max-h-[90vh] flex flex-col font-sans">
            <div className="p-4 border-b border-[#374151] bg-[#1F2937] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-[#14B8A6]" />
                <div>
                  <h3 className="font-bold text-[#F3F4F6] text-base">Customer Billing & Purchase History</h3>
                  <p className="text-xs text-[#9CA3AF] font-mono">{historyCustomer.name} (+91 {historyCustomer.phone})</p>
                </div>
              </div>
              <button onClick={() => setHistoryCustomer(null)} className="p-1 text-[#9CA3AF] hover:text-[#F3F4F6] font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Profile Summary Header */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-[#1F2937] rounded-xl border border-[#374151] text-xs font-mono">
                <div>
                  <span className="text-[#9CA3AF]">Total Billed:</span>
                  <div className="text-base font-bold text-[#14B8A6]">{formatRupees(historyCustomer.totalPurchases || 0)}</div>
                </div>
                <div>
                  <span className="text-[#9CA3AF]">Current Outstanding Due:</span>
                  <div className={`text-base font-bold ${(historyCustomer.totalDue || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {formatRupees(historyCustomer.totalDue || 0)}
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[#9CA3AF]">Address / Site:</span>
                  <div className="text-[#F3F4F6] font-sans text-[11px] truncate">{historyCustomer.address || 'Local Customer'}</div>
                </div>
              </div>

              {/* Invoices History Card Section */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#F3F4F6] text-sm flex items-center gap-1.5 font-sans">
                  <Receipt className="w-4 h-4 text-[#14B8A6]" /> Billed Invoices ({customerInvoices.length})
                </h4>

                {customerInvoices.length === 0 ? (
                  <div className="p-6 text-center text-[#9CA3AF] font-mono text-xs bg-[#1F2937] rounded-xl border border-[#374151]">
                    No billed invoices found for this customer.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customerInvoices.map(inv => (
                      <div key={inv.id} className="p-3.5 bg-[#1F2937] rounded-xl border border-[#374151] space-y-2 text-xs">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-[#F3F4F6]">{inv.billNumber}</span>
                          <span className="text-[#9CA3AF]">{new Date(inv.timestamp).toLocaleDateString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-[#9CA3AF] font-mono">
                          <span>Amount Billed: <strong>{formatRupees(inv.totalAmount)}</strong></span>
                          <span>Payment: <strong className="text-[#14B8A6]">{inv.paymentMethod}</strong></span>
                        </div>
                        {inv.dueAmount > 0 && (
                          <div className="text-red-400 font-mono text-[11px] font-bold bg-red-500/10 p-1.5 rounded border border-red-500/30">
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
                <h4 className="font-bold text-[#F3F4F6] text-sm flex items-center gap-1.5 font-sans">
                  <CreditCard className="w-4 h-4 text-emerald-400" /> Due Repayment Payments Log ({customerPayments.length})
                </h4>

                {customerPayments.length === 0 ? (
                  <div className="p-4 text-center text-[#9CA3AF] font-mono text-xs bg-[#1F2937] rounded-xl border border-[#374151]">
                    No payment history recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customerPayments.map(p => (
                      <div key={p.id} className="p-3.5 bg-[#1F2937] rounded-xl border border-[#374151] space-y-2 text-xs font-mono">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-emerald-400">+{formatRupees(p.amountPaid)} ({p.paymentMethod || 'UPI'})</span>
                          <span className="text-[11px] text-[#9CA3AF]">{p.timestamp ? new Date(p.timestamp).toLocaleString('en-IN') : ''}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-[#9CA3AF] pt-1.5 border-t border-[#374151]">
                          <div>Prev Due: <strong className="text-red-400">{formatRupees(p.previousDue || 0)}</strong></div>
                          <div>New Due: <strong className="text-emerald-400">{formatRupees(p.remainingDue || 0)}</strong></div>
                          <div>Staff: <strong className="text-[#F3F4F6]">👤 {p.staffName || p.staffUsername || 'Staff'}</strong></div>
                          <div>Ref / Bill: <strong className="text-[#14B8A6]">{p.referenceNo || p.billNumber || 'CASH'}</strong></div>
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#273549] border border-[#374151] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 font-sans">
            <div className="p-4 border-b border-[#374151] bg-[#1F2937] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ArrowDownRight className="w-5 h-5 text-red-400" />
                <h3 className="font-bold text-[#F3F4F6] text-base">Record Customer Due Repayment</h3>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-1 text-[#9CA3AF] hover:text-[#F3F4F6] font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRepayment} className="p-6 space-y-4 text-xs font-sans">
              <div className="p-3 bg-[#1F2937] rounded-xl border border-[#374151] flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#F3F4F6] text-sm">{selectedCustomer.name}</div>
                  <div className="text-[#9CA3AF] font-mono">+91 {selectedCustomer.phone}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#9CA3AF] uppercase font-mono">Current Pending Due</div>
                  <div className="text-lg font-bold text-red-400 font-mono">
                    {formatRupees(selectedCustomer.totalDue)}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[#9CA3AF] font-mono">
                  <label>Repayment Amount (₹)*</label>
                  <button
                    type="button"
                    onClick={() => setPayAmountRupees((selectedCustomer.totalDue / 100).toString())}
                    className="text-[#14B8A6] hover:underline text-[11px] font-bold"
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
                  className="w-full glass-input px-3 py-2 rounded-xl text-base font-mono font-bold text-emerald-400 border-[#374151]"
                />
              </div>

              {/* Live Calculation Preview Box */}
              {payAmountRupees && parseFloat(payAmountRupees) > 0 && (
                <div className="p-3 bg-[#1F2937] rounded-xl border border-[#374151] space-y-1 font-mono text-xs">
                  <div className="flex justify-between text-[#9CA3AF]">
                    <span>Previous Outstanding Due:</span>
                    <span>{formatRupees(selectedCustomer.totalDue || 0)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Repayment Amount:</span>
                    <span>- {formatRupees(rupeesToPaise(payAmountRupees))}</span>
                  </div>
                  <div className="pt-1.5 border-t border-[#374151] flex justify-between font-bold text-[#F3F4F6]">
                    <span>New Balance Remaining:</span>
                    <span className={(selectedCustomer.totalDue || 0) - rupeesToPaise(payAmountRupees) <= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatRupees(Math.max(0, (selectedCustomer.totalDue || 0) - rupeesToPaise(payAmountRupees)))}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[#9CA3AF] font-mono font-semibold">Payment Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {['UPI', 'Cash', 'Card', 'Bank Transfer'].map(m => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPayMethod(m)}
                      className={`py-2 rounded-xl font-mono text-xs font-semibold transition ${
                        payMethod === m ? 'bg-[#14B8A6] text-white shadow-sm' : 'bg-[#1F2937] text-[#9CA3AF] border border-[#374151]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#9CA3AF] font-mono font-semibold mb-1">Reference No / UTR</label>
                  <input
                    type="text"
                    value={refNo}
                    onChange={e => setRefNo(e.target.value)}
                    placeholder="e.g. UPI987654"
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono border-[#374151]"
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] font-mono font-semibold mb-1">Remarks / Notes</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    placeholder="Partial settlement..."
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs border-[#374151]"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-[#374151]">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#1F2937] text-[#9CA3AF] hover:text-[#F3F4F6] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center space-x-1.5 shadow-sm"
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-[#273549] border border-[#374151] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#374151] bg-[#1F2937] flex items-center justify-between">
              <h3 className="font-bold text-[#F3F4F6] text-base">Add New Customer Profile</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-[#9CA3AF] hover:text-[#F3F4F6] font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block text-[#9CA3AF] font-mono font-semibold mb-1">Mobile Number (10 Digits)*</label>
                <input
                  type="text"
                  maxLength={10}
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full glass-input px-3 py-2 rounded-xl font-mono text-teal-300 font-bold border-[#374151]"
                />
              </div>
              <div>
                <label className="block text-[#9CA3AF] font-mono font-semibold mb-1">Customer Full Name*</label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  placeholder="e.g. Ramesh Electrical Contractor"
                  className="w-full glass-input px-3 py-2 rounded-xl border-[#374151]"
                />
              </div>
              <div>
                <label className="block text-[#9CA3AF] font-mono font-semibold mb-1">Address / Site Details</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={e => setNewCustAddress(e.target.value)}
                  placeholder="Shop #12, Market Complex"
                  className="w-full glass-input px-3 py-2 rounded-xl border-[#374151]"
                />
              </div>
              <div className="pt-3 flex justify-end space-x-2 border-t border-[#374151]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1F2937] text-[#9CA3AF] hover:text-[#F3F4F6] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold shadow-sm"
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
