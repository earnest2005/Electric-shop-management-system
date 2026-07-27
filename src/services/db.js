import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc,
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Fallback seed data in case Firestore is completely empty on first launch
export const SEED_PRODUCTS = [
  {
    id: "890123400001",
    barcode: "890123400001",
    productName: "Havells 1.5 sqmm Wire Red (90m Roll)",
    brand: "Havells",
    category: "Wires & Cables",
    basePrice: 165000, // ₹1,650.00
    currentStock: 45,
    minStockAlert: 10,
    taxPercent: 18,
    updatedAt: new Date().toISOString()
  },
  {
    id: "890123400002",
    barcode: "890123400002",
    productName: "Anchor Roma 6A 1-Way Switch Modular",
    brand: "Anchor",
    category: "Switches & Sockets",
    basePrice: 4200, // ₹42.00
    currentStock: 120,
    minStockAlert: 20,
    taxPercent: 18,
    updatedAt: new Date().toISOString()
  },
  {
    id: "890123400003",
    barcode: "890123400003",
    productName: "Schneider 32A C-Curve Double Pole MCB",
    brand: "Schneider",
    category: "Switchgear & MCBs",
    basePrice: 48000, // ₹480.00
    currentStock: 18,
    minStockAlert: 5,
    taxPercent: 18,
    updatedAt: new Date().toISOString()
  },
  {
    id: "890123400004",
    barcode: "890123400004",
    productName: "Orient Electric 1200mm Ceiling Fan White",
    brand: "Orient",
    category: "Fans & Appliances",
    basePrice: 225000, // ₹2,250.00
    currentStock: 12,
    minStockAlert: 3,
    taxPercent: 18,
    updatedAt: new Date().toISOString()
  },
  {
    id: "890123400005",
    barcode: "890123400005",
    productName: "Philips 9W Cool Day Light LED Bulb B22",
    brand: "Philips",
    category: "Lighting",
    basePrice: 9500, // ₹95.00
    currentStock: 85,
    minStockAlert: 15,
    taxPercent: 18,
    updatedAt: new Date().toISOString()
  },
  {
    id: "890123400006",
    barcode: "890123400006",
    productName: "Finolex 20mm Heavy PVC Conduit Pipe 3m",
    brand: "Finolex",
    category: "Conduits & Fittings",
    basePrice: 8500, // ₹85.00
    currentStock: 200,
    minStockAlert: 30,
    taxPercent: 18,
    updatedAt: new Date().toISOString()
  },
  {
    id: "890123400007",
    barcode: "890123400007",
    productName: "Polycab 2.5 sqmm Wire Blue (90m Roll)",
    brand: "Polycab",
    category: "Wires & Cables",
    basePrice: 245000, // ₹2,450.00
    currentStock: 25,
    minStockAlert: 8,
    taxPercent: 18,
    updatedAt: new Date().toISOString()
  },
  {
    id: "890123400008",
    barcode: "890123400008",
    productName: "Taparia Insulation Tape Red 10m",
    brand: "Taparia",
    category: "Tools & Accessories",
    basePrice: 1500, // ₹15.00
    currentStock: 300,
    minStockAlert: 50,
    taxPercent: 18,
    updatedAt: new Date().toISOString()
  },
  {
    id: "890123400009",
    barcode: "890123400009",
    productName: "Legrand Arteor 16A 3-Pin Socket Modular",
    brand: "Legrand",
    category: "Switches & Sockets",
    basePrice: 18500, // ₹185.00
    currentStock: 40,
    minStockAlert: 10,
    taxPercent: 18,
    updatedAt: new Date().toISOString()
  },
  {
    id: "890123400010",
    barcode: "890123400010",
    productName: "Syska 18W Slim LED Panel Light Square",
    brand: "Syska",
    category: "Lighting",
    basePrice: 38000, // ₹380.00
    currentStock: 30,
    minStockAlert: 8,
    taxPercent: 18,
    updatedAt: new Date().toISOString()
  }
];

export const DEFAULT_SHOP_DETAILS = {
  shopName: "VOLT ELECTRICALS",
  tagline: "Power, Lighting & Hardware Master Store",
  ownerName: "Rajesh Kumar",
  phone: "+91 98765 00000",
  address: "Main Market Road, Near Electric Substation, Sector 4",
  gstin: "29ABCDE1234F1Z5",
  invoiceFooterNote: "Thank you for shopping at Volt Electricals! Warranty valid against invoice.",
  defaultTaxPercent: 18,
  appPassword: "admin123",
  staffPassword: "staff123"
};

export const SEED_OFFERS = [
  {
    id: 'OFFER-1001',
    title: '10% OFF on LED Bulbs',
    description: 'Get an instant 10% discount on all Philips & Syska LED bulbs',
    bannerImage: 'https://images.unsplash.com/photo-1550985616-10810253b84d?w=500&auto=format&fit=crop&q=60',
    offerType: 'Percentage Discount',
    discountValue: 10,
    applicableCategories: ['Lighting'],
    applicableProducts: ['ALL'],
    minPurchaseAmount: 0,
    startDate: new Date(Date.now() - 86400000 * 7).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
    status: 'active',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'OFFER-1002',
    title: 'Buy 2 Switches Get 1 Free',
    description: 'Buy 2 modular switches and receive 1 switch free at checkout',
    bannerImage: '',
    offerType: 'Buy X Get Y',
    discountValue: 100,
    applicableCategories: ['Switches & Sockets'],
    applicableProducts: ['ALL'],
    minPurchaseAmount: 0,
    startDate: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400000 * 45).toISOString().slice(0, 10),
    status: 'active',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'OFFER-1003',
    title: 'Flat ₹500 OFF above ₹10,000',
    description: 'Special instant rebate for bulk hardware & wiring purchases over ₹10,000',
    bannerImage: '',
    offerType: 'Flat Discount',
    discountValue: 500,
    applicableCategories: ['ALL'],
    applicableProducts: ['ALL'],
    minPurchaseAmount: 10000,
    startDate: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400000 * 60).toISOString().slice(0, 10),
    status: 'active',
    updatedAt: new Date().toISOString()
  }
];

export const SEED_CUSTOMERS = [];
export const SEED_PURCHASES = [];
export const SEED_PAYMENTS = [];

// Local cache helper for instant 0ms UI rendering
function getLocalCache(key, fallback = []) {
  try {
    const raw = localStorage.getItem(`volt_db_${key}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return fallback;
}

function setLocalCache(key, data, emitEvent = true) {
  try {
    const jsonStr = JSON.stringify(data);
    const existingStr = localStorage.getItem(`volt_db_${key}`);
    if (existingStr === jsonStr) {
      // Data unchanged; skip event to prevent infinite re-fetch loop
      return;
    }
    localStorage.setItem(`volt_db_${key}`, jsonStr);
    if (emitEvent) {
      window.dispatchEvent(new CustomEvent('volt_db_updated', { detail: { key } }));
    }
  } catch (e) {}
}

// ------------------------------------------------------------------
// PRODUCTS
// ------------------------------------------------------------------
export async function getProducts() {
  const cached = getLocalCache('products', SEED_PRODUCTS);

  // Non-blocking background sync with Firestore (Zero Tab Buffering)
  getDocs(collection(db, 'products'))
    .then(snap => {
      if (!snap.empty) {
        const remoteItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const currentLocal = getLocalCache('products', SEED_PRODUCTS);

        // Smart Merge to avoid losing local product updates
        const mergedMap = new Map();
        remoteItems.forEach(item => {
          const key = item.barcode || item.id;
          if (key) mergedMap.set(key, item);
        });
        currentLocal.forEach(item => {
          const key = item.barcode || item.id;
          if (key) {
            const existing = mergedMap.get(key);
            if (!existing || new Date(item.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
              mergedMap.set(key, item);
            }
          }
        });

        const mergedList = Array.from(mergedMap.values());
        setLocalCache('products', mergedList);
      } else {
        SEED_PRODUCTS.forEach(prod => {
          setDoc(doc(db, 'products', prod.barcode), prod, { merge: true }).catch(() => {});
        });
      }
    })
    .catch(e => console.warn("Background Firestore products sync warning:", e.message));

  return cached;
}

export async function saveProduct(product) {
  const productData = {
    ...product,
    id: product.barcode,
    barcode: product.barcode,
    basePrice: Number(product.basePrice),
    currentStock: Number(product.currentStock),
    minStockAlert: Number(product.minStockAlert || 10),
    taxPercent: Number(product.taxPercent || 18),
    updatedAt: new Date().toISOString()
  };

  // Instant local cache update (0ms UI latency)
  const products = getLocalCache('products', SEED_PRODUCTS);
  const idx = products.findIndex(p => p.barcode === product.barcode || p.id === product.id);
  if (idx >= 0) products[idx] = { ...products[idx], ...productData };
  else products.unshift(productData);
  setLocalCache('products', products);

  // Live Non-Blocking Firebase Write
  setDoc(doc(db, 'products', product.barcode), productData, { merge: true })
    .then(() => console.log("🔥 Direct Firestore product saved:", product.barcode))
    .catch(e => console.error("❌ Firestore saveProduct error:", e));

  return productData;
}

// ------------------------------------------------------------------
// CUSTOMERS
// ------------------------------------------------------------------
export async function getCustomers() {
  const cached = getLocalCache('customers', []);

  // Non-blocking background sync with Firestore (Zero Tab Buffering)
  getDocs(collection(db, 'customers'))
    .then(snap => {
      if (!snap.empty) {
        const remoteItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const currentLocal = getLocalCache('customers', []);

        // Smart Merge to avoid overwriting recent local customer updates
        const mergedMap = new Map();
        remoteItems.forEach(item => {
          const key = (item.phone || item.id || '').replace(/\D/g, '');
          if (key) mergedMap.set(key, item);
        });
        currentLocal.forEach(item => {
          const key = (item.phone || item.id || '').replace(/\D/g, '');
          if (key) {
            const existing = mergedMap.get(key);
            if (!existing || new Date(item.lastPurchaseAt || item.updatedAt || 0) >= new Date(existing.lastPurchaseAt || existing.updatedAt || 0)) {
              mergedMap.set(key, item);
            }
          }
        });

        const mergedList = Array.from(mergedMap.values());
        setLocalCache('customers', mergedList);
      }
    })
    .catch(e => console.warn("Background Firestore customers sync warning:", e.message));

  return cached;
}

export async function searchCustomerByPhone(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) return null;
  const customers = await getCustomers();
  return customers.find(c => c.phone.replace(/\D/g, '') === cleanPhone) || null;
}

export async function saveCustomer(cust) {
  const cleanPhone = cust.phone.replace(/\D/g, '') || `CUST-${Date.now()}`;
  const custData = {
    ...cust,
    id: cleanPhone,
    phone: cleanPhone,
    name: cust.name || 'Customer',
    address: cust.address || 'Local Store',
    totalPurchases: Number(cust.totalPurchases || 0),
    totalDue: Number(cust.totalDue || 0),
    lastPurchaseAt: cust.lastPurchaseAt || new Date().toISOString()
  };

  // Instant local cache update (0ms UI latency)
  const customers = getLocalCache('customers', []);
  const idx = customers.findIndex(c => c.phone.replace(/\D/g, '') === cleanPhone);
  if (idx >= 0) customers[idx] = { ...customers[idx], ...custData };
  else customers.unshift(custData);
  setLocalCache('customers', customers);

  // Live Non-Blocking Firebase Write
  setDoc(doc(db, 'customers', cleanPhone), custData, { merge: true })
    .then(() => console.log("🔥 Direct Firestore customer saved:", cleanPhone))
    .catch(e => console.error("❌ Firestore saveCustomer error:", e));

  return custData;
}

// ------------------------------------------------------------------
// INVOICE / SALES BILLING
// ------------------------------------------------------------------
export async function createInvoice(sale) {
  const rawPhone = (sale.customer && sale.customer.phone) ? sale.customer.phone.replace(/\D/g, '') : '';
  const cleanPhone = rawPhone || `CUST-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const billNumber = sale.billNumber || `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  console.log("📄 Creating invoice:", billNumber, "for customer:", cleanPhone);

  // Find existing customer in local cache to preserve prior totalPurchases and totalDue
  const customersCache = getLocalCache('customers', []);
  const existingCust = customersCache.find(c => c.phone.replace(/\D/g, '') === cleanPhone);

  const prevTotalPurchases = Number(existingCust?.totalPurchases || sale.customer?.totalPurchases || 0);
  const prevTotalDue = Number(existingCust?.totalDue || sale.customer?.totalDue || 0);

  const newTotalPurchases = prevTotalPurchases + Number(sale.totalAmount || 0);
  const newTotalDue = prevTotalDue + Number(sale.dueAmount || 0);

  const customerRecord = {
    id: cleanPhone,
    phone: cleanPhone,
    name: (sale.customer && sale.customer.name) ? sale.customer.name : 'Walk-in Customer',
    address: (sale.customer && sale.customer.address) ? sale.customer.address : 'Local Store',
    totalPurchases: newTotalPurchases,
    totalDue: newTotalDue,
    lastPurchaseAt: timestamp
  };

  const formattedItems = (sale.items || []).map(item => {
    const unitPrice = Number(item.unitPrice ?? item.basePrice ?? 0);
    const qty = Number(item.qty || 1);
    const total = Number(item.total ?? (unitPrice * qty));
    return {
      barcode: item.barcode || 'UNKNOWN',
      productName: item.productName || 'Product',
      qty,
      unitPrice,
      basePrice: unitPrice,
      total,
      taxPercent: Number(item.taxPercent || 18)
    };
  });

  const staffName = sale.staffName || sale.staff || 'Staff';

  const purchaseRecord = {
    id: billNumber,
    billNumber,
    customer: {
      phone: cleanPhone,
      name: customerRecord.name,
      address: customerRecord.address
    },
    items: formattedItems,
    subtotal: Number(sale.subtotal || 0),
    taxAmount: Number(sale.taxAmount ?? sale.tax ?? 0),
    discountAmount: Number(sale.discountAmount ?? sale.discounts ?? 0),
    totalAmount: Number(sale.totalAmount || 0),
    paidAmount: Number(sale.paidAmount || 0),
    dueAmount: Number(sale.dueAmount || 0),
    paymentMethod: sale.paymentMethod || 'CASH',
    staffName,
    staff: staffName,
    timestamp
  };

  const productsCache = getLocalCache('products', SEED_PRODUCTS);
  const updatedProductsCache = [...productsCache];

  // 1. Sync Local Caches IMMEDIATELY so UI updates instantly without latency
  const purchasesCache = getLocalCache('purchases', []);
  // Remove duplicate if bill number already exists locally
  const filteredPurchasesCache = purchasesCache.filter(p => (p.billNumber || p.id) !== billNumber);
  filteredPurchasesCache.unshift(purchaseRecord);
  setLocalCache('purchases', filteredPurchasesCache);

  setLocalCache('products', updatedProductsCache);

  const cIdx = customersCache.findIndex(c => c.phone.replace(/\D/g, '') === cleanPhone);
  if (cIdx >= 0) {
    customersCache[cIdx] = { ...customersCache[cIdx], ...customerRecord };
  } else {
    customersCache.unshift(customerRecord);
  }
  setLocalCache('customers', customersCache);

  // 2. Atomic Firestore Batch Write
  try {
    const batch = writeBatch(db);

    // Save purchase invoice document
    batch.set(doc(db, 'purchases', billNumber), purchaseRecord);

    // Save / Update customer document
    batch.set(doc(db, 'customers', cleanPhone), customerRecord, { merge: true });

    // Update product inventory stocks
    for (const item of (sale.items || [])) {
      if (item.barcode && item.barcode !== 'UNKNOWN') {
        const pIdx = updatedProductsCache.findIndex(p => p.barcode === item.barcode);
        let newStock = 0;
        if (pIdx >= 0) {
          newStock = Math.max(0, (updatedProductsCache[pIdx].currentStock || 0) - item.qty);
          updatedProductsCache[pIdx] = { ...updatedProductsCache[pIdx], currentStock: newStock };
        } else {
          newStock = Math.max(0, (item.currentStock || 0) - item.qty);
        }
        batch.set(doc(db, 'products', item.barcode), { currentStock: newStock }, { merge: true });
      }
    }

    // Commit all Firestore operations atomically
    await batch.commit();
    console.log("🔥 Firestore Atomic Sale Batch Committed Successfully:", billNumber);
  } catch (err) {
    console.error("❌ Firestore write batch error (offline fallback active):", err.message);
  }

  return purchaseRecord;
}

export const processSaleBatch = createInvoice;

export async function getPurchases() {
  const cached = getLocalCache('purchases', []);

  // Ensure cached purchases returned are sorted descending by timestamp
  const sortedCached = [...cached].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  // Non-blocking background sync with Firestore
  getDocs(collection(db, 'purchases'))
    .then(snap => {
      if (!snap.empty) {
        const remoteItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const currentLocal = getLocalCache('purchases', []);

        // Smart Merge remote Firestore items with local storage items
        const mergedMap = new Map();
        remoteItems.forEach(item => {
          const key = item.billNumber || item.id;
          if (key) mergedMap.set(key, item);
        });
        currentLocal.forEach(item => {
          const key = item.billNumber || item.id;
          if (key) {
            const existing = mergedMap.get(key);
            // Preserve local item if not in Firestore yet or if locally updated newer timestamp
            if (!existing || new Date(item.timestamp || 0) >= new Date(existing.timestamp || 0)) {
              mergedMap.set(key, item);
            }
          }
        });

        const mergedList = Array.from(mergedMap.values());
        // Sort descending by timestamp (newest bills first)
        mergedList.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

        setLocalCache('purchases', mergedList);
      }
    })
    .catch(e => console.warn("Background Firestore purchases sync warning:", e.message));

  return sortedCached;
}

// ------------------------------------------------------------------
// DUE REPAYMENTS
// ------------------------------------------------------------------
export async function recordDuePayment(payment) {
  const timestamp = new Date().toISOString();
  const paymentId = `PAY-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  const cleanPhone = (payment.customerPhone || '').replace(/\D/g, '');
  if (!cleanPhone) throw new Error("Valid customer phone number required.");

  const amountPaid = Number(payment.amountPaid || 0);
  if (isNaN(amountPaid) || amountPaid <= 0) {
    throw new Error("Invalid payment amount. Must be greater than zero.");
  }

  // 1. Get customer from cache & compute previous / remaining due
  const customers = getLocalCache('customers', []);
  const cIdx = customers.findIndex(c => (c.phone || '').replace(/\D/g, '') === cleanPhone);

  if (cIdx < 0) {
    throw new Error("Customer record not found.");
  }

  const customerRecord = { ...customers[cIdx] };
  const previousDue = Number(customerRecord.totalDue || 0);

  if (amountPaid > previousDue && previousDue > 0) {
    throw new Error(`Payment amount (₹${(amountPaid / 100).toFixed(2)}) exceeds current outstanding due (₹${(previousDue / 100).toFixed(2)}).`);
  }

  const remainingDue = Math.max(0, previousDue - amountPaid);
  customerRecord.totalDue = remainingDue;
  customerRecord.updatedAt = timestamp;

  // 2. Locate open due invoices for this customer to allocate payment
  const purchases = getLocalCache('purchases', []);
  const updatedPurchases = [...purchases];

  // Filter purchases belonging to this customer with dueAmount > 0
  const openBills = [];
  updatedPurchases.forEach((p, idx) => {
    const pPhone = (p.customer?.phone || p.customerPhone || '').replace(/\D/g, '');
    if (pPhone === cleanPhone && (p.dueAmount || 0) > 0) {
      openBills.push({ index: idx, bill: { ...p } });
    }
  });

  // Sort open bills by timestamp ascending (oldest bills paid off first)
  openBills.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

  let unallocatedAmount = amountPaid;
  const modifiedBillRecords = [];

  for (const item of openBills) {
    if (unallocatedAmount <= 0) break;

    const b = item.bill;
    const billDue = Number(b.dueAmount || 0);
    const payToBill = Math.min(billDue, unallocatedAmount);

    b.paidAmount = Number(b.paidAmount || 0) + payToBill;
    b.dueAmount = Math.max(0, billDue - payToBill);
    b.paymentStatus = b.dueAmount === 0 ? 'PAID' : 'PARTIAL';
    b.updatedAt = timestamp;

    unallocatedAmount -= payToBill;

    // Update in local purchases list
    updatedPurchases[item.index] = b;
    modifiedBillRecords.push(b);
  }

  // Primary bill number reference for payment history
  const primaryBillNumber = payment.billNumber || (modifiedBillRecords.length > 0 ? modifiedBillRecords[0].billNumber : 'ACCOUNT-LEDGER');

  const staffName = payment.staffName || payment.staffUsername || 'Staff';

  // 3. Build enriched payment history document
  const paymentRecord = {
    id: paymentId,
    paymentId,
    customerPhone: cleanPhone,
    customerName: payment.customerName || customerRecord.name || 'Customer',
    billNumber: primaryBillNumber,
    previousDue,
    amountPaid,
    remainingDue,
    paymentMethod: payment.paymentMethod || 'UPI',
    referenceNo: payment.referenceNo || 'CASH',
    notes: payment.notes || 'Due Balance Payment',
    staffName,
    staffUsername: staffName,
    timestamp
  };

  // 4. Atomic Firestore Batch Write
  try {
    const batch = writeBatch(db);

    // a. Create customer payment doc
    batch.set(doc(db, 'customer_payments', paymentId), paymentRecord);

    // b. Update customer doc in Firestore (Crucial: prevents background sync from reverting totalDue!)
    batch.set(doc(db, 'customers', cleanPhone), {
      totalDue: remainingDue,
      updatedAt: timestamp
    }, { merge: true });

    // c. Update all affected invoice docs in Firestore
    for (const b of modifiedBillRecords) {
      const docId = b.id || b.billNumber;
      batch.set(doc(db, 'purchases', docId), {
        paidAmount: b.paidAmount,
        dueAmount: b.dueAmount,
        paymentStatus: b.paymentStatus,
        updatedAt: timestamp
      }, { merge: true });
    }

    await batch.commit();
    console.log("🔥 Firestore Atomic Due Payment Batch Committed:", paymentId);
  } catch (err) {
    console.warn("⚠️ Firestore due payment write batch error (offline fallback active):", err.message);
  }

  // 5. Atomic Local Cache Updates
  const payments = getLocalCache('payments', []);
  payments.unshift(paymentRecord);
  setLocalCache('payments', payments, false);

  customers[cIdx] = customerRecord;
  setLocalCache('customers', customers, false);

  setLocalCache('purchases', updatedPurchases, true);

  return paymentRecord;
}

export async function getCustomerPayments(customerPhone) {
  const local = getLocalCache('payments', []);

  getDocs(collection(db, 'customer_payments'))
    .then(snap => {
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLocalCache('payments', items);
      }
    })
    .catch(e => console.warn("Background Firestore payments sync:", e.message));

  if (!customerPhone) return local;
  const cleanPhone = customerPhone.replace(/\D/g, '');
  return local.filter(p => (p.customerPhone || '').replace(/\D/g, '') === cleanPhone);
}

// ------------------------------------------------------------------
// OFFERS & PROMOTIONS
// ------------------------------------------------------------------
export async function getOffers() {
  const cached = getLocalCache('offers', SEED_OFFERS);

  getDocs(collection(db, 'offers'))
    .then(snap => {
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLocalCache('offers', items);
      } else {
        SEED_OFFERS.forEach(offer => {
          setDoc(doc(db, 'offers', offer.id), offer, { merge: true }).catch(() => {});
        });
      }
    })
    .catch(e => console.warn("Background Firestore offers sync:", e.message));

  return cached;
}

export async function saveOffer(offer) {
  const id = offer.id || `OFFER-${Date.now()}`;
  const offerData = {
    ...offer,
    id,
    discountValue: Number(offer.discountValue || 0),
    minPurchaseAmount: Number(offer.minPurchaseAmount || 0),
    status: offer.status || 'active',
    updatedAt: new Date().toISOString()
  };

  const offers = getLocalCache('offers', SEED_OFFERS);
  const idx = offers.findIndex(o => o.id === id);
  if (idx >= 0) offers[idx] = offerData;
  else offers.unshift(offerData);
  setLocalCache('offers', offers);

  setDoc(doc(db, 'offers', id), offerData, { merge: true })
    .then(() => console.log("🔥 Direct Firestore offer saved:", id))
    .catch(e => console.error("❌ Firestore saveOffer error:", e));

  return offerData;
}

export async function deleteOffer(id) {
  const offers = getLocalCache('offers', SEED_OFFERS);
  const updated = offers.filter(o => o.id !== id);
  setLocalCache('offers', updated);

  deleteDoc(doc(db, 'offers', id))
    .then(() => console.log("🔥 Direct Firestore offer deleted:", id))
    .catch(err => console.error("❌ Firestore deleteOffer error:", err));

  return true;
}

// ------------------------------------------------------------------
// SHOP SETTINGS & PASSWORD
// ------------------------------------------------------------------
export async function getShopDetails() {
  const cached = getLocalCache('shop_details', DEFAULT_SHOP_DETAILS);

  getDoc(doc(db, 'settings', 'shop_info'))
    .then(snap => {
      if (snap.exists()) {
        const cloudDetails = snap.data();
        const merged = { ...DEFAULT_SHOP_DETAILS, ...cloudDetails };
        setLocalCache('shop_details', merged);
      }
    })
    .catch(e => console.warn("Background Firestore shop details sync:", e.message));

  return cached;
}

export async function saveShopDetails(details) {
  setLocalCache('shop_details', details);
  window.dispatchEvent(new CustomEvent('volt_shop_updated', { detail: details }));

  const docRef = doc(db, 'settings', 'shop_info');
  setDoc(docRef, details, { merge: true })
    .then(() => console.log("🔥 Direct Firestore shop details & password saved:", details))
    .catch(e => console.error("❌ Firestore saveShopDetails error:", e));

  return details;
}

// ------------------------------------------------------------------
// DELETE & DATA RESET
// ------------------------------------------------------------------
export async function deleteCustomer(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  const customers = getLocalCache('customers', []);
  const updated = customers.filter(c => c.phone.replace(/\D/g, '') !== cleanPhone);
  setLocalCache('customers', updated);

  deleteDoc(doc(db, 'customers', cleanPhone))
    .then(() => console.log("🔥 Direct Firestore customer deleted:", cleanPhone))
    .catch(err => console.error("❌ Firestore deleteCustomer error:", err));

  return true;
}

export async function deleteInvoice(billNumber) {
  const purchases = getLocalCache('purchases', []);
  const updated = purchases.filter(p => (p.billNumber || p.id) !== billNumber);
  setLocalCache('purchases', updated);

  deleteDoc(doc(db, 'purchases', billNumber))
    .then(() => console.log("🔥 Direct Firestore invoice deleted:", billNumber))
    .catch(err => console.error("❌ Firestore deleteInvoice error:", err));

  return true;
}

export async function clearBillsAndCustomers() {
  localStorage.setItem('volt_db_purchases', JSON.stringify([]));
  localStorage.setItem('volt_db_customers', JSON.stringify([]));
  localStorage.setItem('volt_db_payments', JSON.stringify([]));

  try {
    const collectionsToClear = ['purchases', 'customers', 'customer_payments'];
    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          await deleteDoc(docSnap.ref);
        }
      }
    }
    console.log("🔥 Direct Firestore records cleared!");
  } catch (err) {
    console.error("❌ Firestore clear error:", err);
  }

  window.dispatchEvent(new CustomEvent('volt_db_updated', { detail: { key: 'all' } }));
  return true;
}
