import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AlertProvider } from './context/AlertContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LockScreen from './components/LockScreen';
import ReceiptModal from './components/ReceiptModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import DraftInvoicesModal from './components/DraftInvoicesModal';

import { Lock } from 'lucide-react';

// Code-split page components for instant initial bundle rendering
const POSBilling = lazy(() => import('./pages/POSBilling'));
const CustomerLedger = lazy(() => import('./pages/CustomerLedger'));
const InventoryMaster = lazy(() => import('./pages/InventoryMaster'));
const SalesHistory = lazy(() => import('./pages/SalesHistory'));
const DashboardAnalytics = lazy(() => import('./pages/DashboardAnalytics'));
const ShopSettings = lazy(() => import('./pages/ShopSettings'));

// Fallback loader component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-xs font-mono text-slate-400">Loading module...</p>
      </div>
    </div>
  );
}

function MainAppContent() {
  const { isAuthenticated, userRole } = useAuth();
  const [currentView, setCurrentView] = useState('pos');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [draftInvoices, setDraftInvoices] = useState([]);
  const [activeResumedDraft, setActiveResumedDraft] = useState(null);

  const loadDrafts = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('volt_draft_invoices') || '[]');
      setDraftInvoices(saved);
    } catch (e) {
      setDraftInvoices([]);
    }
  };

  useEffect(() => {
    loadDrafts();
    window.addEventListener('volt_drafts_updated', loadDrafts);
    return () => window.removeEventListener('volt_drafts_updated', loadDrafts);
  }, []);

  const handleCompleteSale = (completedInvoice) => {
    setSelectedInvoice(completedInvoice);
  };

  const handleViewReceipt = (invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleResumeDraft = (draft) => {
    setActiveResumedDraft(draft);
    // Remove resumed draft from storage
    const updated = draftInvoices.filter(d => d.id !== draft.id);
    localStorage.setItem('volt_draft_invoices', JSON.stringify(updated));
    setDraftInvoices(updated);
    setShowDraftsModal(false);
    setCurrentView('pos');
  };

  const handleDeleteDraft = (draftId) => {
    const updated = draftInvoices.filter(d => d.id !== draftId);
    localStorage.setItem('volt_draft_invoices', JSON.stringify(updated));
    setDraftInvoices(updated);
  };

  if (!isAuthenticated) {
    return <LockScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark-900 text-slate-100 font-sans transition-colors duration-300">
      {/* Top Navbar Header */}
      <Navbar 
        currentView={currentView}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenDrafts={() => setShowDraftsModal(true)}
        draftCount={draftInvoices.length}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <Sidebar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
        />

        {/* View Content Area */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Suspense fallback={<PageLoader />}>
            {currentView === 'pos' && (
              <POSBilling 
                onCompleteSale={handleCompleteSale} 
                onResumeDraftData={activeResumedDraft}
              />
            )}

            {currentView === 'dues' && (
              <CustomerLedger />
            )}

            {currentView === 'inventory' && (
              <InventoryMaster />
            )}

            {currentView === 'history' && (
              <SalesHistory onViewReceipt={handleViewReceipt} />
            )}

            {currentView === 'analytics' && (
              <DashboardAnalytics onNavigate={setCurrentView} />
            )}

            {currentView === 'settings' && (
              userRole === 'admin' ? (
                <ShopSettings />
              ) : (
                <div className="p-12 text-center space-y-4 flex flex-col items-center justify-center min-h-[500px]">
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Access Restricted</h3>
                  <p className="text-sm text-slate-400 max-w-md">
                    Shop Settings & Data Reset options require Admin Password authorization. Staff users are authorized for POS Billing and Sales History.
                  </p>
                  <button
                    onClick={() => setCurrentView('pos')}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition shadow-lg shadow-amber-500/20"
                  >
                    RETURN TO ACTIVE POS BILLING
                  </button>
                </div>
              )
            )}
          </Suspense>
        </main>
      </div>

      {/* Printable Thermal Receipt Modal */}
      {selectedInvoice && (
        <ReceiptModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Counter Keyboard Hotkeys Modal */}
      {showShortcutsModal && (
        <KeyboardShortcutsModal
          onClose={() => setShowShortcutsModal(false)}
        />
      )}

      {/* Held Draft Invoices Modal */}
      {showDraftsModal && (
        <DraftInvoicesModal
          draftInvoices={draftInvoices}
          onResumeDraft={handleResumeDraft}
          onDeleteDraft={handleDeleteDraft}
          onClose={() => setShowDraftsModal(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AlertProvider>
        <AuthProvider>
          <MainAppContent />
        </AuthProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}
