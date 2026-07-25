import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import POSBilling from './pages/POSBilling';
import CustomerLedger from './pages/CustomerLedger';
import InventoryMaster from './pages/InventoryMaster';
import SalesHistory from './pages/SalesHistory';
import DashboardAnalytics from './pages/DashboardAnalytics';
import ShopSettings from './pages/ShopSettings';
import ReceiptModal from './components/ReceiptModal';
import FirebaseConfigModal from './components/FirebaseConfigModal';

export default function App() {
  const [currentView, setCurrentView] = useState('pos');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  const handleCompleteSale = (completedInvoice) => {
    setSelectedInvoice(completedInvoice);
  };

  const handleViewReceipt = (invoice) => {
    setSelectedInvoice(invoice);
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-900 text-slate-100 font-sans">
      {/* Top Navbar Header */}
      <Navbar 
        onOpenFirebaseConfig={() => setShowFirebaseModal(true)} 
        currentView={currentView}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <Sidebar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
        />

        {/* View Content Area */}
        <main className="flex-1 overflow-y-auto">
          {currentView === 'pos' && (
            <POSBilling onCompleteSale={handleCompleteSale} />
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
            <ShopSettings />
          )}
        </main>
      </div>

      {/* Printable Thermal Receipt Modal */}
      {selectedInvoice && (
        <ReceiptModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Firebase SDK Config Credentials Modal */}
      {showFirebaseModal && (
        <FirebaseConfigModal
          onClose={() => setShowFirebaseModal(false)}
        />
      )}
    </div>
  );
}
