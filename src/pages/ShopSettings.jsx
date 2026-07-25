import React, { useState, useEffect } from 'react';
import { Settings, Store, Phone, MapPin, FileText, CheckCircle2, Save, Zap, Database, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { getShopDetails, saveShopDetails, DEFAULT_SHOP_DETAILS, clearBillsAndCustomers } from '../services/db';

export default function ShopSettings() {
  const [shopName, setShopName] = useState(DEFAULT_SHOP_DETAILS.shopName);
  const [tagline, setTagline] = useState(DEFAULT_SHOP_DETAILS.tagline);
  const [ownerName, setOwnerName] = useState(DEFAULT_SHOP_DETAILS.ownerName);
  const [phone, setPhone] = useState(DEFAULT_SHOP_DETAILS.phone);
  const [address, setAddress] = useState(DEFAULT_SHOP_DETAILS.address);
  const [gstin, setGstin] = useState(DEFAULT_SHOP_DETAILS.gstin);
  const [invoiceFooterNote, setInvoiceFooterNote] = useState(DEFAULT_SHOP_DETAILS.invoiceFooterNote);
  const [defaultTaxPercent, setDefaultTaxPercent] = useState(DEFAULT_SHOP_DETAILS.defaultTaxPercent.toString());

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getShopDetails();
      if (data) {
        setShopName(data.shopName || DEFAULT_SHOP_DETAILS.shopName);
        setTagline(data.tagline || DEFAULT_SHOP_DETAILS.tagline);
        setOwnerName(data.ownerName || DEFAULT_SHOP_DETAILS.ownerName);
        setPhone(data.phone || DEFAULT_SHOP_DETAILS.phone);
        setAddress(data.address || DEFAULT_SHOP_DETAILS.address);
        setGstin(data.gstin || DEFAULT_SHOP_DETAILS.gstin);
        setInvoiceFooterNote(data.invoiceFooterNote || DEFAULT_SHOP_DETAILS.invoiceFooterNote);
        setDefaultTaxPercent((data.defaultTaxPercent || 18).toString());
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shopName.trim()) {
      alert("Shop Name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const updatedDetails = {
        shopName: shopName.trim(),
        tagline: tagline.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        gstin: gstin.trim(),
        invoiceFooterNote: invoiceFooterNote.trim(),
        defaultTaxPercent: Number(defaultTaxPercent) || 18,
        updatedAt: new Date().toISOString()
      };

      await saveShopDetails(updatedDetails);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to save shop settings:", err);
      alert("Error saving settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm("Are you sure you want to permanently clear all bills, customer profiles, and due records? Inventory products will be kept.")) {
      return;
    }

    setIsClearing(true);
    try {
      await clearBillsAndCustomers();
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 5000);
    } catch (err) {
      alert("Error clearing database: " + err.message);
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        <span>Loading Shop Configuration...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-white text-2xl font-sans flex items-center gap-2">
            <Settings className="w-7 h-7 text-amber-400" /> Shop Settings & Billing Configuration
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Modify shop branding, contact numbers, GSTIN details, thermal receipt headers, and store defaults
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3.5 py-2 rounded-xl animate-fade-in font-mono">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved & Synced!</span>
          </div>
        )}

        {clearSuccess && (
          <div className="flex items-center space-x-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs px-3.5 py-2 rounded-xl animate-fade-in font-mono">
            <CheckCircle2 className="w-4 h-4 text-rose-400" />
            <span>All Bills & Customer Records Wiped Fresh!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Shop Profile & Branding */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 text-amber-400 font-semibold text-sm">
            <Store className="w-5 h-5" />
            <span>Store Identity & Branding</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-mono mb-1.5">Electrical Shop Name*</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl font-bold text-white text-sm"
                placeholder="e.g. VOLT ELECTRICALS"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1.5">Shop Tagline / Business Subtitle</label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-slate-200"
                placeholder="e.g. Power, Lighting & Hardware Master Store"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1.5">Shop Owner / Contact Person</label>
              <input
                type="text"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-slate-200"
                placeholder="e.g. Rajesh Kumar"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1.5">Contact Phone Number(s)</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl font-mono text-amber-300"
                placeholder="e.g. +91 98765 00000"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Location, GSTIN & Tax Defaults */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 text-amber-400 font-semibold text-sm">
            <MapPin className="w-5 h-5" />
            <span>Taxation, Address & Invoice Defaults</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block text-slate-400 font-mono mb-1.5">Complete Shop Address (Appears on Bills)</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-slate-200"
                placeholder="e.g. Main Market Road, Near Electric Substation, Sector 4"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1.5">GSTIN Registration Number</label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl font-mono text-amber-400 font-bold tracking-wider"
                placeholder="e.g. 29ABCDE1234F1Z5"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1.5">Default GST Tax Percentage (%)</label>
              <input
                type="number"
                value={defaultTaxPercent}
                onChange={e => setDefaultTaxPercent(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl font-mono text-emerald-400 font-bold"
                placeholder="18"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Thermal Receipt Customization */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 text-amber-400 font-semibold text-sm">
            <FileText className="w-5 h-5" />
            <span>Thermal Bill Print Receipt Customization</span>
          </div>

          <div className="text-xs space-y-3">
            <div>
              <label className="block text-slate-400 font-mono mb-1.5">Invoice Footer Note / Warranty Terms</label>
              <textarea
                rows={3}
                value={invoiceFooterNote}
                onChange={e => setInvoiceFooterNote(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-slate-200 font-sans"
                placeholder="Thank you for shopping at Volt Electricals! Warranty valid against invoice."
              />
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                This note will be printed at the bottom of every 80mm thermal receipt.
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: Database Data Reset / Wipe Bills & Customers */}
        <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-rose-400 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Data Reset & Clear Records</span>
            </div>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2.5 py-1 rounded font-mono">
              DANGER ZONE
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Wipe all historical invoice bills, customer ledger profiles, and due payments to start with a clean slate for store opening. Inventory products will remain untouched.
          </p>

          <button
            type="button"
            onClick={handleClearData}
            disabled={isClearing}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition flex items-center space-x-2 disabled:opacity-50"
          >
            {isClearing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>WIPING BILLS & CUSTOMERS...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>CLEAR ALL BILLS & CUSTOMERS</span>
              </>
            )}
          </button>
        </div>

        {/* Card 5: Connected Cloud Database Overview */}
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-3 text-emerald-400">
            <Database className="w-5 h-5" />
            <div>
              <div className="font-bold">Cloud Database Active</div>
              <div className="text-slate-400 text-[11px]">Connected Project ID: <strong className="text-emerald-300">electrical-shop-system-8aee0</strong></div>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-full">
            REAL-TIME SYNCED
          </span>
        </div>

        {/* Save Actions Bar */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-sm rounded-xl shadow-xl shadow-amber-500/20 transition flex items-center space-x-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>SAVING CHANGES...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>SAVE SHOP DETAILS</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
