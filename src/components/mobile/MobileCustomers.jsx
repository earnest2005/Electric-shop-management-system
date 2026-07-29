import React, { useState, useEffect } from 'react';
import { Users, Search, Phone, MessageSquare, PlusCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { formatRupees } from '../../utils/currency';
import { getCustomers, saveCustomer } from '../../services/db';
import { sendDueReminderWhatsApp } from '../../services/whatsappService';
import { useAlert } from '../../context/AlertContext';
import WhatsAppPhoneBadge from '../WhatsAppPhoneBadge';

export default function MobileCustomers() {
  const { toast } = useAlert();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCustomers();
    const handleUpdate = () => loadCustomers();
    window.addEventListener('volt_db_updated', handleUpdate);
    return () => window.removeEventListener('volt_db_updated', handleUpdate);
  }, []);

  async function loadCustomers() {
    setLoading(true);
    const data = await getCustomers();
    setCustomers(data || []);
    setLoading(false);
  }

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('Customer Name and Mobile are required', 'Validation Error');
      return;
    }
    setIsSaving(true);
    try {
      const custData = {
        id: `cust_${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || 'Local Customer',
        totalPurchases: 0,
        totalDue: 0,
        createdAt: new Date().toISOString()
      };
      await saveCustomer(custData);
      toast.success('New customer profile created!', 'Customer Saved');
      setShowAddModal(false);
      setName('');
      setPhone('');
      setAddress('');
      loadCustomers();
    } catch (err) {
      toast.error(err.message, 'Save Error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4 font-sans max-w-md mx-auto selection:bg-teal-500 selection:text-white">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#F3F4F6] font-sans flex items-center gap-2">
            <Users className="w-6 h-6 text-[#14B8A6]" /> Customer Records
          </h2>
          <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">
            {filteredCustomers.length} Registered Accounts
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-3 py-2 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1 min-h-[40px]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Customer</span>
        </button>
      </div>

      {/* Clean Single Mobile Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name or phone..."
          className="w-full pl-11 pr-4 py-3 bg-[#1F2937] border border-[#374151] rounded-2xl text-sm text-[#F3F4F6] placeholder-[#9CA3AF] focus:outline-none focus:border-[#14B8A6] shadow-sm"
        />
      </div>

      {/* Stacked Customer Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#9CA3AF] font-mono">Loading customer records...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center bg-[#1E293B] border border-[#374151] rounded-2xl text-xs text-[#9CA3AF] font-mono">
            No customers matching your search.
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const hasDue = (c.totalDue || 0) > 0;

            return (
              <div 
                key={c.id || c.phone}
                className="bg-[#1E293B] border border-[#374151] rounded-2xl p-4 shadow-sm space-y-3"
              >
                {/* Header: Name & Due Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#14B8A6] text-white flex items-center justify-center font-extrabold text-sm shadow-sm shrink-0">
                      {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#F3F4F6]">
                        {c.name}
                      </h3>
                      <WhatsAppPhoneBadge phone={c.phone} />
                    </div>
                  </div>

                  {hasDue ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-xl shrink-0">
                      Due: {formatRupees(c.totalDue)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl shrink-0">
                      Clear Dues
                    </span>
                  )}
                </div>

                {/* Purchase Summary */}
                <div className="bg-[#1F2937] p-2.5 rounded-xl text-xs font-mono flex items-center justify-between">
                  <span className="text-[#9CA3AF]">TOTAL PURCHASES:</span>
                  <strong className="text-emerald-400 font-bold">{formatRupees(c.totalPurchases || 0)}</strong>
                </div>

                {/* Action Buttons Grid (Min 48px Touch Buttons) */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`tel:${c.phone}`}
                    className="min-h-[48px] bg-[#273549] hover:bg-[#374151] text-[#F3F4F6] border border-[#374151] font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition"
                  >
                    <Phone className="w-4 h-4 text-teal-400" />
                    <span>CALL</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => sendDueReminderWhatsApp(c, toast)}
                    className="min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WHATSAPP</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-[#374151] rounded-2xl w-full max-w-sm p-4 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-base text-[#F3F4F6]">New Customer Profile</h3>
            <form onSubmit={handleAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#9CA3AF] font-mono mb-1">Customer Name*</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-3 bg-[#1F2937] border border-[#374151] rounded-xl text-sm text-[#F3F4F6]"
                  placeholder="e.g. Ramesh Patel"
                />
              </div>
              <div>
                <label className="block text-[#9CA3AF] font-mono mb-1">Mobile Number*</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full p-3 bg-[#1F2937] border border-[#374151] rounded-xl text-sm text-[#F3F4F6]"
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div>
                <label className="block text-[#9CA3AF] font-mono mb-1">Address / Location</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full p-3 bg-[#1F2937] border border-[#374151] rounded-xl text-sm text-[#F3F4F6]"
                  placeholder="e.g. Main Market, Sector 2"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-3 min-h-[44px] bg-[#273549] text-[#9CA3AF] font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-3 min-h-[44px] bg-[#14B8A6] text-white font-extrabold rounded-xl"
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
