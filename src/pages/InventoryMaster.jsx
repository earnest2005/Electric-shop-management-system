import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit3, Barcode, AlertTriangle, CheckCircle, Tag, RefreshCw, X, Save, Loader2 } from 'lucide-react';
import { formatRupees, rupeesToPaise, paiseToRupees } from '../utils/currency';
import { getProducts, saveProduct } from '../services/db';

export default function InventoryMaster() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Edit/Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('Havells');
  const [formCategory, setFormCategory] = useState('Wires & Cables');
  const [formPriceRupees, setFormPriceRupees] = useState('');
  const [formStock, setFormStock] = useState('50');
  const [formMinAlert, setFormMinAlert] = useState('10');

  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  useEffect(() => {
    loadProducts();
    window.addEventListener('volt_db_updated', loadProducts);
    return () => window.removeEventListener('volt_db_updated', loadProducts);
  }, []);

  // Filter products
  const categories = ['All', 'Wires & Cables', 'Switches & Sockets', 'Switchgear & MCBs', 'Fans & Appliances', 'Lighting', 'Conduits & Fittings', 'Tools & Accessories'];

  const filteredProducts = products.filter(p => {
    if (!p) return false;
    const matchSearch = 
      (p.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode || '').includes(searchQuery);

    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchLowStock = !lowStockOnly || (p.currentStock || 0) <= (p.minStockAlert || 10);

    return matchSearch && matchCat && matchLowStock;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    const randomBarcode = `890${Math.floor(100000000 + Math.random() * 900000000)}`;
    setFormBarcode(randomBarcode);
    setFormName('');
    setFormBrand('Havells');
    setFormCategory('Wires & Cables');
    setFormPriceRupees('');
    setFormStock('50');
    setFormMinAlert('10');
    setModalOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormBarcode(prod.barcode);
    setFormName(prod.productName);
    setFormBrand(prod.brand || 'Havells');
    setFormCategory(prod.category || 'Wires & Cables');
    setFormPriceRupees(paiseToRupees(prod.basePrice || 0).toString());
    setFormStock((prod.currentStock || 0).toString());
    setFormMinAlert((prod.minStockAlert || 10).toString());
    setModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formBarcode.trim() || !formName.trim() || !formPriceRupees) {
      alert("Please fill in Barcode ID, Product Name, and Base Price.");
      return;
    }

    setIsSubmitting(true);

    try {
      const basePricePaise = rupeesToPaise(formPriceRupees);

      await saveProduct({
        barcode: formBarcode.trim(),
        productName: formName.trim(),
        brand: formBrand.trim() || 'General',
        category: formCategory,
        basePrice: basePricePaise,
        currentStock: Number(formStock) || 0,
        minStockAlert: Number(formMinAlert) || 10,
        taxPercent: 18
      });

      setModalOpen(false);
      await loadProducts();
    } catch (err) {
      console.error("Failed to save product:", err);
      alert("Error saving item: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const lowStockCount = products.filter(p => (p.currentStock || 0) <= (p.minStockAlert || 10)).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-white text-2xl font-sans flex items-center gap-2">
            <Package className="w-7 h-7 text-amber-400" /> Inventory Master Collection
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Manage product catalog, barcode assignments, base prices in integer Paise, and stock thresholds
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg transition self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Electrical Item</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Total Catalog Items</div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">{products.length}</div>
        </div>

        <div className={`glass-panel p-4 rounded-2xl ${lowStockCount > 0 ? 'border-amber-500/40 bg-amber-500/5' : ''}`}>
          <div className="flex justify-between items-start text-xs text-slate-400">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">{lowStockCount}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Active Categories</div>
          <div className="text-2xl font-extrabold text-electric-400 font-mono mt-1">
            {new Set(products.map(p => p.category)).size}
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-dark-800 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
              lowStockOnly ? 'bg-rose-500 text-white' : 'bg-dark-800 text-slate-400 border border-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Only</span>
          </button>

          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search product or barcode..."
              className="w-full glass-input pl-9 pr-3 py-2 rounded-xl text-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-800/80 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Barcode / ID</th>
                <th className="px-6 py-3.5">Product Name & Category</th>
                <th className="px-6 py-3.5">Brand</th>
                <th className="px-6 py-3.5 text-right">Base Price (Rupees)</th>
                <th className="px-6 py-3.5 text-center">Current Stock</th>
                <th className="px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500 font-mono">
                    No electrical products found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(prod => (
                  <tr key={prod.barcode || prod.id} className="hover:bg-dark-800/50 transition">
                    <td className="px-6 py-4 font-mono">
                      <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                        <Barcode className="w-4 h-4 shrink-0" />
                        <span>{prod.barcode}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm">{prod.productName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{prod.category}</div>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">{prod.brand}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-white text-sm">
                      {formatRupees(prod.basePrice || 0)}
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      <span className={`px-2.5 py-1 rounded-full font-bold ${
                        (prod.currentStock || 0) <= (prod.minStockAlert || 10)
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {prod.currentStock || 0} units
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="p-1.5 bg-dark-800 hover:bg-slate-800 text-amber-400 rounded-lg transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-dark-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                {editingProduct ? 'Edit Electrical Product' : 'Add New Product to Master Catalog'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Barcode ID*</label>
                  <input
                    type="text"
                    required
                    value={formBarcode}
                    onChange={e => setFormBarcode(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl font-mono text-amber-400 font-bold"
                    placeholder="890123400..."
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Brand Name*</label>
                  <input
                    type="text"
                    required
                    value={formBrand}
                    onChange={e => setFormBrand(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl"
                    placeholder="Havells, Anchor, Schneider..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Product Description / Title*</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl font-semibold"
                  placeholder="e.g. Havells 1.5 sqmm Wire Red (90m)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl bg-dark-900 text-white"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Base Price in ₹ (Auto-Paise)*</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPriceRupees}
                    onChange={e => setFormPriceRupees(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl font-mono text-emerald-400 font-bold"
                    placeholder="e.g. 1650.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Current Stock Units*</label>
                  <input
                    type="number"
                    required
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    value={formMinAlert}
                    onChange={e => setFormMinAlert(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Item...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save to Inventory Master</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
