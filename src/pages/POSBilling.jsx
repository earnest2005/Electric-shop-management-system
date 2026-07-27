import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, Search, ShoppingCart, Plus, Minus, Trash2, User, Phone, 
  CreditCard, DollarSign, QrCode, AlertTriangle, CheckCircle2, Zap, 
  Tag, ChevronRight, FileText, ArrowRight, PauseCircle, RotateCcw, Clock, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatRupees, rupeesToPaise, paiseToRupees, formatNumberIN } from '../utils/currency';
import { getProducts, searchCustomerByPhone, processSaleBatch, getPurchases, getCustomers, getOffers } from '../services/db';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export default function POSBilling({ onCompleteSale, onResumeDraftData }) {
  const { toast } = useAlert();
  const { user, userRole } = useAuth();
  const [products, setProducts] = useState([]);
  const [activeOffers, setActiveOffers] = useState([]);
  const [selectedOfferId, setSelectedOfferId] = useState('');
  
  // Product Search & Autocomplete State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
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
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // Cash, UPI, Card, Credit/Due, Split
  const [paidRupees, setPaidRupees] = useState(''); // Amount paid by customer in Rupees string
  const [cashTenderedRupees, setCashTenderedRupees] = useState(''); // Cash given by customer

  // Processing state
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productSearchRef = useRef(null);
  const customerPhoneRef = useRef(null);
  const isSubmittingRef = useRef(false);

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

  const matchingProducts = React.useMemo(() => {
    if (!searchLower) return [];
    return products.filter(p => {
      const pName = (p.productName || '').toLowerCase();
      const pBrand = (p.brand || '').toLowerCase();
      const pCode = (p.productCode || p.barcode || '').toLowerCase();
      const pBarcode = (p.barcode || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();

      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch = 
        pName.includes(searchLower) ||
        pBrand.includes(searchLower) ||
        pCode.includes(searchLower) ||
        pBarcode.includes(searchLower) ||
        pCat.includes(searchLower);

      return matchCat && matchSearch;
    }).slice(0, 15);
  }, [products, searchLower, selectedCategory]);

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
    setTimeout(() => {
      if (productSearchRef.current) productSearchRef.current.focus();
    }, 30);
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
            total: product.basePrice // in Paise
          }
        ];
      }
    });

    setTimeout(() => {
      if (productSearchRef.current) productSearchRef.current.focus();
    }, 50);
  };

  const updateCartQty = (barcode, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.barcode === barcode) {
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          if (newQty > item.currentStock) {
            toast.warning(`Stock limit reached (${item.currentStock})`, "Stock Limit");
            return item;
          }
          return {
            ...item,
            qty: newQty,
            total: newQty * item.basePrice
          };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (barcode) => {
    const itemToRemove = cart.find(item => item.barcode === barcode);
    if (itemToRemove) {
      setLastRemovedItem(itemToRemove);
    }
    setCart(prev => prev.filter(item => item.barcode !== barcode));
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
      setExistingCustomer(null);
      toast.success("Active bill saved to Held Drafts!", "Bill Held");
    } catch (e) {
      toast.error("Failed to hold bill draft", "Draft Error");
    }
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
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10) {
      toast.error("Please enter a valid 10-digit Customer Mobile Number.", "Invalid Input");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Please enter Customer Name.", "Invalid Input");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const staffUsername = user?.username || userRole || 'staff';
      const saleData = {
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

      // Clear Form & Open Receipt
      setCart([]);
      setDiscountRupees('');
      setCustomerPhone('');
      setCustomerName('');
      setCustomerAddress('');
      setPaidRupees('');
      setExistingCustomer(null);

      if (onCompleteSale) {
        onCompleteSale(completedRecord);
      }
    } catch (err) {
      console.error("Sale commit failed:", err);
      toast.error("Failed to complete transaction: " + err.message, "Transaction Error");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Categories list
  const categories = ['All', 'Wires & Cables', 'Switches & Sockets', 'Switchgear & MCBs', 'Fans & Appliances', 'Lighting', 'Conduits & Fittings', 'Tools & Accessories'];

  const filteredProducts = products.filter(p => {
    const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch = 
      p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    return matchCategory && matchSearch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 selection:bg-teal-500 selection:text-white">
      {/* POS Billing Panel */}
      <div className="bg-[#273549] border border-[#374151] p-5 sm:p-6 rounded-2xl space-y-5 shadow-xl">
        
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-[#374151] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-500/10 rounded-xl border border-teal-500/30 text-[#14B8A6] shrink-0">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-[#F3F4F6] text-base sm:text-lg font-sans">POS Billing Console</h2>
              <p className="text-[11px] sm:text-xs text-[#9CA3AF] font-mono">Fast Keyboard Checkout Engine</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleHoldBill}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold transition"
                title="Hold Bill (F8)"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Hold Bill (F8)</span>
              </button>
            )}
            <span className="text-xs bg-teal-500/10 text-teal-300 font-mono px-3 py-1.5 rounded-xl border border-teal-500/30 font-bold">
              {cart.length} {cart.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {/* 1. PRODUCT SEARCH (First Section inside POS Billing Panel) */}
        <div className="space-y-1.5 relative">
          <label className="block text-xs font-bold text-[#9CA3AF] uppercase tracking-wider font-mono">
            Product Search (F2)
          </label>
          <div className="relative">
            <Search className="w-5 h-5 text-[#14B8A6] absolute left-3.5 top-3.5 z-10" />
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
              placeholder="Search product by name, code or barcode..."
              className="w-full glass-input pl-11 pr-10 py-3.5 rounded-xl text-sm font-mono font-bold border-[#374151] focus:border-[#14B8A6] shadow-inner text-[#F3F4F6]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                  if (productSearchRef.current) productSearchRef.current.focus();
                }}
                className="absolute right-3.5 top-3.5 text-[#9CA3AF] hover:text-white text-sm font-bold z-10"
              >
                ✕
              </button>
            )}

            {/* Real-time Search Autocomplete Dropdown Overlay Directly Below Search Input */}
            {isSearchOpen && searchTrimmed.length > 0 && (
              <div 
                className="absolute left-0 right-0 top-full mt-1.5 bg-[#1F2937] border border-[#374151] rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-[#374151]"
                onMouseDown={e => e.preventDefault()}
              >
                {matchingProducts.length === 0 ? (
                  <div className="p-5 text-center text-[#9CA3AF] font-mono text-xs">
                    <div className="text-sm font-bold text-[#F3F4F6]">No matching products found.</div>
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
                        className={`p-3.5 transition cursor-pointer flex items-center justify-between min-h-[56px] ${
                          isHighlighted
                            ? 'bg-teal-500/20 border-l-4 border-l-[#14B8A6] text-white font-bold'
                            : 'hover:bg-[#273549] text-[#F3F4F6]'
                        } ${isOutOfStock ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <div className="flex-1 pr-4 space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-[#F3F4F6]">
                              {renderHighlightedText(p.productName, searchQuery)}
                            </span>
                            {p.brand && (
                              <span className="text-[10px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded uppercase">
                                {renderHighlightedText(p.brand, searchQuery)}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#9CA3AF] font-mono">
                            Code: <strong className="text-[#F3F4F6]">{renderHighlightedText(p.productCode || p.barcode || 'N/A', searchQuery)}</strong>
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-0.5 font-mono">
                          <div className="font-extrabold text-[#14B8A6] text-base">
                            {formatRupees(p.basePrice)}
                          </div>
                          <div className="text-[11px]">
                            {isOutOfStock ? (
                              <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">Out of Stock</span>
                            ) : (
                              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
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
        </div>

        {/* 2. CUSTOMER DETAILS */}
        <div className="bg-[#1F2937] border border-[#374151] p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#9CA3AF] uppercase tracking-wider font-mono">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#14B8A6]" /> Customer Details (F4)
            </span>
            {existingCustomer && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                ✓ Profile Linked
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
            <div className="relative">
              <input
                ref={customerPhoneRef}
                type="text"
                value={customerPhone}
                onChange={e => {
                  setCustomerPhone(e.target.value);
                  setShowCustomerSuggestions(true);
                }}
                onFocus={() => setShowCustomerSuggestions(true)}
                placeholder="Mobile Number (10 Digits)*"
                className="w-full glass-input px-3.5 py-2 rounded-lg text-xs font-mono text-teal-300 font-bold border-[#374151]"
                maxLength={10}
              />

              {/* Auto-suggest dropdown when typing */}
              {showCustomerSuggestions && matchedCustomers.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#273549] border border-[#374151] rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-[#374151]">
                  {matchedCustomers.map(cust => (
                    <div
                      key={cust.id || cust.phone}
                      onClick={() => selectCustomer(cust)}
                      className="p-2.5 hover:bg-[#1F2937] cursor-pointer transition flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#F3F4F6] flex items-center gap-1">
                          <span>{cust.name}</span>
                        </div>
                        <div className="text-[11px] text-[#14B8A6] font-mono">📱 {cust.phone}</div>
                      </div>
                      <div className="text-right text-[10px]">
                        {(cust.totalDue || 0) > 0 ? (
                          <span className="text-red-400 font-mono font-bold">Due: {formatRupees(cust.totalDue || 0)}</span>
                        ) : (
                          <span className="text-emerald-400 font-mono">Clean Ledger</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Customer Name*"
              className="glass-input px-3.5 py-2 rounded-lg text-xs font-bold text-[#F3F4F6] border-[#374151]"
            />
          </div>

          {/* Customer Pending Due Warning Alert! */}
          {existingCustomer && (existingCustomer.totalDue || 0) > 0 && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">⚠️ Customer Pending Due Warning:</div>
                <div>{existingCustomer.name} has previous outstanding dues of <strong className="text-red-300 underline">{formatRupees(existingCustomer.totalDue)}</strong>.</div>
              </div>
            </div>
          )}
        </div>

        {/* 3. INVOICE CART */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#9CA3AF] uppercase tracking-wider font-mono">
            <span className="flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-[#14B8A6]" /> Invoice Cart
            </span>
            {lastRemovedItem && (
              <button
                type="button"
                onClick={undoRemoveItem}
                className="flex items-center space-x-1 font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo Remove ({lastRemovedItem.productName})</span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="py-8 text-center text-[#9CA3AF] text-xs font-mono bg-[#1F2937] border border-[#374151] rounded-xl">
                Cart is empty. Search products above to add to bill.
              </div>
            ) : (
              cart.map(item => (
                <div key={item.barcode} className="bg-[#1F2937] p-3 rounded-xl border border-[#374151] flex items-center justify-between text-xs">
                  <div className="flex-1 pr-2">
                    <div className="font-semibold text-[#F3F4F6] truncate max-w-[220px] sm:max-w-[320px]">{item.productName}</div>
                    <div className="text-[11px] text-[#14B8A6] font-mono">₹{formatNumberIN(item.basePrice)} × {item.qty}</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center bg-[#273549] border border-[#374151] rounded-xl overflow-hidden">
                      <button onClick={() => updateCartQty(item.barcode, -1)} className="p-2 text-[#9CA3AF] hover:text-[#F3F4F6] min-w-[36px] min-h-[36px] flex items-center justify-center">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 font-mono font-bold text-[#F3F4F6] text-xs">{item.qty}</span>
                      <button onClick={() => updateCartQty(item.barcode, 1)} className="p-2 text-[#9CA3AF] hover:text-[#F3F4F6] min-w-[36px] min-h-[36px] flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="font-mono font-bold text-[#F3F4F6] text-xs w-20 text-right">
                      ₹{formatNumberIN(item.total)}
                    </span>
                    <button onClick={() => removeFromCart(item.barcode)} className="text-[#9CA3AF] hover:text-red-400 p-1.5 flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. PAYMENT SECTION */}
        <div className="bg-[#1F2937] border border-[#374151] p-4 rounded-xl space-y-3">
          <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider font-mono">Payment Section</div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {['UPI', 'Cash', 'Card', 'Credit/Due'].map(mode => (
              <button
                key={mode}
                onClick={() => setPaymentMethod(mode)}
                className={`py-2.5 rounded-xl font-mono text-xs font-semibold transition min-h-[44px] ${
                  paymentMethod === mode
                    ? 'bg-[#14B8A6] text-white shadow-sm font-bold'
                    : 'bg-[#273549] text-[#9CA3AF] hover:text-[#F3F4F6] border border-[#374151]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Amount Paid & Due Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-[#9CA3AF] font-mono">Amount Paid Now (₹)</label>
                {paymentMethod !== 'Credit/Due' && totalAmountPaise > 0 && (
                  <button 
                    type="button"
                    onClick={() => setPaidRupees((totalAmountPaise / 100).toString())}
                    className="px-2 py-0.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded font-mono text-[10px] font-bold whitespace-nowrap transition inline-flex items-center"
                  >
                    Full Pay ({formatRupees(totalAmountPaise)})
                  </button>
                )}
              </div>
              <input
                type="number"
                value={paidRupees}
                onChange={e => setPaidRupees(e.target.value)}
                placeholder="Enter amount paid (₹)"
                disabled={paymentMethod === 'Credit/Due'}
                className="w-full glass-input px-3.5 py-2 rounded-lg font-mono text-emerald-400 font-bold min-h-[44px] border-[#374151]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#9CA3AF] font-mono mb-1">New Due Balance</label>
              <div className={`px-3.5 py-2 rounded-lg font-mono font-bold border text-xs min-h-[44px] flex items-center ${
                dueAmountPaise > 0 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                  : 'bg-[#273549] border-[#374151] text-[#9CA3AF]'
              }`}>
                {formatRupees(dueAmountPaise)}
              </div>
            </div>
          </div>
        </div>

        {/* 5. BILL SUMMARY */}
        <div className="border-t border-[#374151] pt-4 space-y-2 text-xs font-mono">
          <div className="flex justify-between text-[#9CA3AF]">
            <span>Subtotal:</span>
            <span>{formatRupees(subtotalPaise)}</span>
          </div>
          <div className="flex justify-between text-[#9CA3AF]">
            <span>GST (18% included):</span>
            <span>{formatRupees(taxPaise)}</span>
          </div>
          <div className="flex justify-between text-[#F3F4F6] font-extrabold text-lg pt-2 border-t border-[#374151]">
            <span>TOTAL AMOUNT:</span>
            <span className="text-[#14B8A6]">{formatRupees(totalAmountPaise)}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={isSubmitting || cart.length === 0}
            className="w-full py-4 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-3 min-h-[48px]"
          >
            <Zap className="w-5 h-5 fill-white text-white" />
            <span>{isSubmitting ? 'COMMITTING TRANSACTION...' : 'COMPLETE SALE & GENERATE BILL'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
