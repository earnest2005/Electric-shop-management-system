import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Search, Edit3, Barcode, AlertTriangle, CheckCircle, Tag, RefreshCw, X, Save, Loader2, Download, Upload } from 'lucide-react';
import { formatRupees, rupeesToPaise, paiseToRupees } from '../utils/currency';
import { getProducts, saveProduct } from '../services/db';
import { useAlert } from '../context/AlertContext';
import { exportInventoryCSV } from '../utils/exporter';

export default function InventoryMaster() {
  const { toast } = useAlert();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleCSVExport = () => {
    if (products.length === 0) {
      toast.warning("No products available to export.", "Empty Catalog");
      return;
    }
    exportInventoryCSV(products);
    toast.success("Exported inventory catalog CSV!", "Export Downloaded");
  };

  const handleCSVImport = (e) => {
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

            await saveProduct({
              barcode,
              productName,
              brand,
              category,
              basePrice: rupeesToPaise(price.toString()),
              currentStock: stock,
              minStockAlert: 10,
              taxPercent: 18
            });
            addedCount++;
          }
        }
        toast.success(`Successfully imported ${addedCount} items from CSV!`, "Import Successful");
        loadProducts();
      } catch (err) {
        toast.error("Failed to parse CSV file", "Import Error");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filter products
  const categories = ['All', 'Wires & Cables', 'Switches & Sockets', 'Switchgear & MCBs', 'Fans & Appliances', 'Lighting', 'Conduits & Fittings', 'Tools & Accessories'];

  const filteredProducts = products.filter(p => {
    if (!p) return false;
    const matchSearch = 
      (p.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode || '').includes(searchQuery);
    
    const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchLowStock = !lowStockOnly || (p.currentStock || 0) <= (p.minStockAlert || 10);

    return matchSearch && matchCategory && matchLowStock;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormBarcode(`890${Math.floor(100000000 + Math.random() * 900000000)}`);
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
    setFormBarcode(prod.barcode || '');
    setFormName(prod.productName || '');
    setFormBrand(prod.brand || '');
    setFormCategory(prod.category || 'Wires & Cables');
    setFormPriceRupees(paiseToRupees(prod.basePrice || 0));
    setFormStock((prod.currentStock || 0).toString());
    setFormMinAlert((prod.minStockAlert || 10).toString());
    setModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formBarcode.trim() || !formName.trim() || !formPriceRupees) {
      toast.error("Please fill in Barcode ID, Product Name, and Base Price.", "Validation Error");
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

      toast.success(`Product ${formName.trim()} saved to inventory!`, "Item Saved");
      setModalOpen(false);
      await loadProducts();
    } catch (err) {
      console.error("Failed to save product:", err);
      toast.error("Error saving item: " + err.message, "Save Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const lowStockCount = products.filter(p => (p.currentStock || 0) <= (p.minStockAlert || 10)).length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans selection:bg-teal-500 selection:text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-[#F3F4F6] text-2xl font-sans flex items-center gap-2">
            <Package className="w-7 h-7 text-[#14B8A6]" /> Inventory Master Collection
          </h2>
          <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">
            Manage product catalog, barcode assignments, base prices in integer Paise, and stock thresholds
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
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
            title="Import Products from CSV"
          >
            <Upload className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleCSVExport}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#273549] hover:bg-[#1F2937] text-[#F3F4F6] border border-[#374151] font-semibold text-xs rounded-xl transition shadow-sm"
            title="Export Products Catalog to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 px-4 py-2 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#273549] p-4 rounded-2xl border border-[#374151] shadow-sm">
          <div className="text-xs text-[#9CA3AF] font-mono font-semibold">Total Catalog Items</div>
          <div className="text-2xl font-extrabold text-[#F3F4F6] font-mono mt-1">{products.length}</div>
        </div>

        <div className={`bg-[#273549] p-4 rounded-2xl border ${lowStockCount > 0 ? 'border-red-500/40 bg-red-500/10' : 'border-[#374151]'} shadow-sm`}>
          <div className="flex justify-between items-start text-xs text-[#9CA3AF] font-mono font-semibold">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-extrabold text-red-400 font-mono mt-1">{lowStockCount}</div>
        </div>

        <div className="bg-[#273549] p-4 rounded-2xl border border-[#374151] shadow-sm">
          <div className="text-xs text-[#9CA3AF] font-mono font-semibold">Active Categories</div>
          <div className="text-2xl font-extrabold text-[#14B8A6] font-mono mt-1">
            {new Set(products.map(p => p.category)).size}
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-[#273549] p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-[#374151] shadow-sm">
        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-[#14B8A6] text-white shadow-sm font-bold'
                  : 'bg-[#1F2937] text-[#9CA3AF] hover:text-[#F3F4F6] border border-[#374151]'
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
              lowStockOnly ? 'bg-red-600 text-white font-bold' : 'bg-[#1F2937] text-[#9CA3AF] border border-[#374151] hover:border-red-500/40'
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
              className="w-full glass-input pl-9 pr-3 py-2 rounded-xl text-xs border-[#374151] focus:border-[#14B8A6]"
            />
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Products Table (Desktop) & Cards (Mobile) */}
      <div className="bg-[#273549] rounded-2xl border border-[#374151] shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1F2937] text-[#9CA3AF] uppercase tracking-wider font-mono border-b border-[#374151]">
              <tr>
                <th className="px-6 py-3.5">Barcode / ID</th>
                <th className="px-6 py-3.5">Product Name & Category</th>
                <th className="px-6 py-3.5">Brand</th>
                <th className="px-6 py-3.5 text-right">Base Price (Rupees)</th>
                <th className="px-6 py-3.5 text-center">Current Stock</th>
                <th className="px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151] font-sans text-[#F3F4F6]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-[#9CA3AF] font-mono">
                    No electrical products found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(prod => (
                  <tr key={prod.barcode || prod.id} className="hover:bg-[#1F2937]/60 transition">
                    <td className="px-6 py-4 font-mono">
                      <div className="flex items-center space-x-1.5 text-[#14B8A6] font-bold">
                        <Barcode className="w-4 h-4 shrink-0" />
                        <span>{prod.barcode}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#F3F4F6] text-sm">{prod.productName}</div>
                      <div className="text-[11px] text-[#9CA3AF] font-mono mt-0.5">{prod.category}</div>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <span className="bg-teal-500/10 px-2 py-0.5 rounded text-teal-300 font-semibold border border-teal-500/20">{prod.brand}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-[#14B8A6] text-sm">
                      {formatRupees(prod.basePrice || 0)}
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      <span className={`px-2.5 py-1 rounded-full font-bold ${
                        (prod.currentStock || 0) <= (prod.minStockAlert || 10)
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {prod.currentStock || 0} units
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="p-1.5 bg-[#1F2937] hover:bg-[#374151] text-[#14B8A6] rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center mx-auto"
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

        {/* Mobile Stacked Touch Cards View */}
        <div className="md:hidden p-3 space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="py-8 text-center text-[#9CA3AF] font-mono text-xs">
              No electrical products found matching criteria.
            </div>
          ) : (
            filteredProducts.map(prod => (
              <div key={prod.barcode || prod.id} className="bg-[#1F2937] border border-[#374151] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded text-teal-300 font-mono font-bold">
                      {prod.brand}
                    </span>
                    <h4 className="font-bold text-[#F3F4F6] text-sm leading-snug mt-1">{prod.productName}</h4>
                    <p className="text-[11px] text-[#9CA3AF] font-mono">{prod.category}</p>
                  </div>
                  <button
                    onClick={() => handleOpenEdit(prod)}
                    className="p-2 bg-[#273549] hover:bg-[#374151] text-[#14B8A6] rounded-xl border border-[#374151] min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
                    title="Edit Item"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#374151] font-mono">
                  <div className="text-xs text-[#14B8A6] font-bold flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5" />
                    <span>#{prod.barcode}</span>
                  </div>
                  <div className="font-extrabold text-[#F3F4F6] text-sm">
                    {formatRupees(prod.basePrice || 0)}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#9CA3AF]">Stock Available:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                    (prod.currentStock || 0) <= (prod.minStockAlert || 10)
                      ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {prod.currentStock || 0} units
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#273549] border border-[#374151] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#374151] bg-[#1F2937] flex items-center justify-between">
              <h3 className="font-bold text-[#F3F4F6] text-base">
                {editingProduct ? 'Edit Electrical Product' : 'Add New Product to Master Catalog'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-[#9CA3AF] hover:text-[#F3F4F6]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9CA3AF] font-mono mb-1">Barcode ID*</label>
                  <input
                    type="text"
                    required
                    value={formBarcode}
                    onChange={e => setFormBarcode(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl font-mono text-teal-300 font-bold border-[#374151]"
                    placeholder="890123400..."
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] font-mono mb-1">Brand Name*</label>
                  <input
                    type="text"
                    required
                    value={formBrand}
                    onChange={e => setFormBrand(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl border-[#374151]"
                    placeholder="Havells, Anchor, Schneider..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#9CA3AF] font-mono mb-1">Product Description / Title*</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl font-semibold border-[#374151]"
                  placeholder="e.g. Havells 1.5 sqmm Wire Red (90m)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9CA3AF] font-mono mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl bg-[#1F2937] text-[#F3F4F6] border-[#374151]"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#9CA3AF] font-mono mb-1">Base Price in ₹ (Auto-Paise)*</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPriceRupees}
                    onChange={e => setFormPriceRupees(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl font-mono text-emerald-400 font-bold border-[#374151]"
                    placeholder="e.g. 1650.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9CA3AF] font-mono mb-1">Current Stock Units*</label>
                  <input
                    type="number"
                    required
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl font-mono font-bold border-[#374151]"
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] font-mono mb-1">Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    value={formMinAlert}
                    onChange={e => setFormMinAlert(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl font-mono border-[#374151]"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-[#374151]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1F2937] text-[#9CA3AF] hover:text-[#F3F4F6] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] disabled:opacity-50 text-white font-bold flex items-center space-x-1.5 shadow-sm transition"
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
