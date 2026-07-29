import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, ShoppingCart, Trash2, User, UserCheck, UserPlus,
  AlertTriangle, Zap, FileText, PauseCircle, RotateCcw, Printer, Clock, FileCheck, MessageSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatRupees, rupeesToPaise, paiseToRupees, formatNumberIN } from '../utils/currency';
import { getProducts, processSaleBatch, getPurchases, getCustomers, getOffers, generateNextInvoiceNumber } from '../services/db';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { printReceiptHtml } from '../utils/print';
import { sendEstimateWhatsApp } from '../services/whatsappService';
import WhatsAppPhoneBadge from '../components/WhatsAppPhoneBadge';

export default function POSBilling({ onCompleteSale, onResumeDraftData }) {
  const { toast } = useAlert();
  const { user, userRole } = useAuth();
  const [products, setProducts] = useState([]);
  const [activeOffers, setActiveOffers] = useState([]);

  // Session Unique Fixed Invoice Number State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  
  // Real-time Top Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Product Search & Autocomplete State
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Cart state
  const [cart, setCart] = useState([]);
  const [discountRupees, setDiscountRupees] = useState('');
  const [lastRemovedItem, setLastRemovedItem] = useState(null);

  // Customer state
  const [allCustomers, setAllCustomers] = useState([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // Cash, UPI, Card, Credit/Due
  const [paidRupees, setPaidRupees] = useState('');

  // Processing state
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // DOM Refs for Fast Keyboard Navigation
  const productSearchRef = useRef(null);
  const qtyInputRefs = useRef({});
  const customerPhoneRef = useRef(null);
  const customerNameRef = useRef(null);
  const paymentMethodRef = useRef(null);
  const discountRef = useRef(null);
  const paidAmountRef = useRef(null);
  const completeSaleBtnRef = useRef(null);
  const printBtnRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // Initialize Fixed Unique Invoice Number on Mount
  const fetchNextInvoiceNumber = async () => {
    const num = await generateNextInvoiceNumber();
    setInvoiceNumber(num);
  };

  useEffect(() => {
    fetchNextInvoiceNumber();
  }, []);

  // Focus product search on initial load
  useEffect(() => {
    if (productSearchRef.current) {
      productSearchRef.current.focus();
    }
  }, []);

  // If a draft bill was requested to resume from parent App
  useEffect(() => {
    if (onResumeDraftData) {
      setCart(onResumeDraftData.cart || []);
      setCustomerPhone(onResumeDraftData.customerPhone || '');
      setCustomerName(onResumeDraftData.customerName || '');
      setCustomerAddress(onResumeDraftData.customerAddress || '');
      toast.info("Resumed draft bill into cart", "Draft Resumed");
    }
  }, [onResumeDraftData]);

  // Bind Counter Hotkeys
  useKeyboardShortcuts({
    onF2: () => {
      if (productSearchRef.current) {
        productSearchRef.current.focus();
        setIsSearchOpen(true);
      }
    },
    onF4: () => {
      if (customerPhoneRef.current) customerPhoneRef.current.focus();
    },
    onF8: () => {
      handleHoldBill();
    },
    onF9: () => {
      if (totalAmountPaise > 0) {
        setPaidRupees((totalAmountPaise / 100).toString());
      }
    },
    onEsc: () => {
      setShowCustomerSuggestions(false);
      setIsSearchOpen(false);
    }
  });

  // Load products, recent sales, and customers
  const loadData = async () => {
    const prods = await getProducts();
    setProducts(prods);
    const purchases = await getPurchases();
    setRecentPurchases(purchases.slice(0, 5));
    const custs = await getCustomers();
    setAllCustomers(custs);
    const offers = await getOffers();
    setActiveOffers(offers.filter(o => o.status === 'active'));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('volt_db_updated', loadData);
    return () => window.removeEventListener('volt_db_updated', loadData);
  }, []);

  // Filtered matching products for search autocomplete dropdown
  const searchTrimmed = searchQuery.trim();
  const searchLower = searchTrimmed.toLowerCase();

  const matchingProducts = useMemo(() => {
    if (!searchLower) return [];
    return products.filter(p => {
      const pName = (p.productName || '').toLowerCase();
      const pBrand = (p.brand || '').toLowerCase();
      const pCode = (p.productCode || p.barcode || '').toLowerCase();
      const pBarcode = (p.barcode || '').toLowerCase();

      return (
        pName.includes(searchLower) ||
        pBrand.includes(searchLower) ||
        pCode.includes(searchLower) ||
        pBarcode.includes(searchLower)
      );
    }).slice(0, 15);
  }, [products, searchLower]);

  useEffect(() => {
    setHighlightedIndex(0);
    if (searchTrimmed.length > 0) {
      setIsSearchOpen(true);
    }
  }, [searchQuery]);

  const handleSelectProduct = (product) => {
    if (!product) return;
    addToCart(product);
    setSearchQuery('');
    setIsSearchOpen(false);
    setHighlightedIndex(0);

    // Immediately move focus to Quantity field for newly added product!
    setTimeout(() => {
      const qtyInput = qtyInputRefs.current[product.barcode];
      if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
      }
    }, 50);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isSearchOpen) setIsSearchOpen(true);
      setHighlightedIndex(prev => (prev < matchingProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isSearchOpen) setIsSearchOpen(true);
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, matchingProducts.length - 1)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matchingProducts.length > 0) {
        const selected = matchingProducts[highlightedIndex] || matchingProducts[0];
        if (selected) {
          handleSelectProduct(selected);
        }
      } else if (searchTrimmed) {
        const exactMatch = products.find(p => 
          (p.barcode && p.barcode.toLowerCase() === searchLower) ||
          (p.productCode && p.productCode.toLowerCase() === searchLower) ||
          (p.id && p.id.toLowerCase() === searchLower)
        );
        if (exactMatch) {
          handleSelectProduct(exactMatch);
        } else {
          toast.error(`No product found matching "${searchTrimmed}"`, "Item Not Found");
        }
      }
    } else if (e.key === 'Tab' && !searchTrimmed) {
      // Tab from empty Product Search jumps focus to Customer Mobile Number
      e.preventDefault();
      if (customerPhoneRef.current) {
        customerPhoneRef.current.focus();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  // Text Highlighting Helper
  const renderHighlightedText = (text, query) => {
    if (!text) return '';
    if (!query || !query.trim()) return text;
    const q = query.trim();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-teal-500/30 text-teal-200 font-extrabold px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Customer phone live auto-complete lookup
  const cleanPhoneInput = customerPhone.replace(/\D/g, '');
  const matchedCustomers = (cleanPhoneInput.length >= 1 || customerPhone.trim().length >= 1)
    ? allCustomers.filter(c => {
        const pMatch = c.phone && c.phone.replace(/\D/g, '').includes(cleanPhoneInput);
        const nMatch = c.name && c.name.toLowerCase().includes(customerPhone.toLowerCase());
        return pMatch || nMatch;
      })
    : [];

  useEffect(() => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const exact = allCustomers.find(c => c.phone.replace(/\D/g, '') === cleanPhone);
    if (exact) {
      setExistingCustomer(exact);
      setCustomerName(exact.name);
      setCustomerAddress(exact.address || '');
    } else if (cleanPhone.length < 10) {
      setExistingCustomer(null);
    }
  }, [customerPhone, allCustomers]);

  const selectCustomer = (cust) => {
    setCustomerPhone(cust.phone);
    setCustomerName(cust.name);
    setCustomerAddress(cust.address || '');
    setExistingCustomer(cust);
    setShowCustomerSuggestions(false);
    if (customerNameRef.current) customerNameRef.current.focus();
  };

  // Cart operations
  const addToCart = (product) => {
    if (product.currentStock <= 0) {
      toast.warning(`Out of stock: ${product.productName}`, "Out of Stock");
      return;
    }

    setCart(prev => {
      const idx = prev.findIndex(item => item.barcode === product.barcode);
      if (idx >= 0) {
        const updated = [...prev];
        if (updated[idx].qty + 1 > product.currentStock) {
          toast.warning(`Cannot exceed available stock (${product.currentStock})`, "Stock Limit");
          return prev;
        }
        updated[idx].qty += 1;
        updated[idx].total = updated[idx].qty * updated[idx].basePrice;
        return updated;
      } else {
        return [
          ...prev,
          {
            barcode: product.barcode,
            productName: product.productName,
            unitPrice: product.basePrice, // in Paise
            basePrice: product.basePrice, // in Paise
            taxPercent: product.taxPercent || 18,
            currentStock: product.currentStock,
            qty: 1,
            discountPaise: 0,
            total: product.basePrice // in Paise
          }
        ];
      }
    });
  };

  const updateCartQtyExact = (barcode, newQty) => {
    const parsed = parseInt(newQty, 10);
    if (isNaN(parsed) || parsed <= 0) return;
    setCart(prev => {
      return prev.map(item => {
        if (item.barcode === barcode) {
          if (parsed > item.currentStock) {
            toast.warning(`Stock limit reached (${item.currentStock})`, "Stock Limit");
            return {
              ...item,
              qty: item.currentStock,
              total: item.currentStock * item.basePrice - (item.discountPaise || 0)
            };
          }
          return {
            ...item,
            qty: parsed,
            total: parsed * item.basePrice - (item.discountPaise || 0)
          };
        }
        return item;
      });
    });
  };

  const removeFromCart = (barcode) => {
    const itemToRemove = cart.find(item => item.barcode === barcode);
    if (itemToRemove) {
      setLastRemovedItem(itemToRemove);
    }
    setCart(prev => prev.filter(item => item.barcode !== barcode));
    if (productSearchRef.current) productSearchRef.current.focus();
  };

  const undoRemoveItem = () => {
    if (lastRemovedItem) {
      setCart(prev => [...prev, lastRemovedItem]);
      setLastRemovedItem(null);
      toast.info(`Restored "${lastRemovedItem.productName}" to cart`, "Item Restored");
    }
  };

  const handleHoldBill = () => {
    if (cart.length === 0) {
      toast.warning("Cannot hold an empty bill! Add items to cart first.", "Empty Cart");
      return;
    }
    const draft = {
      id: 'DRAFT-' + Date.now(),
      billNumber: invoiceNumber,
      customerPhone,
      customerName,
      customerAddress,
      cart,
      totalAmount: totalAmountPaise,
      createdAt: new Date().toISOString()
    };
    try {
      const existing = JSON.parse(localStorage.getItem('volt_draft_invoices') || '[]');
      const updated = [draft, ...existing];
      localStorage.setItem('volt_draft_invoices', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('volt_drafts_updated'));

      setCart([]);
      setCustomerPhone('');
      setCustomerName('');
      setCustomerAddress('');
      setPaidRupees('');
      setDiscountRupees('');
      setExistingCustomer(null);

      // Generate next unique invoice number for next session
      fetchNextInvoiceNumber();

      toast.success("Active bill saved to Held Drafts!", "Bill Held");
      if (productSearchRef.current) productSearchRef.current.focus();
    } catch (e) {
      toast.error("Failed to hold bill draft", "Draft Error");
    }
  };

  // Estimate Quotation Printer
  const handleSaveEstimate = () => {
    if (cart.length === 0) {
      toast.warning("Cannot generate estimate for an empty cart!", "Empty Cart");
      return;
    }
    const estimateHtml = renderEstimatePrintHtml({
      billNumber: invoiceNumber,
      customerName: customerName || 'Valued Customer',
      customerPhone,
      cart,
      subtotalPaise,
      discountPaise,
      taxPaise,
      totalAmountPaise
    });
    printReceiptHtml(estimateHtml);
    toast.success("Estimate / Quotation generated", "Estimate Ready");
  };

  // Send Estimate via WhatsApp
  const handleSendEstimateWhatsApp = () => {
    if (cart.length === 0) {
      toast.warning("Cannot send estimate for an empty cart!", "Empty Cart");
      return;
    }
    sendEstimateWhatsApp({
      billNumber: invoiceNumber,
      customerName: customerName || 'Valued Customer',
      customerPhone,
      totalAmountPaise,
      validity: 'Valid for 7 days'
    }, toast);
  };

  // Quick Print Receipt Preview
  const handlePrintReceipt = () => {
    if (cart.length === 0) {
      toast.warning("No items in cart to print preview!", "Empty Cart");
      return;
    }
    const receiptHtml = renderEstimatePrintHtml({
      billNumber: invoiceNumber,
      customerName: customerName || 'Valued Customer',
      customerPhone,
      cart,
      subtotalPaise,
      discountPaise,
      taxPaise,
      totalAmountPaise,
      paymentMethod
    });
    printReceiptHtml(receiptHtml);
  };

  // Financial calculations in Paise
  const subtotalPaise = cart.reduce((acc, item) => acc + item.total, 0);
  const discountPaise = rupeesToPaise(discountRupees);
  const taxablePaise = Math.max(0, subtotalPaise - discountPaise);
  // 18% GST inclusive calculation: Tax = Amount * 18 / 118
  const taxPaise = Math.round(taxablePaise * 18 / 118);
  const totalAmountPaise = taxablePaise;

  // Payment calculation logic: leave paidRupees blank for user input
  useEffect(() => {
    if (paymentMethod === 'Credit/Due') {
      setPaidRupees('0');
    }
  }, [paymentMethod]);

  const paidAmountPaise = paymentMethod === 'Credit/Due' 
    ? 0 
    : (paidRupees !== '' ? rupeesToPaise(paidRupees) : 0);

  const dueAmountPaise = Math.max(0, totalAmountPaise - paidAmountPaise);

  // Process Checkout
  const handleCheckout = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (document.activeElement) document.activeElement.blur();

    if (isSubmittingRef.current) return;

    if (cart.length === 0) {
      toast.warning("Cart is empty! Add products first.", "Empty Cart");
      if (productSearchRef.current) productSearchRef.current.focus();
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10) {
      toast.error("Please enter a valid 10-digit Customer Mobile Number.", "Invalid Input");
      if (customerPhoneRef.current) customerPhoneRef.current.focus();
      return;
    }
    if (!customerName.trim()) {
      toast.error("Please enter Customer Name.", "Invalid Input");
      if (customerNameRef.current) customerNameRef.current.focus();
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const staffUsername = user?.username || userRole || 'staff';
      const saleData = {
        billNumber: invoiceNumber, // Use fixed unique session invoice number!
        customer: {
          phone: customerPhone.replace(/\D/g, ''),
          name: customerName.trim(),
          address: customerAddress.trim(),
          totalPurchases: existingCustomer ? existingCustomer.totalPurchases : 0,
          totalDue: existingCustomer ? existingCustomer.totalDue : 0
        },
        items: cart,
        subtotal: subtotalPaise,
        taxAmount: taxPaise,
        discountAmount: discountPaise,
        totalAmount: totalAmountPaise,
        paidAmount: paidAmountPaise,
        dueAmount: dueAmountPaise,
        paymentMethod,
        staffName: staffUsername,
        staff: staffUsername
      };

      const completedRecord = await processSaleBatch(saleData);

      // Trigger Celebration Confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast.success(`Invoice ${completedRecord.billNumber} created successfully!`, "Sale Completed");

      // Reset Billing Form & Customer Details
      setCart([]);
      setDiscountRupees('');
      setCustomerPhone('');
      setCustomerName('');
      setCustomerAddress('');
      setPaidRupees('');
      setExistingCustomer(null);

      // Generate NEXT Unique Invoice Number for the next bill session
      await fetchNextInvoiceNumber();

      if (onCompleteSale) {
        onCompleteSale(completedRecord);
      }

      // Automatically place cursor back into Product Search field for next bill transaction
      setTimeout(() => {
        if (productSearchRef.current) productSearchRef.current.focus();
      }, 100);
    } catch (err) {
      console.error("Sale commit failed:", err);
      toast.error("Failed to complete transaction: " + err.message, "Transaction Error");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const renderEstimatePrintHtml = ({ billNumber, customerName, customerPhone, cart, subtotalPaise, discountPaise, taxPaise, totalAmountPaise, paymentMethod }) => {
    const itemsRows = cart.map(item => `
      <tr>
        <td style="padding: 4px 2px; border-bottom: 1px dashed #ccc; font-weight: bold;">${item.productName}</td>
        <td style="padding: 4px 2px; border-bottom: 1px dashed #ccc; text-align: center;">${item.qty}</td>
        <td style="padding: 4px 2px; border-bottom: 1px dashed #ccc; text-align: right;">₹${formatNumberIN(item.basePrice)}</td>
        <td style="padding: 4px 2px; border-bottom: 1px dashed #ccc; text-align: right; font-weight: bold;">₹${formatNumberIN(item.total)}</td>
      </tr>
    `).join('');

    return `
      <div style="font-family: monospace; font-size: 11px; text-align: center; color: #000;">
        <h2 style="margin: 0; font-size: 16px; font-weight: bold;">VOLT ELECTRICALS</h2>
        <p style="margin: 2px 0;">ESTIMATE / QUOTATION</p>
        <p style="margin: 2px 0;"><strong>Invoice No:</strong> ${billNumber || 'DRAFT'}</p>
        <p style="margin: 2px 0; border-bottom: 1px solid #000; padding-bottom: 4px;">Date: ${new Date().toLocaleDateString('en-IN')}</p>
        <div style="text-align: left; margin: 8px 0;">
          <p style="margin: 2px 0;"><strong>Customer:</strong> ${customerName || 'Valued Customer'}</p>
          <p style="margin: 2px 0;"><strong>Phone:</strong> ${customerPhone || 'N/A'}</p>
          ${paymentMethod ? `<p style="margin: 2px 0;"><strong>Pay Method:</strong> ${paymentMethod}</p>` : ''}
        </div>
        <table style="width: 100%; border-collapse: collapse; text-align: left; margin-top: 8px;">
          <thead>
            <tr style="border-bottom: 1px solid #000; border-top: 1px solid #000;">
              <th style="padding: 4px 2px;">Item</th>
              <th style="padding: 4px 2px; text-align: center;">Qty</th>
              <th style="padding: 4px 2px; text-align: right;">Price</th>
              <th style="padding: 4px 2px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        <div style="margin-top: 10px; border-top: 1px solid #000; padding-top: 6px; text-align: right;">
          <p style="margin: 2px 0;">Subtotal: ₹${formatNumberIN(subtotalPaise)}</p>
          <p style="margin: 2px 0;">Discount: ₹${formatNumberIN(discountPaise)}</p>
          <p style="margin: 2px 0;">GST (18% incl.): ₹${formatNumberIN(taxPaise)}</p>
          <h3 style="margin: 4px 0 0 0; font-size: 14px; font-weight: bold;">GRAND TOTAL: ₹${formatNumberIN(totalAmountPaise)}</h3>
        </div>
        <p style="margin-top: 12px; font-size: 10px; font-style: italic;">* This is a quotation only, not an official tax receipt.</p>
      </div>
    `;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] flex flex-col gap-2.5 p-2 sm:p-3 overflow-y-auto lg:overflow-hidden bg-[#111827] selection:bg-teal-500 selection:text-white font-sans pb-24 md:pb-3">
      
      {/* TOP BAR: Fixed Session Unique Invoice Number & Date/Time */}
      <div className="shrink-0 bg-[#1F2937] border border-[#374151] rounded-xl px-3 py-2 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-mono font-bold text-slate-400">INVOICE NO:</span>
            <span className="text-xs font-mono font-extrabold text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
              {invoiceNumber || 'GENERATING...'}
            </span>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-slate-400 border-l border-[#374151] pl-4">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span className="text-teal-400 font-bold">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={handleHoldBill}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold transition"
              title="Hold Bill (F8)"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Hold (F8)</span>
            </button>
          )}
          <span className="text-xs bg-[#273549] text-slate-300 font-mono px-2.5 py-1 rounded-lg border border-[#374151]">
            Staff: <strong className="text-teal-400">{user?.username || userRole || 'Counter'}</strong>
          </span>
        </div>
      </div>

      {/* MAIN TWO-COLUMN CONTAINER */}
      <div className="flex-1 lg:min-h-0 flex flex-col lg:flex-row gap-2.5 lg:overflow-hidden">
        
        {/* LEFT COLUMN (~70% Width): Product Search, Invoice Table, Customer & Payment */}
        <div className="w-full lg:w-[68%] xl:w-[70%] flex flex-col lg:h-full lg:min-h-0 gap-2">
          
          {/* 1. SINGLE PRODUCT SEARCH FIELD (Autocomplete Dropdown Directly Below) */}
          <div className="relative shrink-0 bg-[#1F2937] border border-[#374151] rounded-xl p-2 shadow-md">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-teal-400 absolute left-3 pointer-events-none" />
              <input
                ref={productSearchRef}
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Type Product Name, Item Code or Barcode... (Enter to Select, Tab to Jump)"
                className="w-full bg-[#111827] border border-[#374151] focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 rounded-lg pl-9 pr-16 py-1.5 text-xs sm:text-sm font-mono font-semibold text-[#F3F4F6] placeholder-slate-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                    if (productSearchRef.current) productSearchRef.current.focus();
                  }}
                  className="absolute right-10 text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5"
                >
                  ✕
                </button>
              )}
              <span className="absolute right-2 px-1.5 py-0.5 bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded text-[10px] font-mono font-bold pointer-events-none">
                F2
              </span>
            </div>

            {/* Autocomplete Dropdown Overlay Directly Below Search Input */}
            {isSearchOpen && searchTrimmed.length > 0 && (
              <div 
                className="absolute left-0 right-0 top-full mt-1 bg-[#1F2937] border border-[#374151] rounded-xl shadow-2xl z-50 overflow-hidden max-h-[300px] overflow-y-auto divide-y divide-[#374151]"
                onMouseDown={e => e.preventDefault()}
              >
                {matchingProducts.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 font-mono text-xs">
                    <div className="font-bold text-slate-200">No matching products found</div>
                  </div>
                ) : (
                  matchingProducts.map((p, idx) => {
                    const isHighlighted = idx === highlightedIndex;
                    const isOutOfStock = p.currentStock <= 0;
                    return (
                      <div
                        key={p.barcode || p.id || idx}
                        onClick={() => handleSelectProduct(p)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`p-2 transition cursor-pointer flex items-center justify-between ${
                          isHighlighted
                            ? 'bg-teal-500/20 border-l-4 border-l-teal-400 text-white font-bold'
                            : 'hover:bg-[#273549] text-[#F3F4F6]'
                        } ${isOutOfStock ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <div className="flex-1 pr-3 space-y-0.5 min-w-0">
                          <div className="flex items-center space-x-2 truncate">
                            <span className="font-bold text-xs text-[#F3F4F6] truncate">
                              {renderHighlightedText(p.productName, searchQuery)}
                            </span>
                            {p.brand && (
                              <span className="text-[9px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20 px-1 py-0.2 rounded uppercase shrink-0">
                                {renderHighlightedText(p.brand, searchQuery)}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            Code: <strong className="text-slate-300">{renderHighlightedText(p.productCode || p.barcode || 'N/A', searchQuery)}</strong>
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-0.5 font-mono">
                          <div className="font-extrabold text-teal-400 text-xs">
                            {formatRupees(p.basePrice)}
                          </div>
                          <div className="text-[9px]">
                            {isOutOfStock ? (
                              <span className="text-red-400 font-bold bg-red-500/10 px-1 py-0.2 rounded border border-red-500/20">Out of Stock</span>
                            ) : (
                              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                                Stock: {p.currentStock}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 2. INVOICE TABLE (Expands Full Height of Left Column) */}
          <div className="flex-1 min-h-0 bg-[#1F2937] border border-[#374151] rounded-xl flex flex-col overflow-hidden shadow-md">
            {/* Table Header Bar */}
            <div className="shrink-0 px-3 py-1.5 bg-[#273549] border-b border-[#374151] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2 font-bold text-slate-300">
                <ShoppingCart className="w-3.5 h-3.5 text-teal-400" />
                <span>INVOICE TABLE</span>
                <span className="px-2 py-0.2 bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded-full text-[10px]">
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              {lastRemovedItem && (
                <button
                  type="button"
                  onClick={undoRemoveItem}
                  className="flex items-center space-x-1 font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 px-2 py-0.5 rounded text-[10px] transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo ({lastRemovedItem.productName})</span>
                </button>
              )}
            </div>

            {/* Table Body */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-400 font-mono text-xs">
                  <ShoppingCart className="w-8 h-8 text-slate-600 mb-1 opacity-40" />
                  <p className="font-semibold text-slate-300">Invoice table is empty</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Search products above and press Enter to add to bill</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead className="sticky top-0 bg-[#273549] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-[#374151] z-10">
                    <tr>
                      <th className="py-1.5 px-2.5">Product Name</th>
                      <th className="py-1.5 px-2 text-center w-20">Quantity</th>
                      <th className="py-1.5 px-2 text-right">Unit Price</th>
                      <th className="py-1.5 px-2 text-right">Discount</th>
                      <th className="py-1.5 px-2 text-right">GST</th>
                      <th className="py-1.5 px-2.5 text-right">Line Total</th>
                      <th className="py-1.5 px-2 text-center w-10">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#374151]">
                    {cart.map(item => {
                      const lineGst = Math.round(item.total * 18 / 118);
                      return (
                        <tr key={item.barcode} className="hover:bg-[#273549]/50 transition">
                          <td className="py-1.5 px-2.5">
                            <div className="font-bold text-[#F3F4F6] text-xs truncate max-w-[160px] sm:max-w-[240px]">
                              {item.productName}
                            </div>
                            {item.barcode && (
                              <div className="text-[9px] text-slate-400 font-mono">
                                Code: {item.barcode}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {/* Editable Quantity Textbox */}
                            <input
                              ref={el => (qtyInputRefs.current[item.barcode] = el)}
                              type="number"
                              min="1"
                              max={item.currentStock}
                              value={item.qty}
                              onChange={e => updateCartQtyExact(item.barcode, e.target.value)}
                              onFocus={e => e.target.select()}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                                  e.preventDefault();
                                  if (productSearchRef.current) {
                                    productSearchRef.current.focus();
                                  }
                                }
                              }}
                              className="w-14 bg-[#111827] border border-[#374151] focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 rounded px-1.5 py-0.5 text-center font-mono font-bold text-xs text-[#F3F4F6] focus:outline-none transition"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right text-slate-300 font-bold whitespace-nowrap">
                            ₹{formatNumberIN(item.basePrice)}
                          </td>
                          <td className="py-1.5 px-2 text-right text-amber-300 whitespace-nowrap">
                            ₹{formatNumberIN(item.discountPaise || 0)}
                          </td>
                          <td className="py-1.5 px-2 text-right text-slate-400 text-[11px] whitespace-nowrap">
                            ₹{formatNumberIN(lineGst)}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-extrabold text-teal-300 whitespace-nowrap">
                            ₹{formatNumberIN(item.total)}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button 
                              type="button"
                              onClick={() => removeFromCart(item.barcode)} 
                              className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (~30% Width): Customer Details, Payment, Bill Summary & Action Buttons */}
        <div className="w-full lg:w-[32%] xl:w-[30%] flex flex-col h-full min-h-0 gap-2 overflow-y-auto pr-0.5">
          
          {/* 1. CUSTOMER SECTION */}
          <div className="shrink-0 bg-[#1F2937] border border-[#374151] p-2.5 rounded-xl space-y-2 shadow-md relative">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-400" /> CUSTOMER DETAILS
              </span>
              <span className="px-1.5 py-0.2 bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded text-[9px] font-mono font-bold">
                F4
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 relative">
              <div>
                <input
                  ref={customerPhoneRef}
                  type="text"
                  value={customerPhone}
                  onChange={e => {
                    setCustomerPhone(e.target.value);
                    setShowCustomerSuggestions(true);
                  }}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                      e.preventDefault();
                      if (matchedCustomers.length > 0 && showCustomerSuggestions) {
                        selectCustomer(matchedCustomers[0]);
                      } else if (customerNameRef.current) {
                        customerNameRef.current.focus();
                      }
                    } else if (e.key === 'Escape') {
                      setShowCustomerSuggestions(false);
                    }
                  }}
                  placeholder="Mobile Number *"
                  className="w-full bg-[#111827] border border-[#374151] focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 rounded-lg px-2.5 py-1.5 text-xs font-mono text-teal-300 font-bold placeholder-slate-500 focus:outline-none transition"
                  maxLength={10}
                />
              </div>

              <input
                ref={customerNameRef}
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                    e.preventDefault();
                    if (paymentMethodRef.current) {
                      paymentMethodRef.current.focus();
                    } else if (discountRef.current) {
                      discountRef.current.focus();
                    }
                  }
                }}
                placeholder="Customer Name *"
                className="w-full bg-[#111827] border border-[#374151] focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#F3F4F6] placeholder-slate-500 focus:outline-none transition"
              />

              {/* Autocomplete Dropdown Overlay (Opens Downwards over Payment/Summary) */}
              {showCustomerSuggestions && matchedCustomers.length > 0 && (
                <div 
                  className="absolute left-0 right-0 top-full mt-1 bg-[#1E293B] border-2 border-teal-500/60 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] overflow-hidden max-h-56 overflow-y-auto divide-y divide-[#374151]"
                  onMouseDown={e => e.preventDefault()}
                >
                  <div className="bg-[#273549] px-3 py-1.5 text-[10px] font-mono font-bold text-teal-300 flex items-center justify-between border-b border-[#374151]">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-teal-400" />
                      EXISTING CUSTOMERS ({matchedCustomers.length})
                    </span>
                    <span className="text-slate-400 text-[9px]">Press Enter or click to select</span>
                  </div>
                  {matchedCustomers.map((cust, idx) => (
                    <div
                      key={cust.id || cust.phone || idx}
                      onClick={() => selectCustomer(cust)}
                      className="p-2 hover:bg-teal-500/20 cursor-pointer transition flex items-center justify-between text-xs font-mono group"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center text-xs shrink-0 border border-teal-500/30">
                          {cust.name ? cust.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <div className="font-bold text-[#F3F4F6] group-hover:text-teal-200 transition">
                            {renderHighlightedText(cust.name, customerPhone)}
                          </div>
                          <div className="text-[10px] text-teal-400 font-bold">
                            📞 {renderHighlightedText(cust.phone, customerPhone)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {(cust.totalDue || 0) > 0 ? (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/40 rounded text-[10px] font-bold">
                            Pending Due: ₹{formatNumberIN(cust.totalDue)}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded text-[9px] font-bold">
                            ✓ No Dues
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status Indicator Bar */}
            {existingCustomer ? (
              <div className={`p-1.5 rounded-lg border text-[10px] font-mono flex items-center justify-between ${
                (existingCustomer.totalDue || 0) > 0 
                  ? 'bg-red-500/10 border-red-500/30 text-red-300' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}>
                <div className="flex items-center space-x-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Existing Customer: <strong className="text-white font-bold">{existingCustomer.name}</strong></span>
                </div>
                {(existingCustomer.totalDue || 0) > 0 ? (
                  <span className="font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded">
                    Previous Due: ₹{formatNumberIN(existingCustomer.totalDue)}
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold">✓ Account Clear</span>
                )}
              </div>
            ) : (
              customerPhone.length === 10 && (
                <div className="p-1.5 rounded bg-teal-500/10 border border-teal-500/20 text-[10px] text-teal-300 font-mono flex items-center space-x-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>New customer record will be saved automatically upon sale.</span>
                </div>
              )
            )}
          </div>

          {/* 2. PAYMENT SECTION */}
          <div className="shrink-0 bg-[#1F2937] border border-[#374151] p-2.5 rounded-xl space-y-1.5 shadow-md">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Payment</span>
              <span className="text-[10px] text-teal-400 font-bold">{paymentMethod}</span>
            </div>

            <div 
              ref={paymentMethodRef}
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                  e.preventDefault();
                  if (discountRef.current) discountRef.current.focus();
                } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  const modes = ['Cash', 'UPI', 'Card', 'Credit/Due'];
                  const currentIdx = modes.indexOf(paymentMethod);
                  const nextIdx = e.key === 'ArrowRight' 
                    ? (currentIdx + 1) % modes.length 
                    : (currentIdx - 1 + modes.length) % modes.length;
                  setPaymentMethod(modes[nextIdx]);
                }
              }}
              className="grid grid-cols-4 gap-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-400 rounded-lg p-0.5"
            >
              {[
                { id: 'Cash', label: 'Cash' },
                { id: 'UPI', label: 'UPI' },
                { id: 'Card', label: 'Card' },
                { id: 'Credit/Due', label: 'Credit' }
              ].map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPaymentMethod(mode.id)}
                  className={`py-1 px-1 rounded text-[11px] font-bold transition text-center border focus:outline-none ${
                    paymentMethod === mode.id
                      ? 'bg-teal-600 text-white border-teal-400 shadow-sm'
                      : 'bg-[#111827] text-slate-400 hover:text-slate-200 border-[#374151]'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div>
                <input
                  ref={paidAmountRef}
                  type="number"
                  value={paidRupees}
                  onChange={e => setPaidRupees(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                      e.preventDefault();
                      if (completeSaleBtnRef.current) completeSaleBtnRef.current.focus();
                    }
                  }}
                  placeholder="Paid (₹)"
                  disabled={paymentMethod === 'Credit/Due'}
                  className="w-full bg-[#111827] border border-[#374151] focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 rounded-lg px-2 py-1 text-xs font-mono text-emerald-400 font-bold focus:outline-none transition disabled:opacity-50"
                />
              </div>
              <div className={`px-2 py-1 rounded-lg font-mono font-bold border text-xs flex items-center justify-between ${
                dueAmountPaise > 0 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                  : 'bg-[#111827] border-[#374151] text-slate-400'
              }`}>
                <span className="text-[10px]">Due:</span>
                <span>₹{formatNumberIN(dueAmountPaise)}</span>
              </div>
            </div>
          </div>
          
          {/* BILL SUMMARY */}
          <div className="shrink-0 bg-[#1F2937] border border-[#374151] p-3 rounded-xl space-y-2 shadow-md">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono border-b border-[#374151] pb-1.5">
              Bill Summary
            </div>

            <div className="space-y-1.5 text-xs font-mono border-b border-[#374151] pb-2">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-bold text-slate-200">₹{formatNumberIN(subtotalPaise)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST (18% incl.)</span>
                <span className="text-slate-300">₹{formatNumberIN(taxPaise)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 pt-0.5">
                <span>Discount (₹)</span>
                <input
                  ref={discountRef}
                  type="number"
                  value={discountRupees}
                  onChange={e => setDiscountRupees(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                      e.preventDefault();
                      if (paymentMethod !== 'Credit/Due' && paidAmountRef.current) {
                        paidAmountRef.current.focus();
                        paidAmountRef.current.select();
                      } else if (completeSaleBtnRef.current) {
                        completeSaleBtnRef.current.focus();
                      }
                    }
                  }}
                  placeholder="0"
                  className="w-20 bg-[#111827] border border-[#374151] focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 rounded px-1.5 py-0.5 text-right font-mono text-xs text-amber-300 font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* GRAND TOTAL - Visually Prominent */}
            <div className="bg-gradient-to-r from-teal-950/90 to-emerald-950/90 border border-teal-500/50 p-2.5 rounded-xl flex items-center justify-between shadow-xl shadow-teal-500/10">
              <div>
                <div className="text-[10px] text-teal-400 uppercase tracking-wider font-mono font-black">Grand Total</div>
                <div className="text-[11px] text-slate-400 font-mono">Total Payable</div>
              </div>
              <div className="text-2xl xl:text-3xl font-black font-mono text-teal-300 tracking-tight drop-shadow-md">
                ₹{formatNumberIN(totalAmountPaise)}
              </div>
            </div>
          </div>

          {/* BOTTOM ACTIONS */}
          <div className="shrink-0 space-y-1.5 mt-auto">
            {/* Complete Sale Button */}
            <button
              ref={completeSaleBtnRef}
              onClick={handleCheckout}
              onKeyDown={e => {
                if (e.key === 'Tab' && !e.shiftKey) {
                  e.preventDefault();
                  if (printBtnRef.current) printBtnRef.current.focus();
                }
              }}
              disabled={isSubmitting || cart.length === 0}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 focus:ring-2 focus:ring-teal-400 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-teal-500/20 transition-all transform active:scale-[0.99] flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed border border-teal-400/30 min-h-[46px] focus:outline-none"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>{isSubmitting ? 'PROCESSING...' : 'COMPLETE SALE'}</span>
            </button>

            {/* Action Buttons Grid: Hold Bill, Save Estimate, Send Estimate (WhatsApp), Print */}
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={handleHoldBill}
                disabled={cart.length === 0}
                className="py-2 px-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold text-[11px] flex items-center justify-center space-x-0.5 transition disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-amber-400"
                title="Hold Bill (F8)"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Hold</span>
              </button>

              <button
                type="button"
                onClick={handleSaveEstimate}
                disabled={cart.length === 0}
                className="py-2 px-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono font-bold text-[11px] flex items-center justify-center space-x-0.5 transition disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-blue-400"
                title="Save Estimate / Quotation"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Estimate</span>
              </button>

              <button
                type="button"
                onClick={handleSendEstimateWhatsApp}
                disabled={cart.length === 0}
                className="py-2 px-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold text-[11px] flex items-center justify-center space-x-0.5 transition disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                title="Send Estimate via WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp</span>
              </button>

              <button
                ref={printBtnRef}
                type="button"
                onClick={handlePrintReceipt}
                onKeyDown={e => {
                  if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    if (productSearchRef.current) productSearchRef.current.focus();
                  }
                }}
                disabled={cart.length === 0}
                className="py-2 px-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold text-[11px] flex items-center justify-center space-x-0.5 transition disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-purple-400"
                title="Print Receipt Preview"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
