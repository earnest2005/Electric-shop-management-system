import React, { useState, useEffect } from 'react';
import { 
  Tag, Plus, Trash2, Edit3, CheckCircle2, XCircle, Sparkles, 
  Calendar, Percent, DollarSign, Image, Zap, AlertCircle, Eye, MessageSquare
} from 'lucide-react';
import { formatRupees, formatNumberIN } from '../utils/currency';
import { getOffers, saveOffer, deleteOffer, SEED_OFFERS } from '../services/db';
import { shareOfferWhatsApp } from '../services/whatsappService';
import { useAlert } from '../context/AlertContext';

export default function OfferManagement() {
  const { toast } = useAlert();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [offerType, setOfferType] = useState('Percentage Discount');
  const [discountValue, setDiscountValue] = useState(10);
  const [applicableCategories, setApplicableCategories] = useState('Lighting');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10));
  const [status, setStatus] = useState('active');

  const loadData = async () => {
    setLoading(true);
    const oList = await getOffers();
    setOffers(oList.length > 0 ? oList : SEED_OFFERS);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('volt_db_updated', loadData);
    return () => window.removeEventListener('volt_db_updated', loadData);
  }, []);

  const handleOpenAdd = () => {
    setEditingOffer(null);
    setTitle('');
    setDescription('');
    setBannerImage('');
    setOfferType('Percentage Discount');
    setDiscountValue(10);
    setApplicableCategories('Lighting');
    setMinPurchaseAmount(0);
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10));
    setStatus('active');
    setShowModal(true);
  };

  const handleOpenEdit = (offer) => {
    setEditingOffer(offer);
    setTitle(offer.title || '');
    setDescription(offer.description || '');
    setBannerImage(offer.bannerImage || '');
    setOfferType(offer.offerType || 'Percentage Discount');
    setDiscountValue(offer.discountValue || 0);
    setApplicableCategories(
      Array.isArray(offer.applicableCategories) 
        ? offer.applicableCategories.join(', ') 
        : (offer.applicableCategories || 'ALL')
    );
    setMinPurchaseAmount(offer.minPurchaseAmount || 0);
    setStartDate(offer.startDate || new Date().toISOString().slice(0, 10));
    setEndDate(offer.endDate || new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10));
    setStatus(offer.status || 'active');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const offerObj = {
      id: editingOffer ? editingOffer.id : `OFFER-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      bannerImage: bannerImage.trim(),
      offerType,
      discountValue: Number(discountValue || 0),
      applicableCategories: applicableCategories.split(',').map(c => c.trim()).filter(Boolean),
      minPurchaseAmount: Number(minPurchaseAmount || 0),
      startDate,
      endDate,
      status
    };

    await saveOffer(offerObj);
    setShowModal(false);
    loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this promotional offer?")) {
      await deleteOffer(id);
      loadData();
    }
  };

  const handleToggleStatus = async (offer) => {
    const updated = {
      ...offer,
      status: offer.status === 'active' ? 'inactive' : 'active'
    };
    await saveOffer(updated);
    loadData();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Banner */}
      <div className="bg-[#273549] p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 border border-[#374151] shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-500/10 text-[#14B8A6] rounded-2xl border border-teal-500/20">
            <Tag className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-[#F3F4F6] tracking-tight">
              Offer & Promotion Management
            </h2>
            <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">
              Configure promotional discounts, buy-x-get-y offers, and active store banners
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center space-x-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE NEW OFFER</span>
        </button>
      </div>

      {/* Active Store Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map(offer => {
          const isActive = offer.status === 'active';
          return (
            <div 
              key={offer.id}
              className={`bg-[#273549] p-5 rounded-3xl border transition space-y-4 flex flex-col justify-between shadow-sm ${
                isActive 
                  ? 'border-teal-500/40 bg-gradient-to-b from-[#273549] to-[#1F2937]' 
                  : 'border-[#374151] opacity-60'
              }`}
            >
              <div className="space-y-3">
                {/* Banner image preview if exists */}
                {offer.bannerImage ? (
                  <div className="h-32 rounded-2xl overflow-hidden relative border border-[#374151]">
                    <img 
                      src={offer.bannerImage} 
                      alt={offer.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/80 to-transparent"></div>
                  </div>
                ) : null}

                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2.5 py-1 rounded-full uppercase">
                      {offer.offerType}
                    </span>
                    <h3 className="font-extrabold text-[#F3F4F6] text-lg mt-2 tracking-tight">
                      {offer.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(offer)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition flex items-center space-x-1 ${
                      isActive 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                  </button>
                </div>

                <p className="text-xs text-[#9CA3AF] leading-relaxed font-sans">
                  {offer.description || 'No detailed description provided.'}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-[#374151] text-xs font-mono text-[#9CA3AF]">
                  <div className="flex justify-between">
                    <span>Discount Value:</span>
                    <strong className="text-[#14B8A6] font-bold">
                      {offer.offerType === 'Percentage Discount' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span>Min Purchase:</span>
                    <span className="text-[#F3F4F6] font-bold">
                      {offer.minPurchaseAmount ? `₹${offer.minPurchaseAmount}` : 'No Minimum'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Applicable Category:</span>
                    <span className="text-[#F3F4F6] font-bold truncate max-w-[150px]">
                      {Array.isArray(offer.applicableCategories) ? offer.applicableCategories.join(', ') : 'ALL'}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span>Valid Dates:</span>
                    <span className="text-[#9CA3AF]">
                      {offer.startDate} to {offer.endDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#374151] flex items-center justify-between">
                <button
                  onClick={() => shareOfferWhatsApp(offer, '', toast)}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition text-xs font-mono font-bold flex items-center space-x-1"
                  title="Share Offer via WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleOpenEdit(offer)}
                    className="px-3 py-1.5 bg-[#1F2937] hover:bg-[#1F2937]/80 text-[#F3F4F6] border border-[#374151] rounded-xl transition text-xs font-mono font-bold flex items-center space-x-1"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#14B8A6]" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDelete(offer.id)}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition text-xs font-mono font-bold flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Form for Create / Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-[#111827]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#273549] border border-[#374151] rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#374151] pb-3">
              <h3 className="font-extrabold text-[#F3F4F6] text-lg font-sans">
                {editingOffer ? 'Edit Offer Configuration' : 'Create New Promotional Offer'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#9CA3AF] hover:text-[#F3F4F6] font-bold">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-mono text-[#9CA3AF] font-semibold">Offer Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. 10% OFF on LED Bulbs"
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#1F2937] border-[#374151] text-[#F3F4F6]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono text-[#9CA3AF] font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe promotional terms..."
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#1F2937] border-[#374151] text-[#F3F4F6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-mono text-[#9CA3AF] font-semibold">Offer Type</label>
                  <select
                    value={offerType}
                    onChange={e => setOfferType(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono text-[#F3F4F6] bg-[#1F2937] border-[#374151]"
                  >
                    <option value="Percentage Discount">Percentage Discount (% OFF)</option>
                    <option value="Flat Discount">Flat Discount (₹ OFF)</option>
                    <option value="Buy X Get Y">Buy X Get Y Free</option>
                    <option value="Seasonal Clearance">Seasonal Clearance</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-mono text-[#9CA3AF] font-semibold">Discount Value</label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    placeholder="e.g. 10 or 500"
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#1F2937] border-[#374151] text-[#F3F4F6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-mono text-[#9CA3AF] font-semibold">Applicable Categories</label>
                  <input
                    type="text"
                    value={applicableCategories}
                    onChange={e => setApplicableCategories(e.target.value)}
                    placeholder="Lighting, Switches & Sockets, ALL"
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#1F2937] border-[#374151] text-[#F3F4F6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-mono text-[#9CA3AF] font-semibold">Min Purchase Amount (₹)</label>
                  <input
                    type="number"
                    value={minPurchaseAmount}
                    onChange={e => setMinPurchaseAmount(e.target.value)}
                    placeholder="0"
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#1F2937] border-[#374151] text-[#F3F4F6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-mono text-[#9CA3AF] font-semibold">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono text-[#F3F4F6] bg-[#1F2937] border-[#374151]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-mono text-[#9CA3AF] font-semibold">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono text-[#F3F4F6] bg-[#1F2937] border-[#374151]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono text-[#9CA3AF] font-semibold">Banner Image URL (Optional)</label>
                <input
                  type="text"
                  value={bannerImage}
                  onChange={e => setBannerImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#1F2937] border-[#374151] text-[#F3F4F6]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono text-[#9CA3AF] font-semibold">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono text-[#F3F4F6] bg-[#1F2937] border-[#374151]"
                >
                  <option value="active">Active (Visible to Staff & POS)</option>
                  <option value="inactive">Inactive (Hidden)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-sm transition"
              >
                {editingOffer ? 'SAVE CHANGES' : 'CREATE OFFER'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
