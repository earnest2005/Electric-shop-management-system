import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, Search, ShoppingCart, Plus, Minus, Trash2, User, Phone, 
  CreditCard, DollarSign, QrCode, AlertTriangle, CheckCircle2, Zap, 
  Tag, ChevronRight, FileText, ArrowRight 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatRupees, rupeesToPaise, paiseToRupees, formatNumberIN } from '../utils/currency';
import { getProducts, searchCustomerByPhone, processSaleBatch, getPurchases } from '../services/db';

export default function POSBilling({ onCompleteSale }) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [barcodeInput, setBarcodeInput] = useState('');
  
  // Cart state
  const [cart, setCart] = useState([]);
  const [discountRupees, setDiscountRupees] = useState('');

  // Customer state
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // Cash, UPI, Card, Credit/Due, Split
  const [paidRupees, setPaidRupees] = useState(''); // Amount paid by customer in Rupees string

  // Processing state
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const barcodeInputRef = useRef(null);

  // Load products and recent sales
  const loadData = async () => {
    const prods = await getProducts();
    setProducts(prods);
    const purchases = await getPurchases();
    setRecentPurchases(purchases.slice(0, 5));
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
      alert(`No product found with Barcode: ${barcodeInput}`);
    }
  };

  // Customer phone lookup
  useEffect(() => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      setIsSearchingCustomer(true);
      searchCustomerByPhone(cleanPhone).then(cust => {
        setIsSearchingCustomer(false);
        if (cust) {
          setExistingCustomer(cust);
          setCustomerName(cust.name);
          setCustomerAddress(cust.address || '');
        } else {
          setExistingCustomer(null);
        }
      });
    } else {
      setExistingCustomer(null);
    }
  }, [customerPhone]);

  // Cart operations
  const addToCart = (product) => {
    if (product.currentStock <= 0) {
      alert(`Out of stock: ${product.productName}`);
      return;
    }

    setCart(prev => {
      const idx = prev.findIndex(item => item.barcode === product.barcode);
      if (idx >= 0) {
        const updated = [...prev];
        if (updated[idx].qty + 1 > product.currentStock) {
          alert(`Cannot exceed available stock (${product.currentStock})`);
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
            basePrice: product.basePrice, // in Paise
            taxPercent: product.taxPercent || 18,
            currentStock: product.currentStock,
            qty: 1,
            total: product.basePrice // in Paise
          }
        ];
      }
    });
  };

  const updateCartQty = (barcode, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.barcode === barcode) {
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          if (newQty > item.currentStock) {
            alert(`Stock limit reached (${item.currentStock})`);
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
    setCart(prev => prev.filter(item => item.barcode !== barcode));
  };

  // Financial calculations in Paise
  const subtotalPaise = cart.reduce((acc, item) => acc + item.total, 0);
  const taxPaise = Math.round(subtotalPaise * 0.18); // 18% GST inclusive calculation
  const discountPaise = rupeesToPaise(discountRupees);
  const totalAmountPaise = Math.max(0, subtotalPaise - discountPaise);

  // Default paid amount when payment method changes or total changes
  useEffect(() => {
    if (paymentMethod === 'Credit/Due') {
      setPaidRupees('0');
    } else if (paymentMethod !== 'Split') {
      setPaidRupees(paiseToRupees(totalAmountPaise).toString());
    }
  }, [paymentMethod, totalAmountPaise]);

  const paidAmountPaise = paymentMethod === 'Credit/Due' 
    ? 0 
    : (paidRupees !== '' ? rupeesToPaise(paidRupees) : totalAmountPaise);

  const dueAmountPaise = Math.max(0, totalAmountPaise - paidAmountPaise);

  // Process Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Cart is empty! Add products first.");
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10) {
      alert("Please enter a valid 10-digit Customer Mobile Number.");
      return;
    }
    if (!customerName.trim()) {
      alert("Please enter Customer Name.");
      return;
    }

    setIsSubmitting(true);

    try {
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
        tax: taxPaise,
        discounts: discountPaise,
        totalAmount: totalAmountPaise,
        paidAmount: paidAmountPaise,
        dueAmount: dueAmountPaise,
        paymentMethod
      };

      const completedRecord = await processSaleBatch(saleData);

      // Trigger Celebration Confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

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
      alert("Failed to complete transaction: " + err.message);
    } finally {
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Barcode Scanner Input */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <Barcode className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold text-white text-lg font-sans">Active POS Checkout Engine</h2>
            <p className="text-xs text-slate-400 font-mono">Scan barcode or search master inventory catalog</p>
          </div>
        </div>

        {/* Quick Barcode Scanner Box */}
        <form onSubmit={handleBarcodeSubmit} className="flex items-center space-x-2 w-full md:w-96">
          <div className="relative w-full">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder="Scan Barcode (e.g., 890123400001)..."
              className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl font-mono text-xs text-amber-400 font-semibold"
            />
            <Barcode className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition shrink-0"
          >
            Add Item
          </button>
        </form>
      </div>

      {/* Main Grid: Left Catalog, Right Billing Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Product Catalog (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Filter */}
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products by name, brand, or code..."
                className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>

            {/* Category Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/10'
                      : 'bg-dark-800 text-slate-400 hover:text-white border border-slate-800'
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
                className={`glass-panel p-3.5 rounded-xl cursor-pointer hover:border-amber-500/40 transition group relative flex flex-col justify-between ${
                  product.currentStock <= 0 ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-amber-300">{product.brand}</span>
                    <span className="text-slate-500">#{product.barcode}</span>
                  </div>
                  <h4 className="font-semibold text-white text-xs leading-snug group-hover:text-amber-400 transition">
                    {product.productName}
                  </h4>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <div className="font-bold text-amber-400 font-mono text-sm">
                    {formatRupees(product.basePrice)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      product.currentStock <= product.minStockAlert 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      Stock: {product.currentStock}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-black flex items-center justify-center transition">
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
          <div className="glass-panel-glow p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Active Invoice Cart</h3>
              </div>
              <span className="text-xs bg-amber-500/20 text-amber-400 font-mono px-2 py-0.5 rounded">
                {cart.length} items
              </span>
            </div>

            {/* Customer Lookup & Due Tracking Box */}
            <div className="bg-dark-900/90 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" /> Customer Account Lookup
                </span>
                {existingCustomer && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                    ✓ Profile Linked
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Mobile (10 Digits)*"
                  className="glass-input px-3 py-1.5 rounded-lg text-xs font-mono"
                  maxLength={10}
                />
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Customer Name*"
                  className="glass-input px-3 py-1.5 rounded-lg text-xs"
                />
              </div>

              {/* Customer Pending Due Warning Alert! */}
              {existingCustomer && (existingCustomer.totalDue || 0) > 0 && (
                <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-start space-x-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">⚠️ Customer Pending Due Warning:</div>
                    <div>{existingCustomer.name} has previous outstanding dues of <strong className="text-white underline">{formatRupees(existingCustomer.totalDue)}</strong>.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs font-mono">
                  Cart is empty. Click items on the left to generate bill.
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.barcode} className="bg-dark-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex-1 pr-2">
                      <div className="font-semibold text-white truncate max-w-[170px]">{item.productName}</div>
                      <div className="text-[11px] text-amber-400 font-mono">₹{formatNumberIN(item.basePrice)} × {item.qty}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center bg-dark-800 border border-slate-700 rounded-lg">
                        <button onClick={() => updateCartQty(item.barcode, -1)} className="p-1 text-slate-400 hover:text-white">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono font-bold text-white text-xs">{item.qty}</span>
                        <button onClick={() => updateCartQty(item.barcode, 1)} className="p-1 text-slate-400 hover:text-white">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-mono font-bold text-white text-xs w-16 text-right">
                        ₹{formatNumberIN(item.total)}
                      </span>
                      <button onClick={() => removeFromCart(item.barcode)} className="text-slate-500 hover:text-rose-400 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector & Partial Due Calculator */}
            <div className="bg-dark-900/90 border border-slate-800 p-3.5 rounded-xl space-y-3">
              <div className="text-xs font-semibold text-slate-300">Payment & Settlement Mode</div>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {['UPI', 'Cash', 'Card', 'Credit/Due'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setPaymentMethod(mode)}
                    className={`py-1.5 rounded-lg font-mono text-[11px] font-semibold transition ${
                      paymentMethod === mode
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-dark-800 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Amount Paid & Due Breakdown */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Amount Paid Now (₹)</label>
                  <input
                    type="number"
                    value={paidRupees}
                    onChange={e => setPaidRupees(e.target.value)}
                    placeholder="0.00"
                    disabled={paymentMethod === 'Credit/Due'}
                    className="w-full glass-input px-3 py-1.5 rounded-lg font-mono text-emerald-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">New Due Balance</label>
                  <div className={`px-3 py-1.5 rounded-lg font-mono font-bold border text-xs ${
                    dueAmountPaise > 0 
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                      : 'bg-dark-800 border-slate-800 text-slate-400'
                  }`}>
                    {formatRupees(dueAmountPaise)}
                  </div>
                </div>
              </div>
            </div>

            {/* Total Footer */}
            <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span>{formatRupees(subtotalPaise)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST (18% included):</span>
                <span>{formatRupees(taxPaise)}</span>
              </div>
              <div className="flex justify-between text-white font-extrabold text-lg pt-1 border-t border-slate-800">
                <span>TOTAL AMOUNT:</span>
                <span className="text-amber-400">{formatRupees(totalAmountPaise)}</span>
              </div>

              {/* Commit Button */}
              <button
                onClick={handleCheckout}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-sm rounded-xl shadow-xl shadow-amber-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-3"
              >
                <Zap className="w-5 h-5 fill-black" />
                <span>{isSubmitting ? 'COMMITTING BATCH...' : 'COMPLETE SALE & GENERATE BILL'}</span>
              </button>
            </div>
          </div>

          {/* Live Recent Transactions Feed Widget */}
          <div className="glass-panel p-4 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>LIVE RECENT COMMIT FEED</span>
              <span className="text-[10px] text-amber-400 font-mono">REAL-TIME</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {recentPurchases.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-dark-900/60 rounded-lg border border-slate-800/60">
                  <div>
                    <div className="font-semibold text-white font-mono">{p.billNumber}</div>
                    <div className="text-[10px] text-slate-400">{p.customerName} ({p.paymentMethod})</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-400 font-mono">{formatRupees(p.totalAmount)}</div>
                    {p.dueAmount > 0 ? (
                      <span className="text-[9px] text-rose-400 font-mono">Due: {formatRupees(p.dueAmount)}</span>
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
    </div>
  );
}
