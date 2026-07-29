import React from 'react';
import { MessageSquare } from 'lucide-react';
import { openWhatsAppChat } from '../services/whatsappService';
import { useAlert } from '../context/AlertContext';

/**
 * Small WhatsApp Icon Badge displayed beside customer mobile numbers.
 * Clicking immediately opens WhatsApp chat with the customer.
 */
export default function WhatsAppPhoneBadge({ phone, className = '', showNumber = true }) {
  const { toast } = useAlert();

  const handleWhatsAppClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openWhatsAppChat(phone, '', toast);
  };

  if (!phone) {
    return <span className="text-[#9CA3AF]">N/A</span>;
  }

  return (
    <span className={`inline-flex items-center space-x-1 font-mono text-xs ${className}`}>
      {showNumber && <span>{phone}</span>}
      <button
        type="button"
        onClick={handleWhatsAppClick}
        title={`Chat with ${phone} on WhatsApp`}
        className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 bg-emerald-500/10 border border-emerald-500/30 rounded-lg transition inline-flex items-center justify-center shrink-0 min-w-[24px] min-h-[24px]"
      >
        <MessageSquare className="w-3 h-3 fill-emerald-400/20" />
      </button>
    </span>
  );
}
