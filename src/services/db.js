import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc 
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
  appPassword: "admin123"
};

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
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLocalCache('products', items);
      } else {
        SEED_PRODUCTS.forEach(prod => {
          setDoc(doc(db, 'products', prod.barcode), prod, { merge: true }).catch(() => {});
        });
      }
    })
    .catch(e => console.warn("Background Firestore products sync:", e.message));

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
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLocalCache('customers', items);
      }
    })
    .catch(e => console.warn("Background Firestore customers sync:", e.message));

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
  const billNumber = `INV-${Date.now().toString().slice(-6)}`;

  const purchaseRecord = {
    id: billNumber,
    billNumber,
    customer: {
      phone: cleanPhone,
      name: (sale.customer && sale.customer.name) ? sale.customer.name : 'Walk-in Customer',
      address: (sale.customer && sale.customer.address) ? sale.customer.address : 'Local Store'
    },
    items: (sale.items || []).map(item => ({
      barcode: item.barcode || 'UNKNOWN',
      productName: item.productName || 'Product',
      qty: Number(item.qty || 1),
      unitPrice: Number(item.unitPrice || 0),
      total: Number((item.unitPrice || 0) * (item.qty || 1)),
      taxPercent: Number(item.taxPercent || 18)
    })),
    subtotal: Number(sale.subtotal || 0),
    taxAmount: Number(sale.taxAmount ?? sale.tax ?? 0),
    discountAmount: Number(sale.discountAmount ?? sale.discounts ?? 0),
    totalAmount: Number(sale.totalAmount || 0),
    paidAmount: Number(sale.paidAmount || 0),
    dueAmount: Number(sale.dueAmount || 0),
    paymentMethod: sale.paymentMethod || 'CASH',
    timestamp
  };

  // 1. Instant local cache update (0ms UI response)
  const purchases = getLocalCache('purchases', []);
  purchases.unshift(purchaseRecord);
  setLocalCache('purchases', purchases);

  const products = getLocalCache('products', SEED_PRODUCTS);
  (sale.items || []).forEach(item => {
    const pIdx = products.findIndex(p => p.barcode === item.barcode);
    if (pIdx >= 0) products[pIdx].currentStock = Math.max(0, products[pIdx].currentStock - item.qty);
  });
  setLocalCache('products', products);

  const customers = getLocalCache('customers', []);
  const cIdx = customers.findIndex(c => c.phone === cleanPhone);
  if (cIdx >= 0) {
    customers[cIdx].totalPurchases = (customers[cIdx].totalPurchases || 0) + purchaseRecord.totalAmount;
    customers[cIdx].totalDue = (customers[cIdx].totalDue || 0) + purchaseRecord.dueAmount;
    customers[cIdx].lastPurchaseAt = timestamp;
    customers[cIdx].name = purchaseRecord.customer.name;
    if (purchaseRecord.customer.address) customers[cIdx].address = purchaseRecord.customer.address;
  } else {
    customers.push({
      id: cleanPhone,
      phone: cleanPhone,
      name: purchaseRecord.customer.name,
      address: purchaseRecord.customer.address,
      totalPurchases: purchaseRecord.totalAmount,
      totalDue: purchaseRecord.dueAmount,
      lastPurchaseAt: timestamp
    });
  }
  setLocalCache('customers', customers);

  // 2. Non-blocking Background Writes to Cloud Firestore
  setDoc(doc(db, 'purchases', billNumber), purchaseRecord)
    .then(() => console.log("🔥 Live Firestore purchase saved:", billNumber))
    .catch(err => console.error("❌ Firestore purchase save error:", err));
  
  setDoc(doc(db, 'customers', cleanPhone), {
    id: cleanPhone,
    phone: cleanPhone,
    name: purchaseRecord.customer.name,
    address: purchaseRecord.customer.address,
    totalPurchases: (sale.customer?.totalPurchases || 0) + purchaseRecord.totalAmount,
    totalDue: (sale.customer?.totalDue || 0) + purchaseRecord.dueAmount,
    lastPurchaseAt: timestamp
  }, { merge: true })
    .then(() => console.log("🔥 Live Firestore customer updated:", cleanPhone))
    .catch(err => console.error("❌ Firestore customer save error:", err));

  for (const item of (sale.items || [])) {
    if (item.barcode) {
      setDoc(doc(db, 'products', item.barcode), {
        currentStock: Math.max(0, (item.currentStock || 0) - item.qty)
      }, { merge: true }).catch(() => {});
    }
  }

  return purchaseRecord;
}

export const processSaleBatch = createInvoice;

export async function getPurchases() {
  const cached = getLocalCache('purchases', []);

  // Non-blocking background sync with Firestore (Zero Tab Buffering)
  getDocs(collection(db, 'purchases'))
    .then(snap => {
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLocalCache('purchases', items);
      }
    })
    .catch(e => console.warn("Background Firestore purchases sync:", e.message));

  return cached;
}

// ------------------------------------------------------------------
// DUE REPAYMENTS
// ------------------------------------------------------------------
export async function recordDuePayment(payment) {
  const timestamp = new Date().toISOString();
  const paymentId = `PAY-${Math.floor(100000 + Math.random() * 900000)}`;

  const paymentRecord = {
    id: paymentId,
    customerPhone: payment.customerPhone,
    customerName: payment.customerName,
    amountPaid: payment.amountPaid,
    paymentMethod: payment.paymentMethod,
    referenceNo: payment.referenceNo || 'CASH',
    notes: payment.notes || 'Due Balance Payment',
    timestamp
  };

  const payments = getLocalCache('payments', []);
  payments.unshift(paymentRecord);
  setLocalCache('payments', payments);

  const customers = getLocalCache('customers', []);
  const cIdx = customers.findIndex(c => c.phone === payment.customerPhone);
  if (cIdx >= 0) {
    customers[cIdx].totalDue = Math.max(0, (customers[cIdx].totalDue || 0) - payment.amountPaid);
    setLocalCache('customers', customers);
  }

  setDoc(doc(db, 'customer_payments', paymentId), paymentRecord)
    .then(() => console.log("🔥 Direct Firestore payment recorded:", paymentId))
    .catch(e => console.error("❌ Firestore payment record error:", e));

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
  return local.filter(p => p.customerPhone === customerPhone);
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
