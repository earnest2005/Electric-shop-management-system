import React, { useState, useEffect, useRef } from 'react';
import { Settings, Store, Phone, MapPin, FileText, CheckCircle2, Save, Zap, Database, Loader2, Trash2, AlertTriangle, KeyRound, Lock, ShieldCheck, Download, Upload } from 'lucide-react';
import { getShopDetails, saveShopDetails, DEFAULT_SHOP_DETAILS, clearBillsAndCustomers, getProducts, getPurchases, getCustomers, saveProduct } from '../services/db';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';

export default function ShopSettings() {
  const { toast, confirm } = useAlert();
  const { changePassword } = useAuth();
  const backupInputRef = useRef(null);

  const [shopName, setShopName] = useState(DEFAULT_SHOP_DETAILS.shopName);
  const [tagline, setTagline] = useState(DEFAULT_SHOP_DETAILS.tagline);
  const [ownerName, setOwnerName] = useState(DEFAULT_SHOP_DETAILS.ownerName);
  const [phone, setPhone] = useState(DEFAULT_SHOP_DETAILS.phone);
  const [address, setAddress] = useState(DEFAULT_SHOP_DETAILS.address);
  const [gstin, setGstin] = useState(DEFAULT_SHOP_DETAILS.gstin);
  const [invoiceFooterNote, setInvoiceFooterNote] = useState(DEFAULT_SHOP_DETAILS.invoiceFooterNote);
  const [defaultTaxPercent, setDefaultTaxPercent] = useState(DEFAULT_SHOP_DETAILS.defaultTaxPercent.toString());

  // Password state
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPasswordInput) {
      toast.error("Please enter your current password.", "Validation Error");
      return;
    }
    if (!newPasswordInput || newPasswordInput.length < 3) {
      toast.error("New password must be at least 3 characters long.", "Validation Error");
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      toast.error("New Password and Confirm Password do not match.", "Validation Error");
      return;
    }

    setIsChangingPass(true);
    try {
      await changePassword(currentPasswordInput, newPasswordInput);
      toast.success("Terminal access password changed & synced with Cloud Firestore!", "Password Updated");
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err) {
      toast.error(err.message, "Password Error");
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleCloudSync = async () => {
    setIsSyncing(true);
    try {
      const prods = await getProducts();
      for (const p of prods) {
        await saveProduct(p);
      }
      toast.success("All products, sales bills, customer ledgers & shop details synced with Cloud Firestore!", "Cloud Sync Complete");
    } catch (err) {
      toast.error(err.message, "Cloud Sync Error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportBackupJSON = async () => {
    try {
      const products = await getProducts();
      const purchases = await getPurchases();
      const customers = await getCustomers();
      const shop = await getShopDetails();

      const backupObj = {
        app: 'Volt Electrical POS',
        version: '2.5',
        exportedAt: new Date().toISOString(),
        products,
        purchases,
        customers,
        shop
      };

      const jsonStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `volt_pos_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Full system backup exported to JSON file!", "Backup Downloaded");
    } catch (e) {
      toast.error("Failed to generate backup file", "Export Error");
    }
  };

  const handleRestoreBackupJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const backupObj = JSON.parse(evt.target.result);
        if (backupObj.products) localStorage.setItem('volt_db_products', JSON.stringify(backupObj.products));
        if (backupObj.purchases) localStorage.setItem('volt_db_purchases', JSON.stringify(backupObj.purchases));
        if (backupObj.customers) localStorage.setItem('volt_db_customers', JSON.stringify(backupObj.customers));
        if (backupObj.shop) localStorage.setItem('volt_db_shop_details', JSON.stringify(backupObj.shop));

        window.dispatchEvent(new CustomEvent('volt_db_updated'));
        toast.success("System restored successfully from JSON backup file!", "Restore Complete");
      } catch (err) {
        toast.error("Invalid backup JSON file format", "Restore Error");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shopName.trim()) {
      toast.error("Shop Name cannot be empty.", "Validation Error");
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
      toast.success("Shop settings saved successfully!", "Settings Saved");
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to save shop settings:", err);
      toast.error("Error saving settings: " + err.message, "Save Failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearData = async () => {
    const ok = await confirm({
      title: 'Danger Zone: Wipe Bills & Customer Records',
      message: 'Are you sure you want to permanently clear all bills, customer profiles, and due records? Inventory products will be kept.',
      confirmText: 'Wipe Records',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (!ok) return;

    setIsClearing(true);
    try {
      await clearBillsAndCustomers();
      setClearSuccess(true);
      toast.success("All historical bills and customer records wiped clean!", "Reset Complete");
      setTimeout(() => setClearSuccess(false), 5000);
    } catch (err) {
      toast.error("Error clearing database: " + err.message, "Reset Failed");
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

        {/* Card 4: Terminal Access & Security Password */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
              <KeyRound className="w-5 h-5" />
              <span>Terminal Access Password & Security</span>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> CLOUD & LOCAL SYNCED
            </span>
          </div>

          <div className="text-xs space-y-3 font-sans">
            <p className="text-slate-300 font-mono text-[11px]">
              Update the terminal password used to unlock POS billing, inventory, and customer ledgers. Password changes are saved to Cloud Firestore and sync automatically across all devices.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Current Password*</label>
                <input
                  type="password"
                  value={currentPasswordInput}
                  onChange={e => setCurrentPasswordInput(e.target.value)}
                  placeholder="Enter current password..."
                  className="w-full glass-input px-3 py-2 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">New Password*</label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={e => setNewPasswordInput(e.target.value)}
                  placeholder="Enter new password..."
                  className="w-full glass-input px-3 py-2 rounded-xl font-mono text-amber-300"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Confirm New Password*</label>
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={e => setConfirmPasswordInput(e.target.value)}
                  placeholder="Re-enter new password..."
                  className="w-full glass-input px-3 py-2 rounded-xl font-mono text-amber-300"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleChangePasswordSubmit}
                disabled={isChangingPass}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isChangingPass ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>UPDATING PASSWORD...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>UPDATE PASSWORD</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: JSON Backup & Offline System Export */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
              <Database className="w-5 h-5" />
              <span>Full System Data Backup & Restore</span>
            </div>
            <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded font-mono">
              OFFLINE PROTECTED
            </span>
          </div>

          <p className="text-xs text-slate-300 font-mono">
            Download an offline JSON file containing all products, sales history, customer dues, and shop settings for emergency backup or offline transfer.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              ref={backupInputRef}
              onChange={handleRestoreBackupJSON}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={handleExportBackupJSON}
              className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow-lg transition"
            >
              <Download className="w-4 h-4" />
              <span>DOWNLOAD SYSTEM BACKUP (JSON)</span>
            </button>
            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="flex items-center space-x-2 px-4 py-2.5 bg-dark-800 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>RESTORE FROM BACKUP FILE</span>
            </button>
          </div>
        </div>

        {/* Card 5: Database Data Reset / Wipe Bills & Customers */}
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
