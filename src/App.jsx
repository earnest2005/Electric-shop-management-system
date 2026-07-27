import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AlertProvider, useAlert } from './context/AlertContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LockScreen from './components/LockScreen';
import ReceiptModal from './components/ReceiptModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import DraftInvoicesModal from './components/DraftInvoicesModal';

import { Lock } from 'lucide-react';

// Admin Portal Pages
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CustomerRecords = lazy(() => import('./pages/CustomerRecords'));
const BillRecords = lazy(() => import('./pages/BillRecords'));
const OfferManagement = lazy(() => import('./pages/OfferManagement'));
const ReportsAnalytics = lazy(() => import('./pages/ReportsAnalytics'));
const ShopSettings = lazy(() => import('./pages/ShopSettings'));

// Staff Portal Pages & POS Shared Components
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const POSBilling = lazy(() => import('./pages/POSBilling'));
const InventoryMaster = lazy(() => import('./pages/InventoryMaster'));
const SalesHistory = lazy(() => import('./pages/SalesHistory'));
const CustomerLedger = lazy(() => import('./pages/CustomerLedger'));
const ActiveOffers = lazy(() => import('./pages/ActiveOffers'));

// Fallback loader component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
        <p className="text-xs font-mono text-slate-400">Loading module...</p>
      </div>
    </div>
  );
}

// Helper to map pathname to internal view key
const getRequestedViewFromPath = (path) => {
  const cleanPath = (path || '/').toLowerCase().trim().replace(/\/$/, '') || '/';
  switch (cleanPath) {
    case '/admin':
    case '/admin-dashboard':
      return 'admin-dashboard';
    case '/customer-records':
    case '/customers':
      return 'customer-records';
    case '/bill-records':
    case '/bills':
      return 'bill-records';
    case '/offers':
    case '/offer-management':
      return 'offers';
    case '/reports':
    case '/reports-analytics':
      return 'reports';
    case '/settings':
    case '/shop-settings':
      return 'settings';
    case '/staff':
    case '/staff-dashboard':
      return 'staff-dashboard';
    case '/pos':
    case '/billing':
      return 'pos';
    case '/dues':
    case '/customer-ledger':
      return 'dues';
    case '/inventory':
    case '/inventory-master':
      return 'inventory';
    case '/history':
    case '/sales-history':
      return 'history';
    case '/active-offers':
      return 'active-offers';
    default:
      return null;
  }
};

const getPathFromView = (view) => {
  switch (view) {
    case 'admin-dashboard': return '/admin';
    case 'customer-records': return '/customer-records';
    case 'bill-records': return '/bill-records';
    case 'offers': return '/offers';
    case 'reports': return '/reports';
    case 'settings': return '/settings';
    case 'staff-dashboard': return '/staff';
    case 'pos': return '/billing';
    case 'dues': return '/dues';
    case 'inventory': return '/inventory';
    case 'history': return '/history';
    case 'active-offers': return '/active-offers';
    default: return '/login';
  }
};

const adminRestrictedViews = ['admin-dashboard', 'customer-records', 'bill-records', 'offers', 'reports', 'settings'];

function MainAppContent() {
  const { isAuthenticated, userRole } = useAuth();
  const { toast } = useAlert();

  // Initial view based on auth state, requested URL path, and userRole
  const [currentView, setCurrentView] = useState(() => {
    if (!isAuthenticated) return 'login';
    const pathView = getRequestedViewFromPath(window.location.pathname);
    if (pathView) {
      if (userRole === 'staff' && adminRestrictedViews.includes(pathView)) {
        return 'staff-dashboard';
      }
      return pathView;
    }
    return userRole === 'admin' ? 'admin-dashboard' : 'staff-dashboard';
  });

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [draftInvoices, setDraftInvoices] = useState([]);
  const [activeResumedDraft, setActiveResumedDraft] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Sync auth state, URL, and route protection
  useEffect(() => {
    if (!isAuthenticated) {
      if (window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
      return;
    }

    const pathView = getRequestedViewFromPath(window.location.pathname);
    if (!pathView || window.location.pathname === '/login' || window.location.pathname === '/') {
      const defaultView = userRole === 'admin' ? 'admin-dashboard' : 'staff-dashboard';
      setCurrentView(defaultView);
      window.history.replaceState(null, '', getPathFromView(defaultView));
    } else if (userRole === 'staff' && adminRestrictedViews.includes(pathView)) {
      toast.warning("Access Restricted: Staff members do not have permission to view Admin modules.", "Permission Denied");
      setCurrentView('staff-dashboard');
      window.history.replaceState(null, '', '/staff');
    } else {
      setCurrentView(pathView);
    }
  }, [isAuthenticated, userRole]);

  // Listen for browser Back/Forward navigation buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (!isAuthenticated) {
        if (window.location.pathname !== '/login') {
          window.history.replaceState(null, '', '/login');
        }
        return;
      }

      const requestedView = getRequestedViewFromPath(window.location.pathname);
      if (!requestedView) {
        const fallbackView = userRole === 'admin' ? 'admin-dashboard' : 'staff-dashboard';
        setCurrentView(fallbackView);
        window.history.replaceState(null, '', getPathFromView(fallbackView));
      } else if (userRole === 'staff' && adminRestrictedViews.includes(requestedView)) {
        toast.warning("Access Restricted: Staff members do not have permission to view Admin modules.", "Permission Denied");
        setCurrentView('staff-dashboard');
        window.history.replaceState(null, '', '/staff');
      } else {
        setCurrentView(requestedView);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated, userRole]);

  // Handle protected navigation with role checks & URL updates
  const handleNavigate = (requestedView) => {
    if (!isAuthenticated) return;

    if (userRole === 'staff' && adminRestrictedViews.includes(requestedView)) {
      toast.warning("Access Restricted: Staff members do not have permission to view Admin modules.", "Permission Denied");
      setCurrentView('staff-dashboard');
      window.history.pushState(null, '', '/staff');
      setIsMobileOpen(false);
      return;
    }

    setCurrentView(requestedView);
    window.history.pushState(null, '', getPathFromView(requestedView));
    setIsMobileOpen(false);
  };

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
    const updated = draftInvoices.filter(d => d.id !== draft.id);
    localStorage.setItem('volt_draft_invoices', JSON.stringify(updated));
    setDraftInvoices(updated);
    setShowDraftsModal(false);
    handleNavigate('pos');
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
    <div className="min-h-screen flex flex-col bg-[#111827] text-[#F3F4F6] font-sans transition-colors duration-300">
      {/* Top Navbar Header */}
      <Navbar 
        currentView={currentView}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenDrafts={() => setShowDraftsModal(true)}
        onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)}
        draftCount={draftInvoices.length}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation & Mobile Drawer */}
        <Sidebar 
          currentView={currentView} 
          setCurrentView={handleNavigate} 
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* View Content Area */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Suspense fallback={<PageLoader />}>
            {/* ADMIN PORTAL VIEWS */}
            {currentView === 'admin-dashboard' && (
              <AdminDashboard onNavigate={handleNavigate} />
            )}

            {currentView === 'customer-records' && (
              <CustomerRecords />
            )}

            {currentView === 'bill-records' && (
              <BillRecords />
            )}

            {currentView === 'offers' && (
              <OfferManagement />
            )}

            {currentView === 'reports' && (
              <ReportsAnalytics />
            )}

            {currentView === 'settings' && (
              userRole === 'admin' ? (
                <ShopSettings />
              ) : (
                <div className="p-12 text-center space-y-4 flex flex-col items-center justify-center min-h-[500px]">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100">Access Restricted</h3>
                  <p className="text-sm text-slate-400 max-w-md">
                    Shop Settings & Data Reset options require Admin Password authorization.
                  </p>
                  <button
                    onClick={() => handleNavigate('staff-dashboard')}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition shadow-sm"
                  >
                    RETURN TO DASHBOARD
                  </button>
                </div>
              )
            )}

            {/* STAFF PORTAL VIEWS */}
            {currentView === 'staff-dashboard' && (
              <StaffDashboard onNavigate={handleNavigate} />
            )}

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

            {currentView === 'active-offers' && (
              <ActiveOffers onNavigate={handleNavigate} />
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
