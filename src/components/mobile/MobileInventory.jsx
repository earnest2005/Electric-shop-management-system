import React, { useState, useEffect, useMemo } from 'react';
import { Package, Search, PlusCircle, Edit3, Trash2 } from 'lucide-react';
import { formatRupees } from '../../utils/currency';
import { getProducts, saveProduct, deleteProduct } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';

// Schema normalization helpers
const getProductName = (p) => p.productName || p.name || 'Unnamed Product';
const getBrand = (p) => p.brand || 'Generic';
const getCategory = (p) => p.category || 'General';
const getSellingPrice = (p) => {
  if (p.sellingPriceRupees !== undefined && p.sellingPriceRupees !== null && p.sellingPriceRupees !== '') {
    return Number(p.sellingPriceRupees);
  }
  if (p.basePrice !== undefined && p.basePrice !== null) {
    return p.basePrice > 1000 ? p.basePrice / 100 : Number(p.basePrice);
  }
  if (p.sellingPrice !== undefined && p.sellingPrice !== null) {
    return p.sellingPrice > 1000 ? p.sellingPrice / 100 : Number(p.sellingPrice);
  }
  return 0;
};
const getStock = (p) => {
  if (p.currentStock !== undefined && p.currentStock !== null) return Number(p.currentStock);
  if (p.stockQuantity !== undefined && p.stockQuantity !== null) return Number(p.stockQuantity);
  return 0;
};
const getMinStock = (p) => {
  if (p.minStockAlert !== undefined && p.minStockAlert !== null) return Number(p.minStockAlert);
  if (p.minAlert !== undefined && p.minAlert !== null) return Number(p.minAlert);
  return 10;
};
const getStockStatus = (stock, minStock) => {
  if (stock <= 0) return { label: 'Out of Stock', color: 'bg-red-500/10 text-red-400 border-red-500/30' };
  if (stock <= minStock) return { label: 'Low', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
  return { label: 'Healthy', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
};

const CATEGORIES = [
  'All',
  'Low Stock',
  'Wires & Cables',
  'Switches & Sockets',
  'Switchgear & MCBs',
  'Fans & Appliances',
  'Lighting',
  'Conduits & Fittings',
  'Tools & Accessories'
];

export default function MobileInventory({ initialFilter = 'all' }) {
  const { userRole } = useAuth();
  const { toast, confirm } = useAlert();
  const isAdmin = userRole === 'admin';

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(
    initialFilter === 'low-stock' ? 'Low Stock' : 'All'
  );
  const [loading, setLoading] = useState(true);

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Wires & Cables');
  const [sellingPrice, setSellingPrice] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [minStockAlert, setMinStockAlert] = useState('10');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProducts();
    const handleUpdate = () => loadProducts();
    window.addEventListener('volt_db_updated', handleUpdate);
    return () => window.removeEventListener('volt_db_updated', handleUpdate);
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data || []);
    } catch (err) {
      console.error("Failed to load products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAddModal = () => {
    setEditProduct(null);
    setName('');
    setBrand('');
    setCategory('Wires & Cables');
    setSellingPrice('');
    setCurrentStock('');
    setMinStockAlert('10');
    setShowModal(true);
  };

  const handleOpenEditModal = (p) => {
    setEditProduct(p);
    setName(getProductName(p));
    setBrand(getBrand(p));
    setCategory(getCategory(p));
    setSellingPrice(String(getSellingPrice(p)));
    setCurrentStock(String(getStock(p)));
    setMinStockAlert(String(getMinStock(p)));
    setShowModal(true);
  };

  const handleDeleteProduct = async (p) => {
    const prodName = getProductName(p);
    const barcodeOrId = p.barcode || p.id;
    
    confirm({
      title: "Delete Product",
      message: `Are you sure you want to permanently delete "${prodName}" from inventory?`,
      confirmText: "Delete",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await deleteProduct(barcodeOrId);
          toast.success(`Product "${prodName}" deleted successfully`, "Item Removed");
          loadProducts();
        } catch (err) {
          toast.error(err.message, "Delete Failed");
        }
      }
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Product Name is required', 'Validation Error');
      return;
    }
    setIsSaving(true);
    try {
      const barcode = editProduct ? (editProduct.barcode || editProduct.id) : `PROD-${Date.now()}`;
      const priceNum = Number(sellingPrice) || 0;

      const prodData = {
        ...(editProduct || {}),
        id: barcode,
        barcode: barcode,
        productName: name.trim(),
        name: name.trim(),
        brand: brand.trim() || 'Generic',
        category,
        sellingPriceRupees: priceNum,
        sellingPrice: priceNum,
        basePrice: priceNum * 100, // stored in paise
        currentStock: Number(currentStock) || 0,
        stockQuantity: Number(currentStock) || 0,
        minStockAlert: Number(minStockAlert) || 10,
        updatedAt: new Date().toISOString()
      };

      await saveProduct(prodData);
      toast.success(editProduct ? 'Product updated!' : 'Product added!', 'Inventory Saved');
      setShowModal(false);
      loadProducts();
    } catch (err) {
      toast.error(err.message, 'Save Failed');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter products cleanly and instantly
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p) return false;
      const nameStr = getProductName(p).toLowerCase();
      const brandStr = getBrand(p).toLowerCase();
      const catStr = getCategory(p).toLowerCase();
      const codeStr = (p.productCode || p.barcode || '').toLowerCase();
      const query = (search || '').toLowerCase().trim();

      const matchesSearch = !query || 
        nameStr.includes(query) || 
        brandStr.includes(query) || 
        catStr.includes(query) || 
        codeStr.includes(query);
      
      if (!matchesSearch) return false;

      if (selectedCategory === 'Low Stock') {
        const stock = getStock(p);
        const minStock = getMinStock(p);
        return stock <= minStock;
      }

      if (selectedCategory !== 'All') {
        return getCategory(p) === selectedCategory;
      }

      return true;
    });
  }, [products, search, selectedCategory]);

  return (
    <div className="p-4 space-y-4 font-sans max-w-md mx-auto selection:bg-teal-500 selection:text-white">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#F3F4F6] font-sans flex items-center gap-2">
            <Package className="w-6 h-6 text-[#14B8A6]" /> Inventory Master
          </h2>
          <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">
            {filteredProducts.length} Products Listed
          </p>
        </div>

        {/* Add Product Button (Admin Only) */}
        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 min-h-[40px]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Product</span>
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
          placeholder="Search products by name, brand, category..."
          className="w-full pl-11 pr-4 py-3 bg-[#1F2937] border border-[#374151] rounded-2xl text-sm text-[#F3F4F6] placeholder-[#9CA3AF] focus:outline-none focus:border-[#14B8A6] shadow-sm"
        />
      </div>

      {/* Category Filter Pills (Horizontal Scroll) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold shrink-0 transition ${
                isActive 
                  ? 'bg-[#14B8A6] text-white shadow-sm' 
                  : 'bg-[#1E293B] text-[#9CA3AF] border border-[#374151]'
              }`}
            >
              {cat === 'Low Stock' ? '⚠️ Low Stock' : cat}
            </button>
          );
        })}
      </div>

      {/* Product List Mobile Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#9CA3AF] font-mono">Loading inventory data...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center bg-[#1E293B] border border-[#374151] rounded-2xl text-xs text-[#9CA3AF] font-mono space-y-2">
            <div>No products found matching your search.</div>
            {selectedCategory !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className="text-teal-400 underline text-xs font-bold"
              >
                Show All Categories
              </button>
            )}
          </div>
        ) : (
          filteredProducts.map((p) => {
            const productName = getProductName(p);
            const brandName = getBrand(p);
            const categoryName = getCategory(p);
            const price = getSellingPrice(p);
            const stock = getStock(p);
            const minStock = getMinStock(p);
            const status = getStockStatus(stock, minStock);

            return (
              <div 
                key={p.id || p.barcode || productName}
                className="bg-[#1E293B] border border-[#374151] rounded-2xl p-4 shadow-sm space-y-3"
              >
                {/* Header: Product Name & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm text-[#F3F4F6] leading-snug">
                      {productName}
                    </h3>
                    <div className="text-xs font-mono text-[#9CA3AF]">
                      Brand: <span className="text-[#14B8A6] font-bold">{brandName}</span>
                    </div>
                    <div className="text-xs font-mono text-[#9CA3AF]">
                      Category: <span className="text-slate-300 font-semibold">{categoryName}</span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono font-extrabold px-2.5 py-1 border rounded-xl shrink-0 ${status.color}`}>
                    Status: {status.label}
                  </span>
                </div>

                {/* Info Box: Price & Stock */}
                <div className="grid grid-cols-2 gap-2 bg-[#1F2937] p-3 rounded-xl text-xs font-mono">
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px] uppercase">Price</span>
                    <strong className="text-sm font-extrabold text-[#F3F4F6]">
                      {formatRupees(price)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[#9CA3AF] block text-[10px] uppercase">Current Stock</span>
                    <strong className={`text-sm font-extrabold ${stock <= minStock ? 'text-amber-300' : 'text-emerald-400'}`}>
                      {stock} {p.unit || 'Pcs'}
                    </strong>
                  </div>
                </div>

                {/* Admin Action Buttons (Edit & Delete) */}
                {isAdmin && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(p)}
                      className="min-h-[48px] bg-[#14B8A6] hover:bg-[#0D9488] text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(p)}
                      className="min-h-[48px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-extrabold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
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
                  placeholder="e.g. Havells 1.5 sqmm FR Wire"
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

              <div>
                <label className="block text-[#9CA3AF] font-mono mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full p-3 bg-[#1F2937] border border-[#374151] rounded-xl text-sm text-[#F3F4F6]"
                >
                  <option value="Wires & Cables">Wires & Cables</option>
                  <option value="Switches & Sockets">Switches & Sockets</option>
                  <option value="Switchgear & MCBs">Switchgear & MCBs</option>
                  <option value="Fans & Appliances">Fans & Appliances</option>
                  <option value="Lighting">Lighting</option>
                  <option value="Conduits & Fittings">Conduits & Fittings</option>
                  <option value="Tools & Accessories">Tools & Accessories</option>
                </select>
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
