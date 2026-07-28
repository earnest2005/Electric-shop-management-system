import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Package, Plus, Search, Edit3, Trash2, Barcode, AlertTriangle, CheckCircle2, 
  Tag, RefreshCw, X, Save, Loader2, Download, Upload, ShieldAlert, Filter, Power
} from 'lucide-react';
import { formatRupees, rupeesToPaise, paiseToRupees, formatNumberIN } from '../utils/currency';
import { getProducts, saveProduct, deleteProduct } from '../services/db';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { exportInventoryCSV } from '../utils/exporter';

export default function InventoryMaster({ initialFilter = 'all' }) {
  const { userRole } = useAuth();
  const { toast } = useAlert();
  const isAdmin = userRole === 'admin';

  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState(initialFilter || 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialFilter) {
      setStockStatusFilter(initialFilter);
      setCurrentPage(1);
    }
  }, [initialFilter]);

  // Edit / Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState('Wires & Cables');
  const [formBrand, setFormBrand] = useState('Havells');
  const [formUnit, setFormUnit] = useState('Piece');
  const [formPurchasePriceRupees, setFormPurchasePriceRupees] = useState('');
  const [formSellingPriceRupees, setFormSellingPriceRupees] = useState('');
  const [formGstPercent, setFormGstPercent] = useState('18');
  const [formStock, setFormStock] = useState('50');
  const [formMinAlert, setFormMinAlert] = useState('10');
  const [formDescription, setFormDescription] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);

  // Quick Restock State
  const [restockModalProduct, setRestockModalProduct] = useState(null);
  const [quickRestockQty, setQuickRestockQty] = useState('50');

  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(data || []);
  };

  useEffect(() => {
    loadProducts();
    window.addEventListener('volt_db_updated', loadProducts);
    return () => window.removeEventListener('volt_db_updated', loadProducts);
  }, []);

  const categories = [
    'All', 
    'Wires & Cables', 
    'Switches & Sockets', 
    'Switchgear & MCBs', 
    'Fans & Appliances', 
    'Lighting', 
    'Conduits & Fittings', 
    'Tools & Accessories'
  ];

  const uniqueBrands = useMemo(() => {
    const brands = new Set(products.map(p => p.brand).filter(Boolean));
    return ['All', ...Array.from(brands)];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p) return false;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        (p.productName || '').toLowerCase().includes(q) ||
        (p.productCode || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q);

      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchBrand = selectedBrand === 'All' || p.brand === selectedBrand;

      const stock = Number(p.currentStock || 0);
      const minStock = Number(p.minStockAlert || 10);

      let matchStatus = true;
      if (stockStatusFilter === 'in-stock') {
        matchStatus = stock > minStock;
      } else if (stockStatusFilter === 'low-stock') {
        matchStatus = stock <= minStock;
      } else if (stockStatusFilter === 'out-of-stock') {
        matchStatus = stock === 0;
      }

      return matchSearch && matchCategory && matchBrand && matchStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand, stockStatusFilter]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedBrand, stockStatusFilter]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // CSV Handlers (Admin Only)
  const handleCSVExport = () => {
    if (!isAdmin) {
      toast.error("Permission Denied: Staff members cannot export inventory.", "Export Blocked");
      return;
    }
    if (products.length === 0) {
      toast.warning("No products available to export.", "Empty Catalog");
      return;
    }
    exportInventoryCSV(products);
    toast.success("Exported inventory catalog CSV!", "Export Downloaded");
  };

  const handleCSVImport = (e) => {
    if (!isAdmin) {
      toast.error("Permission Denied: Staff members cannot import inventory.", "Import Blocked");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1) return;

        let addedCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 2) {
            const barcode = cols[0] || `890${Math.floor(100000000 + Math.random() * 900000000)}`;
            const productName = cols[1];
            const brand = cols[2] || 'General';
            const category = cols[3] || 'Wires & Cables';
            const price = parseFloat(cols[4]) || 100;
            const stock = parseInt(cols[5], 10) || 50;
            const productCode = `PRD-${1000 + products.length + i}`;

            await saveProduct({
              barcode,
              productCode,
              productName,
              brand,
              category,
              unit: 'Piece',
              costPrice: rupeesToPaise((price * 0.8).toString()),
              basePrice: rupeesToPaise(price.toString()),
              currentStock: stock,
              minStockAlert: 10,
              taxPercent: 18,
              enabled: true
            });
            addedCount++;
          }
        }
        toast.success(`Successfully imported ${addedCount} products from CSV!`, "Import Successful");
        loadProducts();
      } catch (err) {
        toast.error("Failed to parse CSV file", "Import Error");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    if (!isAdmin) {
      toast.error("Permission Denied: Staff members cannot add products.", "Access Restricted");
      return;
    }
    setEditingProduct(null);
    const nextCodeNum = 1001 + products.length;
    setFormCode(`PRD-${nextCodeNum}`);
    setFormBarcode(`890${Math.floor(100000000 + Math.random() * 900000000)}`);
    setFormName('');
    setFormCategory('Wires & Cables');
    setFormBrand('Havells');
    setFormUnit('Piece');
    setFormPurchasePriceRupees('');
    setFormSellingPriceRupees('');
    setFormGstPercent('18');
    setFormStock('50');
    setFormMinAlert('10');
    setFormDescription('');
    setFormEnabled(true);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (prod) => {
    if (!isAdmin) {
      toast.error("Permission Denied: Staff members cannot edit product details.", "Access Restricted");
      return;
    }
    setEditingProduct(prod);
    setFormCode(prod.productCode || `PRD-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormBarcode(prod.barcode || '');
    setFormName(prod.productName || '');
    setFormCategory(prod.category || 'Wires & Cables');
    setFormBrand(prod.brand || 'Havells');
    setFormUnit(prod.unit || 'Piece');
    setFormPurchasePriceRupees(prod.costPrice ? paiseToRupees(prod.costPrice) : '');
    setFormSellingPriceRupees(paiseToRupees(prod.basePrice || 0));
    setFormGstPercent((prod.taxPercent || 18).toString());
    setFormStock((prod.currentStock || 0).toString());
    setFormMinAlert((prod.minStockAlert || 10).toString());
    setFormDescription(prod.description || '');
    setFormEnabled(prod.enabled !== false);
    setModalOpen(true);
  };

  // Save Product (Add / Edit)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Permission Denied: Only Admin users can modify products.", "Unauthorized");
      return;
    }

    if (!formName.trim() || !formCode.trim() || !formSellingPriceRupees) {
      toast.error("Please fill in Product Name, Product Code, and Selling Price.", "Validation Error");
      return;
    }

    setIsSubmitting(true);
    try {
      const basePricePaise = rupeesToPaise(formSellingPriceRupees);
      const costPricePaise = formPurchasePriceRupees ? rupeesToPaise(formPurchasePriceRupees) : Math.round(basePricePaise * 0.8);

      const barcodeFinal = formBarcode.trim() || `890${Math.floor(100000000 + Math.random() * 900000000)}`;

      await saveProduct({
        barcode: barcodeFinal,
        productCode: formCode.trim(),
        productName: formName.trim(),
        brand: formBrand.trim() || 'General',
        category: formCategory,
        unit: formUnit,
        costPrice: costPricePaise,
        basePrice: basePricePaise,
        taxPercent: Number(formGstPercent) || 18,
        currentStock: Number(formStock) || 0,
        minStockAlert: Number(formMinAlert) || 10,
        description: formDescription.trim(),
        enabled: formEnabled
      });

      toast.success(`Product ${formName.trim()} saved successfully!`, "Inventory Updated");
      setModalOpen(false);
      await loadProducts();
    } catch (err) {
      console.error("Save product error:", err);
      toast.error("Error saving product: " + err.message, "Save Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = async () => {
    if (!isAdmin) {
      toast.error("Permission Denied: Staff members cannot delete products.", "Unauthorized");
      return;
    }

    if (!deleteConfirmProduct) return;
    setIsDeleting(true);
    try {
      const idToDelete = deleteConfirmProduct.barcode || deleteConfirmProduct.id;
      await deleteProduct(idToDelete);
      toast.success(`Deleted product ${deleteConfirmProduct.productName}`, "Product Removed");
      setDeleteConfirmProduct(null);
      await loadProducts();
    } catch (err) {
      toast.error("Failed to delete product: " + err.message, "Delete Failed");
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick Restock Handler
  const handleQuickRestockSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Permission Denied: Staff members cannot restock products.", "Unauthorized");
      return;
    }

    if (!restockModalProduct) return;
    const addQty = parseInt(quickRestockQty, 10);
    if (isNaN(addQty) || addQty <= 0) {
      toast.error("Enter a valid positive restock quantity.", "Invalid Quantity");
      return;
    }

    try {
      const newStock = (restockModalProduct.currentStock || 0) + addQty;
      await saveProduct({
        ...restockModalProduct,
        currentStock: newStock
      });

      toast.success(`Restocked ${restockModalProduct.productName} by +${addQty} units (New total: ${newStock})`, "Restocked Successfully");
      setRestockModalProduct(null);
      setQuickRestockQty('50');
      await loadProducts();
    } catch (err) {
      toast.error("Failed to update stock", "Restock Error");
    }
  };

  // Stock Status Helper
  const getStockStatus = (stock, minAlert) => {
    const s = Number(stock || 0);
    const m = Number(minAlert || 10);

    if (s === 0) {
      return {
        label: 'Out of Stock',
        badgeClass: 'bg-red-950/80 text-red-400 border border-red-500/60 font-black animate-pulse',
        dotClass: 'bg-red-500'
      };
    }
    if (s < m) {
      return {
        label: 'Low Stock',
        badgeClass: 'bg-red-500/10 text-red-400 border border-red-500/30 font-bold',
        dotClass: 'bg-red-400'
      };
    }
    if (s === m) {
      return {
        label: 'Min Reached',
        badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold',
        dotClass: 'bg-amber-400'
      };
    }
    return {
      label: 'In Stock',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold',
      dotClass: 'bg-emerald-400'
    };
  };

  const lowStockCount = products.filter(p => (p.currentStock || 0) <= (p.minStockAlert || 10)).length;
  const outOfStockCount = products.filter(p => (p.currentStock || 0) === 0).length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans selection:bg-teal-500 selection:text-white">
      
      {/* 1. TOP HEADER & ROLE BADGE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-extrabold text-[#F3F4F6] text-2xl font-sans flex items-center gap-2">
              <Package className="w-7 h-7 text-teal-400" /> Inventory Master Catalog
            </h2>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
              isAdmin 
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' 
                : 'bg-teal-500/10 text-teal-300 border-teal-500/30'
            }`}>
              {isAdmin ? '👑 Admin Full Access' : '👤 Staff Read-Only'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {isAdmin 
              ? 'Complete control over catalog products, selling prices, stock levels, GST tax rates, and CSV import/export' 
              : 'Read-only search and stock lookup portal for counter staff'}
          </p>
        </div>

        {/* Action Controls (Admin Only vs Staff Disabled) */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {isAdmin ? (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCSVImport}
                accept=".csv"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-1.5 px-3 py-2 bg-[#273549] hover:bg-[#1F2937] text-[#F3F4F6] border border-[#374151] font-semibold text-xs rounded-xl transition shadow-sm"
                title="Import Products from CSV File"
              >
                <Upload className="w-3.5 h-3.5 text-teal-400" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={handleCSVExport}
                className="flex items-center space-x-1.5 px-3 py-2 bg-[#273549] hover:bg-[#1F2937] text-[#F3F4F6] border border-[#374151] font-semibold text-xs rounded-xl transition shadow-sm"
                title="Export Catalog to CSV File"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleOpenAdd}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition border border-teal-400/30"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>ADD NEW PRODUCT</span>
              </button>
            </>
          ) : (
            <div className="px-3.5 py-2 bg-[#1F2937] border border-[#374151] rounded-xl text-xs font-mono text-slate-400 flex items-center gap-1.5 font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Editing & Restocking Restricted to Admin</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. KPI SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#1F2937] p-4 rounded-2xl border border-[#374151] shadow-sm">
          <div className="text-xs text-slate-400 font-mono font-semibold">TOTAL CATALOG PRODUCTS</div>
          <div className="text-2xl font-black text-[#F3F4F6] font-mono mt-1">{products.length}</div>
        </div>

        <div className={`bg-[#1F2937] p-4 rounded-2xl border ${
          lowStockCount > 0 ? 'border-amber-500/40 bg-amber-500/10' : 'border-[#374151]'
        } shadow-sm`}>
          <div className="flex justify-between items-start text-xs text-slate-400 font-mono font-semibold">
            <span>LOW STOCK ALERTS</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">{lowStockCount}</div>
        </div>

        <div className={`bg-[#1F2937] p-4 rounded-2xl border ${
          outOfStockCount > 0 ? 'border-red-500/50 bg-red-500/10' : 'border-[#374151]'
        } shadow-sm`}>
          <div className="flex justify-between items-start text-xs text-slate-400 font-mono font-semibold">
            <span>OUT OF STOCK</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 font-mono mt-1">{outOfStockCount}</div>
        </div>

        <div className="bg-[#1F2937] p-4 rounded-2xl border border-[#374151] shadow-sm">
          <div className="text-xs text-slate-400 font-mono font-semibold">ACTIVE CATEGORIES</div>
          <div className="text-2xl font-black text-teal-400 font-mono mt-1">
            {new Set(products.map(p => p.category)).size}
          </div>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH CONTROLS BAR */}
      <div className="bg-[#1F2937] p-4 rounded-2xl space-y-3 border border-[#374151] shadow-sm">
        
        {/* Row 1: Stock Status Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#374151] pb-3">
          <div className="flex items-center space-x-1.5 font-mono text-xs text-slate-400 font-bold">
            <Filter className="w-4 h-4 text-teal-400" />
            <span>Stock Status:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Products' },
              { id: 'in-stock', label: 'In Stock' },
              { id: 'low-stock', label: `Low Stock (${lowStockCount})` },
              { id: 'out-of-stock', label: `Out of Stock (${outOfStockCount})` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStockStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition ${
                  stockStatusFilter === f.id
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-[#111827] text-slate-400 hover:text-white border border-[#374151]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Category & Brand Dropdowns + Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Category Selector */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Filter by Category</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 text-xs font-mono text-[#F3F4F6] focus:border-teal-400 focus:outline-none"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Brand Selector */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Filter by Brand</label>
            <select
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
              className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 text-xs font-mono text-[#F3F4F6] focus:border-teal-400 focus:outline-none"
            >
              {uniqueBrands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Search Products</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search name, code, barcode, brand..."
                className="w-full bg-[#111827] border border-[#374151] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-[#F3F4F6] focus:border-teal-400 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>

      </div>

      {/* 4. PRODUCTS TABLE (DESKTOP) & MOBILE TOUCH CARDS */}
      <div className="bg-[#1F2937] rounded-2xl border border-[#374151] shadow-sm overflow-hidden">
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-[#111827] text-slate-400 uppercase tracking-wider text-[10px] border-b border-[#374151]">
              <tr>
                <th className="px-4 py-3">Product Code</th>
                <th className="px-4 py-3">Barcode</th>
                <th className="px-4 py-3">Product Name & Unit</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3 text-right">Selling Price</th>
                <th className="px-4 py-3 text-center">Current Stock</th>
                <th className="px-4 py-3 text-center">Min Stock</th>
                <th className="px-4 py-3 text-center">Stock Status</th>
                <th className="px-4 py-3 text-center">Last Updated</th>
                {isAdmin && <th className="px-4 py-3 text-right">Admin Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151] text-[#F3F4F6]">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 11 : 10} className="px-6 py-10 text-center text-slate-400 font-mono">
                    No matching electrical products found in inventory.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map(prod => {
                  const status = getStockStatus(prod.currentStock, prod.minStockAlert);
                  const isProdEnabled = prod.enabled !== false;

                  return (
                    <tr 
                      key={prod.barcode || prod.id} 
                      className={`hover:bg-[#273549]/60 transition ${!isProdEnabled ? 'opacity-60 bg-red-950/10' : ''}`}
                    >
                      {/* Product Code */}
                      <td className="px-4 py-3 font-bold text-teal-300 whitespace-nowrap">
                        {prod.productCode || `PRD-${(prod.barcode || '1000').slice(-4)}`}
                      </td>

                      {/* Barcode */}
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Barcode className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span>{prod.barcode}</span>
                        </div>
                      </td>

                      {/* Product Name & Description */}
                      <td className="px-4 py-3 font-sans">
                        <div className="font-bold text-[#F3F4F6] text-xs flex items-center gap-1.5">
                          <span>{prod.productName}</span>
                          {!isProdEnabled && (
                            <span className="text-[9px] bg-red-500/20 text-red-300 px-1 py-0.2 rounded font-mono">
                              DISABLED
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                          <span className="bg-teal-500/10 text-teal-300 px-1.5 py-0.2 rounded border border-teal-500/20 font-bold">
                            {prod.unit || 'Piece'}
                          </span>
                          {prod.description && <span className="truncate max-w-[150px]">{prod.description}</span>}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {prod.category}
                      </td>

                      {/* Brand */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="bg-[#111827] px-2 py-0.5 rounded text-teal-300 font-bold border border-[#374151]">
                          {prod.brand || 'General'}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td className="px-4 py-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                        {formatRupees(prod.basePrice || 0)}
                      </td>

                      {/* Current Stock */}
                      <td className="px-4 py-3 text-center font-black text-sm whitespace-nowrap">
                        {prod.currentStock || 0}
                      </td>

                      {/* Minimum Stock */}
                      <td className="px-4 py-3 text-center text-slate-400 whitespace-nowrap">
                        {prod.minStockAlert || 10}
                      </td>

                      {/* Stock Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 ${status.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                          <span>{status.label}</span>
                        </span>
                      </td>

                      {/* Last Updated */}
                      <td className="px-4 py-3 text-center text-slate-400 text-[10px] whitespace-nowrap">
                        {prod.updatedAt ? new Date(prod.updatedAt).toLocaleDateString('en-IN') : 'Active'}
                      </td>

                      {/* Admin Actions */}
                      {isAdmin && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            {/* Restock Button */}
                            <button
                              onClick={() => {
                                setRestockModalProduct(prod);
                                setQuickRestockQty('50');
                              }}
                              className="px-2 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded text-[10px] font-bold transition flex items-center gap-1"
                              title="Restock Item"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Restock</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEdit(prod)}
                              className="p-1 bg-[#111827] hover:bg-[#374151] text-teal-400 rounded-lg border border-[#374151] transition"
                              title="Edit Product"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setDeleteConfirmProduct(prod)}
                              className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Touch Cards View */}
        <div className="md:hidden p-3 space-y-3">
          {paginatedProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-mono text-xs">
              No matching electrical products found.
            </div>
          ) : (
            paginatedProducts.map(prod => {
              const status = getStockStatus(prod.currentStock, prod.minStockAlert);
              const isProdEnabled = prod.enabled !== false;

              return (
                <div 
                  key={prod.barcode || prod.id} 
                  className={`bg-[#111827] border border-[#374151] rounded-xl p-3.5 space-y-2.5 font-mono ${
                    !isProdEnabled ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded text-teal-300 font-bold">
                          {prod.productCode || `PRD-${(prod.barcode || '1000').slice(-4)}`}
                        </span>
                        <span className="text-[10px] bg-[#1F2937] border border-[#374151] px-2 py-0.5 rounded text-slate-300">
                          {prod.brand || 'General'}
                        </span>
                      </div>
                      <h4 className="font-bold text-[#F3F4F6] text-sm font-sans mt-1">{prod.productName}</h4>
                      <p className="text-[11px] text-slate-400">{prod.category} • {prod.unit || 'Piece'}</p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.badgeClass}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#374151] text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">Barcode</div>
                      <div className="text-teal-300 font-bold">{prod.barcode}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">Selling Price</div>
                      <div className="font-black text-emerald-400 text-sm">{formatRupees(prod.basePrice || 0)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400">Stock: <strong className="text-[#F3F4F6]">{prod.currentStock || 0}</strong> / {prod.minStockAlert || 10}</span>
                    
                    {isAdmin && (
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => {
                            setRestockModalProduct(prod);
                            setQuickRestockQty('50');
                          }}
                          className="px-2 py-1 bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded text-[10px] font-bold"
                        >
                          Restock
                        </button>
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1.5 bg-[#1F2937] text-teal-400 rounded-lg border border-[#374151]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmProduct(prod)}
                          className="p-1.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls Bar */}
        {filteredProducts.length > 0 && (
          <div className="bg-[#111827] px-4 py-3 border-t border-[#374151] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
            <div className="flex items-center space-x-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#1F2937] border border-[#374151] rounded-lg px-2 py-1 text-slate-200 font-bold focus:outline-none"
              >
                {[10, 25, 50, 100].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="text-slate-500">
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredProducts.length)} to {Math.min(currentPage * pageSize, filteredProducts.length)} of {filteredProducts.length} items
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-[#1F2937] hover:bg-[#374151] disabled:opacity-40 text-slate-200 border border-[#374151] font-bold transition"
              >
                Previous
              </button>

              <span className="px-3 py-1 bg-[#1F2937] border border-[#374151] rounded-lg text-teal-300 font-bold">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 rounded-lg bg-[#1F2937] hover:bg-[#374151] disabled:opacity-40 text-slate-200 border border-[#374151] font-bold transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. ADD / EDIT PRODUCT MODAL (ADMIN ONLY) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1F2937] border border-[#374151] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0">
            <div className="p-4 border-b border-[#374151] bg-[#111827] flex items-center justify-between">
              <h3 className="font-extrabold text-[#F3F4F6] text-base font-sans flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-400" />
                <span>{editingProduct ? 'Edit Electrical Product Details' : 'Add New Product to Inventory Master'}</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-3.5 text-xs font-mono max-h-[500px] overflow-y-auto">
              
              {/* Product Code & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Product Code (Unique)*</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 font-bold text-teal-300 focus:border-teal-400 focus:outline-none"
                    placeholder="PRD-1001"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Barcode (Optional)</label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={e => setFormBarcode(e.target.value)}
                    className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 text-slate-300 focus:border-teal-400 focus:outline-none"
                    placeholder="8901234..."
                  />
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-slate-400 mb-1">Product Name & Specifications*</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 font-sans font-bold text-[#F3F4F6] text-sm focus:border-teal-400 focus:outline-none"
                  placeholder="e.g. Havells 1.5 sqmm Wire Red (90m Roll)"
                />
              </div>

              {/* Category, Brand, Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Category*</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 text-[#F3F4F6] focus:border-teal-400 focus:outline-none"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Brand Name*</label>
                  <input
                    type="text"
                    required
                    value={formBrand}
                    onChange={e => setFormBrand(e.target.value)}
                    className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 text-[#F3F4F6] focus:border-teal-400 focus:outline-none"
                    placeholder="Havells, Anchor..."
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Selling Unit*</label>
                  <select
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 text-[#F3F4F6] focus:border-teal-400 focus:outline-none"
                  >
                    {['Piece', 'Meter', 'Roll', 'Box', 'Set', 'Packet'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Purchase Price, Selling Price, GST % */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Purchase Price (₹ Cost)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPurchasePriceRupees}
                    onChange={e => setFormPurchasePriceRupees(e.target.value)}
                    className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 text-slate-300 focus:border-teal-400 focus:outline-none"
                    placeholder="e.g. 1200.00"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Selling Price (₹ Retail)*</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formSellingPriceRupees}
                    onChange={e => setFormSellingPriceRupees(e.target.value)}
                    className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 font-bold text-emerald-400 text-sm focus:border-teal-400 focus:outline-none"
                    placeholder="e.g. 1650.00"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">GST Tax Rate %*</label>
                  <select
                    value={formGstPercent}
                    onChange={e => setFormGstPercent(e.target.value)}
                    className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 text-blue-400 font-bold focus:border-teal-400 focus:outline-none"
                  >
                    {[18, 12, 5, 28, 0].map(g => (
                      <option key={g} value={g}>{g}% GST</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Current Stock & Min Stock Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Current Stock Quantity*</label>
                  <input
                    type="number"
                    required
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 font-bold text-[#F3F4F6] text-sm focus:border-teal-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Minimum Stock Alert Threshold*</label>
                  <input
                    type="number"
                    required
                    value={formMinAlert}
                    onChange={e => setFormMinAlert(e.target.value)}
                    className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 font-bold text-amber-400 focus:border-teal-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description & Status Toggle */}
              <div>
                <label className="block text-slate-400 mb-1">Product Description / Notes</label>
                <textarea
                  rows="2"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 text-slate-300 font-sans text-xs focus:border-teal-400 focus:outline-none"
                  placeholder="Optional item notes or technical specifications..."
                />
              </div>

              <div className="flex items-center justify-between bg-[#111827] p-3 rounded-xl border border-[#374151]">
                <div>
                  <div className="font-bold text-[#F3F4F6] text-xs font-sans">Product Status</div>
                  <div className="text-[10px] text-slate-400">Enable or disable product for POS billing search</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormEnabled(!formEnabled)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                    formEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{formEnabled ? 'ACTIVE / ENABLED' : 'DISABLED'}</span>
                </button>
              </div>

              {/* Buttons */}
              <div className="pt-3 flex justify-end space-x-2 border-t border-[#374151]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#111827] text-slate-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 disabled:opacity-50 text-white font-extrabold flex items-center space-x-1.5 shadow-md transition"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Product...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Product to Catalog</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL (ADMIN ONLY) */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1F2937] border border-red-500/40 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#F3F4F6] text-base font-sans">Delete Product Confirmation</h3>
                <p className="text-xs text-slate-400 font-mono">This action cannot be undone</p>
              </div>
            </div>

            <div className="p-3 bg-[#111827] rounded-xl border border-[#374151] text-xs font-mono space-y-1">
              <div className="font-bold text-[#F3F4F6] font-sans">{deleteConfirmProduct.productName}</div>
              <div className="text-teal-300">Code: {deleteConfirmProduct.productCode || deleteConfirmProduct.barcode}</div>
              <div className="text-slate-400">Category: {deleteConfirmProduct.category}</div>
            </div>

            <p className="text-xs text-slate-300 font-sans">
              Are you sure you want to permanently delete this product from the inventory master catalog?
            </p>

            <div className="flex justify-end space-x-2 font-mono text-xs">
              <button
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2 bg-[#111827] hover:bg-[#374151] text-slate-300 font-bold rounded-xl border border-[#374151]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg flex items-center space-x-1.5"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. QUICK RESTOCK MODAL (ADMIN ONLY) */}
      {restockModalProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1F2937] border border-[#374151] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#374151] pb-3">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-[#F3F4F6] text-base font-sans">Quick Restock Stock Units</h3>
              </div>
              <button onClick={() => setRestockModalProduct(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#111827] rounded-xl border border-[#374151] text-xs font-mono space-y-1">
              <div className="font-bold text-[#F3F4F6] font-sans">{restockModalProduct.productName}</div>
              <div className="flex justify-between text-slate-400">
                <span>Current Stock: <strong className="text-teal-300">{restockModalProduct.currentStock || 0}</strong></span>
                <span>Min Alert: <strong className="text-amber-400">{restockModalProduct.minStockAlert || 10}</strong></span>
              </div>
            </div>

            <form onSubmit={handleQuickRestockSubmit} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Add Stock Quantity (+Units)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quickRestockQty}
                  onChange={e => setQuickRestockQty(e.target.value)}
                  className="w-full bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 font-bold text-teal-300 text-sm focus:border-teal-400 focus:outline-none"
                  placeholder="50"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalProduct(null)}
                  className="px-4 py-2 bg-[#111827] hover:bg-[#374151] text-slate-300 font-bold rounded-xl border border-[#374151]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-extrabold rounded-xl shadow-md flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Update Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
