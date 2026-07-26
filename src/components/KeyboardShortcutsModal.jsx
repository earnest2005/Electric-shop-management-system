import React from 'react';
import { X, Keyboard, Zap } from 'lucide-react';

export default function KeyboardShortcutsModal({ onClose }) {
  const shortcuts = [
    { key: 'F2', action: 'Focus Barcode Scanner Input', desc: 'Instantly jump to product barcode scanner' },
    { key: 'F4', action: 'Focus Customer Lookup', desc: 'Jump to customer phone search' },
    { key: 'F8', action: 'Hold Bill Draft', desc: 'Save current active bill to held drafts' },
    { key: 'F9', action: 'Full Pay Settlement', desc: 'Fill full payment amount in 1 click' },
    { key: 'Esc', action: 'Clear Input / Close Modal', desc: 'Close any active popup or dropdown' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-dark-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 bg-dark-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-amber-400">
            <Keyboard className="w-5 h-5" />
            <h3 className="font-extrabold text-white text-base">Counter Keyboard Hotkeys</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-400">
            Use these keyboard shortcuts on the POS billing screen for maximum cashier speed:
          </p>
          <div className="space-y-2">
            {shortcuts.map((s, idx) => (
              <div key={idx} className="bg-dark-800/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{s.action}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{s.desc}</div>
                </div>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg font-mono font-bold text-xs shadow-sm">
                  {s.key}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-dark-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow-lg transition"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
}
