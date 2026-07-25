import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc,
  writeBatch 
} from 'firebase/firestore';
import { db, isRealFirebase } from '../firebase/config';

// Helper: Timeout wrapper for Firestore operations to prevent UI buffering
function withTimeout(promise, ms = 2500) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore operation timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Seed Mock Data in Paise (1 Rupee = 100 Paise)
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

export const SEED_CUSTOMERS = [];

export const SEED_PURCHASES = [];

export const SEED_PAYMENTS = [];

// LocalStorage Persistence Helpers
function getLocalStore(key, defaultData) {
  try {
    const data = localStorage.getItem(`volt_db_${key}`);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.warn(`Error reading local store ${key}:`, e);
  }
  localStorage.setItem(`volt_db_${key}`, JSON.stringify(defaultData));
  return defaultData;
}

function setLocalStore(key, data, notify = true) {
  try {
    const newStr = JSON.stringify(data);
    const oldStr = localStorage.getItem(`volt_db_${key}`);
    if (oldStr === newStr) return; // Prevent duplicate writes & loops
    localStorage.setItem(`volt_db_${key}`, newStr);
    if (notify) {
      window.dispatchEvent(new CustomEvent('volt_db_updated', { detail: { key } }));
    }
  } catch (e) {
    console.warn(`Error writing local store ${key}:`, e);
  }
}

// Service Functions
export async function getProducts() {
  try {
    if (db && isRealFirebase) {
      const snap = await withTimeout(getDocs(collection(db, 'products')), 2000);
      if (!snap.empty) {
        const cloudProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLocalStore('products', cloudProducts, false);
        return cloudProducts;
      }
    }
  } catch (err) {
    console.warn("Firestore fetch products warning, using local store:", err.message);
  }
  return getLocalStore('products', SEED_PRODUCTS);
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

  // 1. Instant local store update for 0ms delay UI reaction
  const products = getLocalStore('products', SEED_PRODUCTS);
  const idx = products.findIndex(p => p.barcode === product.barcode || p.id === product.id);
  if (idx >= 0) {
    products[idx] = { ...products[idx], ...productData };
  } else {
    products.unshift(productData);
  }
  setLocalStore('products', products);

  // 2. Non-blocking Cloud Firestore background write
  if (db && isRealFirebase) {
    withTimeout(setDoc(doc(db, 'products', product.barcode), productData, { merge: true }), 2500)
      .then(() => console.log("Cloud Firestore product saved:", product.barcode))
      .catch(err => console.warn("Firestore saveProduct warning:", err.message));
  }

  return productData;
}

export async function getCustomers() {
  try {
    if (db && isRealFirebase) {
      const snap = await withTimeout(getDocs(collection(db, 'customers')), 2000);
      if (!snap.empty) {
        const cloudCusts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLocalStore('customers', cloudCusts, false);
        return cloudCusts;
      }
    }
  } catch (err) {
    console.warn("Firestore getCustomers warning:", err.message);
  }
  return getLocalStore('customers', SEED_CUSTOMERS);
}

export async function searchCustomerByPhone(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) return null;
  
  const customers = await getCustomers();
  return customers.find(c => c.phone.replace(/\D/g, '') === cleanPhone) || null;
}

export async function saveCustomer(customerData) {
  const cleanPhone = customerData.phone.replace(/\D/g, '');
  const updatedDoc = {
    id: cleanPhone,
    phone: cleanPhone,
    name: customerData.name,
    address: customerData.address || 'Local Customer',
    totalPurchases: customerData.totalPurchases || 0,
    totalDue: customerData.totalDue || 0,
    lastPurchaseAt: customerData.lastPurchaseAt || new Date().toISOString()
  };

  const customers = getLocalStore('customers', SEED_CUSTOMERS);
  const idx = customers.findIndex(c => c.phone === cleanPhone);
  if (idx >= 0) {
    customers[idx] = { ...customers[idx], ...updatedDoc };
  } else {
    customers.push(updatedDoc);
  }
  setLocalStore('customers', customers);

  if (db && isRealFirebase) {
    withTimeout(setDoc(doc(db, 'customers', cleanPhone), updatedDoc, { merge: true }), 2500)
      .catch(e => console.warn("Firestore saveCustomer warning:", e.message));
  }

  return updatedDoc;
}

/**
 * Executes Instant Local & Background Firestore Atomic Transaction for POS Billing
 */
export async function processSaleBatch(sale) {
  const timestamp = new Date().toISOString();
  const billNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const cleanPhone = sale.customer.phone.replace(/\D/g, '');

  const purchaseRecord = {
    id: billNumber,
    billNumber,
    customerId: cleanPhone,
    customerPhone: cleanPhone,
    customerName: sale.customer.name,
    subtotal: sale.subtotal,
    tax: sale.tax,
    discounts: sale.discounts,
    totalAmount: sale.totalAmount,
    paidAmount: sale.paidAmount,
    dueAmount: sale.dueAmount,
    paymentMethod: sale.paymentMethod,
    status: sale.dueAmount > 0 ? (sale.paidAmount > 0 ? 'Partial' : 'Credit/Due') : 'Completed',
    timestamp,
    items: sale.items.map(item => ({
      barcode: item.barcode,
      productName: item.productName,
      qty: item.qty,
      basePrice: item.basePrice,
      total: item.total
    }))
  };

  // 1. Instant local store update for 0ms latency UI response
  const purchases = getLocalStore('purchases', SEED_PURCHASES);
  purchases.unshift(purchaseRecord);
  setLocalStore('purchases', purchases);

  const products = getLocalStore('products', SEED_PRODUCTS);
  sale.items.forEach(item => {
    const pIdx = products.findIndex(p => p.barcode === item.barcode);
    if (pIdx >= 0) {
      products[pIdx].currentStock = Math.max(0, products[pIdx].currentStock - item.qty);
    }
  });
  setLocalStore('products', products);

  const customers = getLocalStore('customers', SEED_CUSTOMERS);
  const cIdx = customers.findIndex(c => c.phone === cleanPhone);
  if (cIdx >= 0) {
    customers[cIdx].totalPurchases = (customers[cIdx].totalPurchases || 0) + sale.totalAmount;
    customers[cIdx].totalDue = (customers[cIdx].totalDue || 0) + sale.dueAmount;
    customers[cIdx].lastPurchaseAt = timestamp;
    customers[cIdx].name = sale.customer.name;
    if (sale.customer.address) customers[cIdx].address = sale.customer.address;
  } else {
    customers.push({
      id: cleanPhone,
      phone: cleanPhone,
      name: sale.customer.name,
      address: sale.customer.address || 'Local Customer',
      totalPurchases: sale.totalAmount,
      totalDue: sale.dueAmount,
      lastPurchaseAt: timestamp
    });
  }
  setLocalStore('customers', customers);

  // 2. Non-blocking Cloud Firestore background write
  if (db && isRealFirebase) {
    const batchSync = async () => {
      const batch = writeBatch(db);
      
      const purchaseRef = doc(collection(db, 'purchases'), billNumber);
      batch.set(purchaseRef, purchaseRecord);

      sale.items.forEach(item => {
        const prodRef = doc(db, 'products', item.barcode);
        batch.update(prodRef, {
          currentStock: Math.max(0, item.currentStock - item.qty)
        });
      });

      const customerRef = doc(db, 'customers', cleanPhone);
      batch.set(customerRef, {
        id: cleanPhone,
        phone: cleanPhone,
        name: sale.customer.name,
        address: sale.customer.address || 'Local Customer',
        totalPurchases: (sale.customer.totalPurchases || 0) + sale.totalAmount,
        totalDue: (sale.customer.totalDue || 0) + sale.dueAmount,
        lastPurchaseAt: timestamp
      }, { merge: true });

      await batch.commit();
      console.log("Firestore Batched Write Committed Successfully!");
    };

    withTimeout(batchSync(), 3000)
      .catch(err => console.warn("Firestore sale sync warning:", err.message));
  }

  return purchaseRecord;
}

export async function getPurchases() {
  try {
    if (db && isRealFirebase) {
      const snap = await withTimeout(getDocs(collection(db, 'purchases')), 2000);
      if (!snap.empty) {
        const cloudPurchases = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLocalStore('purchases', cloudPurchases, false);
        return cloudPurchases;
      }
    }
  } catch (e) {
    console.warn("Firestore getPurchases warning:", e.message);
  }
  return getLocalStore('purchases', SEED_PURCHASES);
}

/**
 * Records Due Repayment by a Customer
 */
export async function recordDuePayment(payment) {
  const timestamp = new Date().toISOString();
  const paymentId = `PAY-${Math.floor(100000 + Math.random() * 900000)}`;

  const paymentRecord = {
    id: paymentId,
    customerPhone: payment.customerPhone,
    customerName: payment.customerName,
    amountPaid: payment.amountPaid, // In Paise
    paymentMethod: payment.paymentMethod,
    referenceNo: payment.referenceNo || 'CASH',
    notes: payment.notes || 'Due Balance Payment',
    timestamp
  };

  const payments = getLocalStore('payments', SEED_PAYMENTS);
  payments.unshift(paymentRecord);
  setLocalStore('payments', payments);

  const customers = getLocalStore('customers', SEED_CUSTOMERS);
  const cIdx = customers.findIndex(c => c.phone === payment.customerPhone);
  if (cIdx >= 0) {
    customers[cIdx].totalDue = Math.max(0, (customers[cIdx].totalDue || 0) - payment.amountPaid);
    setLocalStore('customers', customers);
  }

  if (db && isRealFirebase) {
    const payAsync = async () => {
      const batch = writeBatch(db);
      const payRef = doc(collection(db, 'customer_payments'), paymentId);
      batch.set(payRef, paymentRecord);

      const custRef = doc(db, 'customers', payment.customerPhone);
      const custDoc = await getDoc(custRef);
      if (custDoc.exists()) {
        const currentDue = custDoc.data().totalDue || 0;
        batch.update(custRef, {
          totalDue: Math.max(0, currentDue - payment.amountPaid)
        });
      }
      await batch.commit();
    };

    withTimeout(payAsync(), 3000)
      .catch(err => console.warn("Firestore recordDuePayment warning:", err.message));
  }

  return paymentRecord;
}

export async function getCustomerPayments(customerPhone) {
  try {
    if (db && isRealFirebase) {
      const snap = await withTimeout(getDocs(collection(db, 'customer_payments')), 2000);
      const payments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (!customerPhone) return payments;
      return payments.filter(p => p.customerPhone === customerPhone);
    }
  } catch (err) {
    console.warn("Firestore getCustomerPayments warning:", err.message);
  }
  const payments = getLocalStore('payments', SEED_PAYMENTS);
  if (!customerPhone) return payments;
  return payments.filter(p => p.customerPhone === customerPhone);
}

export const DEFAULT_SHOP_DETAILS = {
  shopName: "VOLT ELECTRICALS",
  tagline: "Power, Lighting & Hardware Master Store",
  ownerName: "Rajesh Kumar",
  phone: "+91 98765 00000",
  address: "Main Market Road, Near Electric Substation, Sector 4",
  gstin: "29ABCDE1234F1Z5",
  invoiceFooterNote: "Thank you for shopping at Volt Electricals! Warranty valid against invoice.",
  defaultTaxPercent: 18
};

export async function getShopDetails() {
  try {
    if (db && isRealFirebase) {
      const docRef = doc(db, 'settings', 'shop_info');
      const snap = await withTimeout(getDoc(docRef), 2000);
      if (snap.exists()) {
        const data = snap.data();
        setLocalStore('shop_details', data, false);
        return data;
      }
    }
  } catch (err) {
    console.warn("Firestore getShopDetails warning:", err.message);
  }
  return getLocalStore('shop_details', DEFAULT_SHOP_DETAILS);
}

export async function saveShopDetails(details) {
  setLocalStore('shop_details', details);
  window.dispatchEvent(new CustomEvent('volt_shop_updated', { detail: details }));

  if (db && isRealFirebase) {
    const docRef = doc(db, 'settings', 'shop_info');
    withTimeout(setDoc(docRef, details, { merge: true }), 2500)
      .catch(e => console.warn("Firestore saveShopDetails warning:", e.message));
  }
  return details;
}

export async function deleteCustomer(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  // 1. Remove from local store
  const customers = getLocalStore('customers', []);
  const updated = customers.filter(c => c.phone.replace(/\D/g, '') !== cleanPhone);
  setLocalStore('customers', updated);

  // 2. Delete from Cloud Firestore
  if (db && isRealFirebase) {
    try {
      await withTimeout(deleteDoc(doc(db, 'customers', cleanPhone)), 3000);
      console.log("Deleted customer from Cloud Firestore:", cleanPhone);
    } catch (err) {
      console.warn("Firestore deleteCustomer warning:", err.message);
    }
  }

  window.dispatchEvent(new CustomEvent('volt_db_updated', { detail: { key: 'customers' } }));
  return true;
}

export async function deleteInvoice(billNumber) {
  // 1. Remove from local store
  const purchases = getLocalStore('purchases', []);
  const updated = purchases.filter(p => p.billNumber !== billNumber && p.id !== billNumber);
  setLocalStore('purchases', updated);

  // 2. Delete from Cloud Firestore
  if (db && isRealFirebase) {
    try {
      await withTimeout(deleteDoc(doc(db, 'purchases', billNumber)), 3000);
      console.log("Deleted invoice from Cloud Firestore:", billNumber);
    } catch (err) {
      console.warn("Firestore deleteInvoice warning:", err.message);
    }
  }

  window.dispatchEvent(new CustomEvent('volt_db_updated', { detail: { key: 'purchases' } }));
  return true;
}

export async function clearBillsAndCustomers() {
  // 1. Clear Local Storage
  localStorage.setItem('volt_db_purchases', JSON.stringify([]));
  localStorage.setItem('volt_db_customers', JSON.stringify([]));
  localStorage.setItem('volt_db_payments', JSON.stringify([]));

  // 2. Clear Cloud Firestore collections if connected
  if (db && isRealFirebase) {
    try {
      const collectionsToClear = ['purchases', 'customers', 'customer_payments'];
      for (const colName of collectionsToClear) {
        const snap = await withTimeout(getDocs(collection(db, colName)), 4000);
        if (!snap.empty) {
          // Delete every document in Firestore
          const deletePromises = snap.docs.map(docSnap => deleteDoc(docSnap.ref));
          await Promise.all(deletePromises);
        }
      }
      console.log("Cloud Firestore bills, customer, and payment collections wiped clean!");
    } catch (err) {
      console.warn("Firestore wipe warning:", err.message);
    }
  }

  // 3. Dispatch global update event
  window.dispatchEvent(new CustomEvent('volt_db_updated', { detail: { key: 'all' } }));
  return true;
}

export async function seedLiveFirebase() {
  if (!db) throw new Error("Firestore instance not initialized");

  const batch = writeBatch(db);
  SEED_PRODUCTS.forEach(prod => {
    const prodRef = doc(db, 'products', prod.barcode);
    batch.set(prodRef, prod, { merge: true });
  });

  SEED_CUSTOMERS.forEach(cust => {
    const custRef = doc(db, 'customers', cust.phone);
    batch.set(custRef, cust, { merge: true });
  });

  const shopRef = doc(db, 'settings', 'shop_info');
  batch.set(shopRef, DEFAULT_SHOP_DETAILS, { merge: true });

  await batch.commit();
  console.log("Seeded Live Firebase Cloud Firestore successfully!");
}
