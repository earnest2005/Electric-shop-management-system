import React from 'react';
import { X, Play, Trash2, Clock, ShoppingBag, User } from 'lucide-react';
import { formatRupees } from '../utils/currency';

export default function DraftInvoicesModal({ draftInvoices, onResumeDraft, onDeleteDraft, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-dark-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-800 bg-dark-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-amber-400">
            <Clock className="w-5 h-5" />
            <h3 className="font-extrabold text-white text-base">Held Draft Invoices ({draftInvoices.length})</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {draftInvoices.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
              <p className="text-xs font-mono">No held draft bills found.</p>
              <p className="text-[11px] text-slate-500">You can hold any active bill on the POS screen by clicking "Hold Bill" (F8).</p>
            </div>
          ) : (
            draftInvoices.map((draft) => (
              <div
                key={draft.id}
                className="bg-dark-800/90 border border-slate-700/60 hover:border-amber-500/40 p-3.5 rounded-xl flex items-center justify-between transition group shadow-md"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-bold text-white flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      {draft.customerName || 'Walk-in Customer'}
                    </span>
                    {draft.customerPhone && (
                      <span className="text-slate-400 font-mono text-[11px]">({draft.customerPhone})</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
                    <span>🛒 {draft.cart?.length || 0} Items</span>
                    <span>•</span>
                    <span className="text-amber-400 font-bold">{formatRupees(draft.totalAmount || 0)}</span>
                    <span>•</span>
                    <span>{new Date(draft.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onResumeDraft(draft)}
                    className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-3 py-1.5 rounded-lg transition shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Resume</span>
                  </button>
                  <button
                    onClick={() => onDeleteDraft(draft.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Discard Draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-dark-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
