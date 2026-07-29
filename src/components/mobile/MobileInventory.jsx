import React, { useState, useEffect } from 'react';
import { Package, Search, PlusCircle, AlertTriangle, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import { formatRupees } from '../../utils/currency';
import { getProducts, saveProduct, deleteProduct } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';

export default function MobileInventory({ initialFilter = 'all' }) {
  const { userRole } = useAuth();
  const { toast, confirm } = useAlert();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState(initialFilter || 'all');
  const [loading, setLoading] = useState(true);

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Wires & Cables');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [minStockAlert, setMinStockAlert] = useState('10');
  const [unit, setUnit] = useState('Pcs');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProducts();
    const handleUpdate = () => loadProducts();
    window.addEventListener('volt_db_updated', handleUpdate);
    return () => window.removeEventListener('volt_db_updated', handleUpdate);
  }, []);

  async function loadProducts() {
    setLoading(true);
    const data = await getProducts();
    setProducts(data || []);
    setLoading(false);
  }

  const handleOpenAddModal = () => {
    setEditProduct(null);
    setName('');
    setBrand('');
    setCategory('Wires & Cables');
    setSellingPrice('');
    setCostPrice('');
    setCurrentStock('');
    setMinStockAlert('10');
    setUnit('Pcs');
    setShowModal(true);
  };

  const handleOpenEditModal = (p) => {
    setEditProduct(p);
    setName(p.name || '');
    setBrand(p.brand || '');
    setCategory(p.category || 'Wires & Cables');
    setSellingPrice(p.sellingPrice ? String(p.sellingPrice) : '');
    setCostPrice(p.costPrice ? String(p.costPrice) : '');
    setCurrentStock(p.currentStock !== undefined ? String(p.currentStock) : '');
    setMinStockAlert(p.minStockAlert ? String(p.minStockAlert) : '10');
    setUnit(p.unit || 'Pcs');
    setShowModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Product Name is required', 'Validation Error');
      return;
    }
    setIsSaving(true);
    try {
      const prodData = {
        id: editProduct ? editProduct.id : `prod_${Date.now()}`,
        name: name.trim(),
        brand: brand.trim() || 'Generic',
        category,
        sellingPrice: Number(sellingPrice) || 0,
        costPrice: Number(costPrice) || 0,
        currentStock: Number(currentStock) || 0,
        minStockAlert: Number(minStockAlert) || 10,
        unit: unit || 'Pcs',
        updatedAt: new Date().toISOString()
      };
      await saveProduct(prodData);
      toast.success(editProduct ? 'Product updated!' : 'Product added!', 'Inventory Updated');
      setShowModal(false);
      loadProducts();
    } catch (err) {
      toast.error(err.message, 'Save Failed');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.brand.toLowerCase().includes(search.toLowerCase()) ||
                          p.category.toLowerCase().includes(search.toLowerCase());
    if (filterCategory === 'low-stock') {
      return matchesSearch && (p.currentStock || 0) <= (p.minStockAlert || 10);
    }
    if (filterCategory !== 'all') {
      return matchesSearch && p.category === filterCategory;
    }
    return matchesSearch;
  });

  return (
    <div className="p-4 space-y-4 font-sans max-w-md mx-auto selection:bg-teal-500 selection:text-white">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#F3F4F6] font-sans flex items-center gap-2">
            <Package className="w-6 h-6 text-[#14B8A6]" /> Inventory Master
          </h2>
          <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">
            {filteredProducts.length} Items Listed
          </p>
        </div>

        {userRole === 'admin' && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-3 py-2 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1 min-h-[40px]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        )}
      </div>

      {/* Clean Single Mobile Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items by name, brand..."
          className="w-full pl-11 pr-4 py-3 bg-[#1F2937] border border-[#374151] rounded-2xl text-sm text-[#F3F4F6] placeholder-[#9CA3AF] focus:outline-none focus:border-[#14B8A6] shadow-sm"
        />
      </div>

      {/* Product List Stacked Mobile Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#9CA3AF] font-mono">Loading inventory...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center bg-[#1E293B] border border-[#374151] rounded-2xl text-xs text-[#9CA3AF] font-mono">
            No products found in inventory.
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isLowStock = (p.currentStock || 0) <= (p.minStockAlert || 10);
            const isOutOfStock = (p.currentStock || 0) <= 0;

            return (
              <div 
                key={p.id}
                className="bg-[#1E293B] border border-[#374151] rounded-2xl p-4 shadow-sm space-y-3"
              >
                {/* Header: Name & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-sm text-[#F3F4F6] leading-snug">
                      {p.name}
                    </h3>
                    <div className="text-xs font-mono text-[#9CA3AF]">
                      Brand: <span className="text-[#14B8A6] font-bold">{p.brand}</span> • {p.category}
                    </div>
                  </div>

                  {isOutOfStock ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded shrink-0">
                      🔴 Out of Stock
                    </span>
                  ) : isLowStock ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded shrink-0">
                      🟡 Low Stock
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded shrink-0">
                      🟢 In Stock
                    </span>
                  )}
                </div>

                {/* Info Bar: Available & Price */}
                <div className="grid grid-cols-2 gap-2 bg-[#1F2937] p-2.5 rounded-xl text-xs font-mono">
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px]">AVAILABLE STOCK</span>
                    <strong className={`text-sm font-bold ${isLowStock ? 'text-amber-300' : 'text-emerald-400'}`}>
                      {p.currentStock || 0} {p.unit || 'Pcs'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px]">SELLING PRICE</span>
                    <strong className="text-sm font-bold text-[#F3F4F6]">
                      {formatRupees(p.sellingPrice || 0)}
                    </strong>
                  </div>
                </div>

                {/* Actions Grid (Min 48px Touch Buttons) */}
                {userRole === 'admin' && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(p)}
                      className="w-full min-h-[48px] bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center justify-center space-x-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>EDIT / RESTOCK ITEM</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-[#374151] rounded-2xl w-full max-w-sm p-4 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-extrabold text-base text-[#F3F4F6]">
              {editProduct ? 'Edit Product Details' : 'Add New Product'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#9CA3AF] font-mono mb-1">Product Name*</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-3 bg-[#1F2937] border border-[#374151] rounded-xl text-sm text-[#F3F4F6]"
                  placeholder="e.g. Havells 2.5sqmm Wire"
                />
              </div>

              <div>
                <label className="block text-[#9CA3AF] font-mono mb-1">Brand Name</label>
                <input
                  type="text"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  className="w-full p-3 bg-[#1F2937] border border-[#374151] rounded-xl text-sm text-[#F3F4F6]"
                  placeholder="e.g. Havells / Polycab"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#9CA3AF] font-mono mb-1">Selling Price (₹)*</label>
                  <input
                    type="number"
                    required
                    value={sellingPrice}
                    onChange={e => setSellingPrice(e.target.value)}
                    className="w-full p-3 bg-[#1F2937] border border-[#374151] rounded-xl text-sm text-[#F3F4F6]"
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] font-mono mb-1">Current Stock*</label>
                  <input
                    type="number"
                    required
                    value={currentStock}
                    onChange={e => setCurrentStock(e.target.value)}
                    className="w-full p-3 bg-[#1F2937] border border-[#374151] rounded-xl text-sm text-[#F3F4F6]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-3 min-h-[44px] bg-[#273549] text-[#9CA3AF] font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-3 min-h-[44px] bg-[#14B8A6] text-white font-extrabold rounded-xl"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
