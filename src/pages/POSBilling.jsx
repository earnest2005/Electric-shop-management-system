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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [barcodeInput, setBarcodeInput] = useState('');
  
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

  const barcodeInputRef = useRef(null);
  const customerPhoneRef = useRef(null);
  const isSubmittingRef = useRef(false);

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
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
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

  // Handle Barcode Scan / Enter
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    
    const found = products.find(
      p => p.barcode === barcodeInput.trim() || p.id === barcodeInput.trim()
    );

    if (found) {
      addToCart(found);
      setBarcodeInput('');
    } else {
      toast.error(`No product found with Barcode: ${barcodeInput}`, "Item Not Found");
    }
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
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 selection:bg-teal-500 selection:text-white">
      {/* Top Header Barcode Scanner Input */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 border border-[#374151] bg-[#273549] shadow-sm">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="p-2.5 bg-teal-500/10 rounded-xl border border-teal-500/30 text-[#14B8A6] shrink-0">
            <Barcode className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold text-[#F3F4F6] text-base sm:text-lg font-sans">Active POS Checkout Engine</h2>
            <p className="text-[11px] sm:text-xs text-[#9CA3AF] font-mono">Scan barcode or search catalog (F2 for Focus)</p>
          </div>
        </div>

        <form onSubmit={handleBarcodeSubmit} className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Barcode className="w-5 h-5 text-[#14B8A6] absolute left-3 top-3.5" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder="Scan Barcode / Code (F2)..."
              className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-bold min-h-[48px] border-[#374151] focus:border-[#14B8A6]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold text-xs rounded-xl transition shrink-0 min-h-[48px] flex items-center justify-center shadow-sm"
          >
            Add Item
          </button>
        </form>
      </div>

      {/* Main Grid: Left Catalog, Right Billing Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* LEFT COLUMN: Product Catalog (7 Cols on desktop/tablet, stacked on mobile) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Filter */}
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products by name, brand, or code..."
                className="w-full glass-input pl-10 pr-4 py-3 rounded-xl text-xs sm:text-sm min-h-[48px] border-[#374151] focus:border-[#14B8A6]"
              />
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3.5" />
            </div>

            {/* Category Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none touch-pan-x">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[40px] shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#14B8A6] text-white shadow-sm font-bold'
                      : 'bg-[#273549] text-[#9CA3AF] hover:text-[#F3F4F6] border border-[#374151] hover:border-[#14B8A6]/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredProducts.map(product => (
              <div
                key={product.barcode}
                onClick={() => addToCart(product)}
                className={`bg-[#273549] border border-[#374151] p-3.5 rounded-xl cursor-pointer hover:border-[#14B8A6] hover:shadow-md transition group relative flex flex-col justify-between ${
                  product.currentStock <= 0 ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] font-mono mb-1">
                    <span className="bg-teal-500/10 px-2 py-0.5 rounded text-teal-300 font-semibold border border-teal-500/20">{product.brand}</span>
                    <span className="text-[#9CA3AF]">#{product.barcode}</span>
                  </div>
                  <h4 className="font-semibold text-[#F3F4F6] text-xs leading-snug group-hover:text-[#14B8A6] transition">
                    {product.productName}
                  </h4>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#374151]">
                  <div className="font-bold text-[#14B8A6] font-mono text-sm">
                    {formatRupees(product.basePrice)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      product.currentStock <= product.minStockAlert 
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      Stock: {product.currentStock}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-[#14B8A6] group-hover:bg-[#14B8A6] group-hover:text-white flex items-center justify-center transition">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Invoice Generator & Billing Checkout (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#273549] border border-[#374151] p-5 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#374151] pb-3">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-[#14B8A6]" />
                <h3 className="font-bold text-[#F3F4F6] text-base">Active Invoice Cart</h3>
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
                    <span>Hold Bill (F8)</span>
                  </button>
                )}
                <span className="text-xs bg-teal-500/10 text-teal-300 font-mono px-2 py-0.5 rounded border border-teal-500/30 font-bold">
                  {cart.length} items
                </span>
              </div>
            </div>

            {/* Undo Removed Item Banner */}
            {lastRemovedItem && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between animate-in fade-in">
                <span>Removed <strong>{lastRemovedItem.productName}</strong></span>
                <button
                  type="button"
                  onClick={undoRemoveItem}
                  className="flex items-center space-x-1 font-bold text-white bg-amber-600 hover:bg-amber-700 px-2 py-0.5 rounded text-[11px] transition shadow-sm"
                >
                  <RotateCcw className="w-3 h-3 text-white" />
                  <span>Undo</span>
                </button>
              </div>
            )}

            {/* Customer Lookup & Due Tracking Box */}
            <div className="bg-[#1F2937] border border-[#374151] p-3.5 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[#9CA3AF]">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#14B8A6]" /> Customer Account Lookup (F4)
                </span>
                {existingCustomer && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                    ✓ Profile Linked
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 relative">
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
                    placeholder="Mobile (10 Digits)*"
                    className="w-full glass-input px-3 py-1.5 rounded-lg text-xs font-mono text-teal-300 font-bold border-[#374151]"
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
                  className="glass-input px-3 py-1.5 rounded-lg text-xs font-bold text-[#F3F4F6] border-[#374151]"
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

            {/* Cart Items List */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-[#9CA3AF] text-xs font-mono">
                  Cart is empty. Click items on the left to generate bill.
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.barcode} className="bg-[#1F2937] p-3 rounded-xl border border-[#374151] flex items-center justify-between text-xs">
                    <div className="flex-1 pr-2">
                      <div className="font-semibold text-[#F3F4F6] truncate max-w-[150px] sm:max-w-[180px]">{item.productName}</div>
                      <div className="text-[11px] text-[#14B8A6] font-mono">₹{formatNumberIN(item.basePrice)} × {item.qty}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center bg-[#273549] border border-[#374151] rounded-xl overflow-hidden">
                        <button onClick={() => updateCartQty(item.barcode, -1)} className="p-2 text-[#9CA3AF] hover:text-[#F3F4F6] min-w-[38px] min-h-[38px] flex items-center justify-center">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-2 font-mono font-bold text-[#F3F4F6] text-xs">{item.qty}</span>
                        <button onClick={() => updateCartQty(item.barcode, 1)} className="p-2 text-[#9CA3AF] hover:text-[#F3F4F6] min-w-[38px] min-h-[38px] flex items-center justify-center">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="font-mono font-bold text-[#F3F4F6] text-xs w-16 text-right">
                        ₹{formatNumberIN(item.total)}
                      </span>
                      <button onClick={() => removeFromCart(item.barcode)} className="text-[#9CA3AF] hover:text-red-400 p-2 min-w-[38px] min-h-[38px] flex items-center justify-center">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector & Partial Due Calculator */}
            <div className="bg-[#1F2937] border border-[#374151] p-3.5 rounded-xl space-y-3">
              <div className="text-xs font-semibold text-[#9CA3AF]">Payment & Settlement Mode</div>
              <div className="grid grid-cols-4 gap-2 text-xs">
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
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
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
                    className="w-full glass-input px-3 py-2 rounded-lg font-mono text-emerald-400 font-bold min-h-[44px] border-[#374151]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#9CA3AF] font-mono mb-1">New Due Balance</label>
                  <div className={`px-3 py-2 rounded-lg font-mono font-bold border text-xs min-h-[44px] flex items-center ${
                    dueAmountPaise > 0 
                      ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                      : 'bg-[#273549] border-[#374151] text-[#9CA3AF]'
                  }`}>
                    {formatRupees(dueAmountPaise)}
                  </div>
                </div>
              </div>
            </div>

            {/* Total Footer */}
            <div className="border-t border-[#374151] pt-3 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-[#9CA3AF]">
                <span>Subtotal:</span>
                <span>{formatRupees(subtotalPaise)}</span>
              </div>
              <div className="flex justify-between text-[#9CA3AF]">
                <span>GST (18% included):</span>
                <span>{formatRupees(taxPaise)}</span>
              </div>
              <div className="flex justify-between text-[#F3F4F6] font-extrabold text-lg pt-1 border-t border-[#374151]">
                <span>TOTAL AMOUNT:</span>
                <span className="text-[#14B8A6]">{formatRupees(totalAmountPaise)}</span>
              </div>

              {/* Commit Button */}
              <button
                onClick={handleCheckout}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3.5 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-sm rounded-xl shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-3 min-h-[48px]"
              >
                <Zap className="w-5 h-5 fill-white text-white" />
                <span>{isSubmitting ? 'COMMITTING BATCH...' : 'COMPLETE SALE & GENERATE BILL'}</span>
              </button>
            </div>
          </div>

          {/* Live Recent Transactions Feed Widget */}
          <div className="bg-[#273549] border border-[#374151] p-4 rounded-xl space-y-2 shadow-sm">
            <div className="text-xs font-semibold text-[#9CA3AF] flex items-center justify-between">
              <span>LIVE RECENT COMMIT FEED</span>
              <span className="text-[10px] text-[#14B8A6] font-mono font-bold">REAL-TIME</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {recentPurchases.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-[#1F2937] rounded-lg border border-[#374151]">
                  <div>
                    <div className="font-semibold text-[#F3F4F6] font-mono">{p.billNumber}</div>
                    <div className="text-[10px] text-[#9CA3AF]">{p.customerName} ({p.paymentMethod})</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#14B8A6] font-mono">{formatRupees(p.totalAmount)}</div>
                    {p.dueAmount > 0 ? (
                      <span className="text-[9px] text-red-400 font-mono">Due: {formatRupees(p.dueAmount)}</span>
                    ) : (
                      <span className="text-[9px] text-emerald-400 font-mono">Paid</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Mobile Sticky Checkout Bar */}
      {cart.length > 0 && (
        <div className="lg:hidden sticky bottom-14 left-0 right-0 z-30 bg-[#273549]/95 border border-[#374151] p-3 rounded-2xl shadow-xl backdrop-blur-md flex items-center justify-between mt-4">
          <div>
            <div className="text-[10px] text-[#9CA3AF] font-mono">{cart.length} items in cart</div>
            <div className="text-base font-extrabold text-[#14B8A6] font-mono">{formatRupees(totalAmountPaise)}</div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="px-5 py-3 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center space-x-1.5 min-h-[48px]"
          >
            <Zap className="w-4 h-4 fill-white text-white" />
            <span>CHECKOUT NOW</span>
          </button>
        </div>
      )}
    </div>
  );
}
