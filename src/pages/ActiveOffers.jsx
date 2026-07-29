import React, { useState, useEffect } from 'react';
import { Tag, Sparkles, Calendar, CheckCircle2, ShoppingBag, MessageSquare } from 'lucide-react';
import { getOffers, SEED_OFFERS } from '../services/db';
import { shareOfferWhatsApp } from '../services/whatsappService';
import { useAlert } from '../context/AlertContext';

export default function ActiveOffers({ onNavigate }) {
  const { toast } = useAlert();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const oList = await getOffers();
    const activeOnly = (oList.length > 0 ? oList : SEED_OFFERS).filter(o => o.status === 'active');
    setOffers(activeOnly);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('volt_db_updated', loadData);
    return () => window.removeEventListener('volt_db_updated', loadData);
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans selection:bg-teal-500 selection:text-white">
      {/* Header Banner */}
      <div className="bg-[#273549] p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 border border-[#374151] shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-500/10 text-[#14B8A6] rounded-2xl border border-teal-500/20">
            <Tag className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-[#F3F4F6] tracking-tight">
              Active Store Offers & Promotions
            </h2>
            <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">
              Inform customers about active promotional campaigns during checkout
            </p>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('pos')}
            className="px-5 py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center space-x-2 shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>GO TO POS BILLING</span>
          </button>
        )}
      </div>

      {/* Offers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-[#9CA3AF] font-mono">
            No active promotional offers currently published by store management.
          </div>
        ) : (
          offers.map(offer => (
            <div 
              key={offer.id}
              className="bg-[#273549] p-5 rounded-3xl border border-[#374151] bg-gradient-to-b from-[#273549] to-[#1F2937] space-y-4 flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-3">
                {offer.bannerImage ? (
                  <div className="h-36 rounded-2xl overflow-hidden relative border border-[#374151]">
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
                  <span className="text-[10px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2.5 py-1 rounded-full uppercase">
                    {offer.offerType}
                  </span>
                  <span className="text-xs font-mono font-extrabold text-[#14B8A6] bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
                    {offer.offerType === 'Percentage Discount' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                  </span>
                </div>

                <h3 className="font-extrabold text-[#F3F4F6] text-lg tracking-tight">
                  {offer.title}
                </h3>

                <p className="text-xs text-[#9CA3AF] leading-relaxed font-sans">
                  {offer.description}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-[#374151] text-xs font-mono text-[#9CA3AF]">
                  <div className="flex justify-between">
                    <span>Applicable Category:</span>
                    <span className="text-[#F3F4F6] font-bold">
                      {Array.isArray(offer.applicableCategories) ? offer.applicableCategories.join(', ') : 'ALL'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Min Purchase:</span>
                    <span className="text-[#F3F4F6] font-bold">
                      {offer.minPurchaseAmount ? `₹${offer.minPurchaseAmount}` : 'No Minimum'}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span>Validity:</span>
                    <span className="text-[#9CA3AF]">
                      {offer.startDate} to {offer.endDate}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#374151] flex items-center justify-between">
                <div className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>POS READY</span>
                </div>
                <button
                  onClick={() => shareOfferWhatsApp(offer, '', toast)}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition text-xs font-mono font-bold flex items-center space-x-1"
                  title="Share Offer via WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Share Offer</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
