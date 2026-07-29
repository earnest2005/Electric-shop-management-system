import { formatRupees, formatNumberIN } from '../utils/currency';

/**
 * Modular WhatsApp Integration Service
 * 
 * Centralized service for validating mobile numbers, generating pre-filled
 * formatted messages, and triggering WhatsApp Click-to-Chat (wa.me).
 * 
 * Designed to easily transition to the official WhatsApp Business Cloud API
 * without requiring architecture or component level refactoring.
 */

/**
 * Validates and cleans a customer mobile number.
 * Returns formatted number with country code (defaults to 91 for Indian numbers).
 */
export function validateMobile(phone) {
  if (!phone) {
    return { isValid: false, phoneWithCode: '', error: 'Customer mobile number is not available.' };
  }
  
  const cleanPhone = String(phone).replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    return { isValid: false, phoneWithCode: '', error: 'Customer mobile number is not available.' };
  }

  // Prepend 91 for standard 10-digit Indian numbers
  const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  return { isValid: true, phoneWithCode, cleanPhone, error: null };
}

/**
 * Direct Click-to-Chat trigger in a new tab/window.
 */
export function openWhatsAppChat(phone, messageText = '', toast = null) {
  const validation = validateMobile(phone);
  
  if (!validation.isValid) {
    const errorMsg = validation.error || "Customer mobile number is not available.";
    if (toast && typeof toast.error === 'function') {
      toast.error(errorMsg, "WhatsApp Error");
    } else if (typeof window !== 'undefined' && window.alert) {
      window.alert(errorMsg);
    }
    return false;
  }

  const encodedMsg = encodeURIComponent(messageText);
  const waUrl = `https://wa.me/${validation.phoneWithCode}${encodedMsg ? `?text=${encodedMsg}` : ''}`;
  
  window.open(waUrl, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Formats a completed billing invoice for WhatsApp.
 */
export function generateInvoiceMessage(invoice, shopName = 'VOLT ELECTRICALS') {
  const billNumber = invoice.billNumber || invoice.id || 'N/A';
  const custName = invoice.customer?.name || invoice.customerName || 'Valued Customer';
  
  // Convert amount from paise or rupees properly
  const totalAmountPaise = invoice.totalAmount || 0;
  const dueAmountPaise = invoice.dueAmount || 0;
  const isPaid = dueAmountPaise <= 0;
  
  let paymentStatusStr = 'Paid';
  if (!isPaid) {
    paymentStatusStr = `Pending Due (${formatRupees(dueAmountPaise)})`;
  }

  return [
    shopName.toUpperCase(),
    '',
    'Thank you for shopping with us.',
    '',
    'Invoice Number:',
    billNumber,
    '',
    'Customer:',
    custName,
    '',
    'Bill Amount:',
    formatRupees(totalAmountPaise),
    '',
    'Payment Status:',
    paymentStatusStr,
    '',
    `Thank you for visiting ${shopName}.`
  ].join('\n');
}

/**
 * Sends formatted Invoice summary via WhatsApp.
 */
export function sendInvoiceWhatsApp(invoice, toast = null) {
  const phone = invoice.customer?.phone || invoice.customerPhone;
  const messageText = generateInvoiceMessage(invoice);
  return openWhatsAppChat(phone, messageText, toast);
}

/**
 * Formats an Estimate / Quotation for WhatsApp.
 */
export function generateEstimateMessage(estimateData, shopName = 'VOLT ELECTRICALS', shopPhone = '+91 9876543210') {
  const estimateNum = estimateData.billNumber || 'EST-' + Date.now().toString().slice(-6);
  const custName = estimateData.customerName || 'Valued Customer';
  const totalPaise = estimateData.totalAmountPaise || estimateData.totalAmount || 0;
  const validity = estimateData.validity || 'Valid for 7 days';

  return [
    shopName.toUpperCase(),
    '',
    'Estimated Price Quote',
    '',
    'Estimate Number:',
    estimateNum,
    '',
    'Customer Name:',
    custName,
    '',
    'Estimated Amount:',
    formatRupees(totalPaise),
    '',
    'Estimate Validity:',
    validity,
    '',
    'Shop Contact:',
    shopPhone,
    '',
    `Thank you for consulting ${shopName}.`
  ].join('\n');
}

/**
 * Sends Estimate via WhatsApp.
 */
export function sendEstimateWhatsApp(estimateData, toast = null) {
  const phone = estimateData.customerPhone || estimateData.phone;
  const messageText = generateEstimateMessage(estimateData);
  return openWhatsAppChat(phone, messageText, toast);
}

/**
 * Formats Due Payment Reminder for WhatsApp.
 */
export function generateDueReminderMessage(customer, shopName = 'VOLT ELECTRICALS') {
  const custName = customer.name || 'Valued Customer';
  const duePaise = customer.totalDue || 0;

  return [
    `Hello ${custName},`,
    '',
    `This is a friendly reminder that your outstanding balance is ${formatRupees(duePaise)}.`,
    '',
    `Please visit ${shopName.toUpperCase()} to complete the payment.`,
    '',
    'Thank you.'
  ].join('\n');
}

/**
 * Sends Due Payment Reminder via WhatsApp.
 */
export function sendDueReminderWhatsApp(customer, toast = null) {
  const phone = customer.phone;
  const messageText = generateDueReminderMessage(customer);
  return openWhatsAppChat(phone, messageText, toast);
}

/**
 * Formats Promotional Offer for WhatsApp.
 */
export function generateOfferMessage(offer, shopName = 'VOLT ELECTRICALS') {
  const offerTitle = offer.title || 'Special Promotion';
  const discountStr = offer.offerType === 'Percentage Discount' 
    ? `${offer.discountValue}% OFF` 
    : offer.offerType === 'Flat Discount' 
      ? `₹${offer.discountValue} OFF` 
      : `${offer.offerType}`;
  
  const validUntilStr = offer.endDate 
    ? new Date(offer.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : 'Limited Period';

  return [
    `🎉 Special Offer from ${shopName.toUpperCase()}`,
    '',
    `${offerTitle}`,
    `${discountStr} on selected electrical products.`,
    '',
    `Valid until ${validUntilStr}.`,
    '',
    'Visit us today.'
  ].join('\n');
}

/**
 * Sends Promotional Offer via WhatsApp to a target customer phone or broadcasts via wa.me link.
 */
export function sendOfferWhatsApp(offer, targetPhone, toast = null) {
  const messageText = generateOfferMessage(offer);
  return openWhatsAppChat(targetPhone, messageText, toast);
}

export function shareOfferWhatsApp(offer, targetPhone = '', toast = null) {
  const messageText = generateOfferMessage(offer);
  if (!targetPhone) {
    const encodedMsg = encodeURIComponent(messageText);
    window.open(`https://wa.me/?text=${encodedMsg}`, '_blank', 'noopener,noreferrer');
    return true;
  }
  return openWhatsAppChat(targetPhone, messageText, toast);
}

const whatsappService = {
  validateMobile,
  openWhatsAppChat,
  generateInvoiceMessage,
  sendInvoiceWhatsApp,
  generateEstimateMessage,
  sendEstimateWhatsApp,
  generateDueReminderMessage,
  sendDueReminderWhatsApp,
  generateOfferMessage,
  sendOfferWhatsApp,
  shareOfferWhatsApp
};

export default whatsappService;
