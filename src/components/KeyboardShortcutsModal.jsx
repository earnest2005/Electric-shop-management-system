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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-[#273549] border border-[#374151] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-[#374151] bg-[#1F2937] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#14B8A6]">
            <Keyboard className="w-5 h-5" />
            <h3 className="font-extrabold text-[#F3F4F6] text-base">Counter Keyboard Hotkeys</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9CA3AF] hover:text-[#F3F4F6] rounded-lg hover:bg-[#374151] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-[#9CA3AF]">
            Use these keyboard shortcuts on the POS billing screen for maximum cashier speed:
          </p>
          <div className="space-y-2">
            {shortcuts.map((s, idx) => (
              <div key={idx} className="bg-[#1F2937] p-3 rounded-xl border border-[#374151] flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-[#F3F4F6] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#14B8A6] fill-[#14B8A6]" />
                    <span>{s.action}</span>
                  </div>
                  <div className="text-[11px] text-[#9CA3AF]">{s.desc}</div>
                </div>
                <span className="bg-teal-500/10 text-teal-300 border border-teal-500/30 px-2.5 py-1 rounded-lg font-mono font-bold text-xs shadow-sm">
                  {s.key}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-[#374151] bg-[#1F2937] text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-sm transition"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
}

