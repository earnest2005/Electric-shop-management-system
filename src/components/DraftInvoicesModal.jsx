import React from 'react';
import { X, Play, Trash2, Clock, ShoppingBag, User } from 'lucide-react';
import { formatRupees } from '../utils/currency';

export default function DraftInvoicesModal({ draftInvoices, onResumeDraft, onDeleteDraft, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-[#273549] border border-[#374151] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-[#374151] bg-[#1F2937] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#14B8A6]">
            <Clock className="w-5 h-5" />
            <h3 className="font-extrabold text-[#F3F4F6] text-base">Held Draft Invoices ({draftInvoices.length})</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9CA3AF] hover:text-[#F3F4F6] rounded-lg hover:bg-[#374151] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {draftInvoices.length === 0 ? (
            <div className="py-12 text-center text-[#9CA3AF] space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto text-[#9CA3AF] opacity-50" />
              <p className="text-xs font-mono">No held draft bills found.</p>
              <p className="text-[11px] text-[#9CA3AF]">You can hold any active bill on the POS screen by clicking "Hold Bill" (F8).</p>
            </div>
          ) : (
            draftInvoices.map((draft) => (
              <div
                key={draft.id}
                className="bg-[#1F2937] border border-[#374151] hover:border-teal-500/50 p-3.5 rounded-xl flex items-center justify-between transition group shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-bold text-[#F3F4F6] flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#14B8A6]" />
                      {draft.customerName || 'Walk-in Customer'}
                    </span>
                    {draft.customerPhone && (
                      <span className="text-[#9CA3AF] font-mono text-[11px]">({draft.customerPhone})</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-[#9CA3AF] font-mono">
                    <span>🛒 {draft.cart?.length || 0} Items</span>
                    <span>•</span>
                    <span className="text-[#14B8A6] font-bold">{formatRupees(draft.totalAmount || 0)}</span>
                    <span>•</span>
                    <span>{new Date(draft.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onResumeDraft(draft)}
                    className="flex items-center space-x-1.5 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs px-3 py-1.5 rounded-lg transition shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Resume</span>
                  </button>
                  <button
                    onClick={() => onDeleteDraft(draft.id)}
                    className="p-1.5 text-[#9CA3AF] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Discard Draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-[#374151] bg-[#1F2937] text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#374151] hover:bg-[#4B5563] text-[#F3F4F6] font-bold text-xs rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

