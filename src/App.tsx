import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { TrackingView } from './components/TrackingView.js';
import { ClientDashboard } from './components/ClientDashboard.js';
import { AdminPortal } from './components/AdminPortal.js';
import { BookShipmentModal } from './components/BookShipmentModal.js';
import { WaybillModal } from './components/WaybillModal.js';
import { ConfigGuideModal } from './components/ConfigGuideModal.js';
import { AuthModal } from './components/AuthModal.js';
import { DownloadModal } from './components/DownloadModal.js';
import { Shipment } from './types/shipment.js';
import { Package, Terminal, Lock, Download } from 'lucide-react';
import RecipientShipmentView from './components/RecipientShipmentView.js';

function MainAppContent() {
  const { user, isAuthenticated, isLoading, openAuthModal } = useAuth();
  
  // Portal Mode: 'customer' or 'admin' (strictly separated)
  const [isStaffPortal, setIsStaffPortal] = useState<boolean>(() => {
    return window.location.pathname.startsWith('/admin') || window.location.search.includes('portal=admin');
  });

  const [activeTab, setActiveTab] = useState<'track' | 'consignments' | 'guide'>('track');

  // ✅ FIX 1: Default to empty string so new visitors get a clean slate with no pre-loaded transit
  const [selectedTrackingNumber, setSelectedTrackingNumber] = useState<string>('');

  // Customer Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [waybillShipment, setWaybillShipment] = useState<Shipment | null>(null);

  // Check URL query parameters for ?track=... or ?portal=admin
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trackParam = params.get('track');
    const tokenParam = params.get('token');

    if (tokenParam || trackParam) {
      setSelectedTrackingNumber(tokenParam || trackParam || '');
      setActiveTab('track');
    }

    if (params.get('portal') === 'admin' || window.location.pathname.startsWith('/admin')) {
      setIsStaffPortal(true);
    }
  }, []);

  const handleTrackShipment = (trackingNumber: string) => {
    setSelectedTrackingNumber(trackingNumber);
    setActiveTab('track');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShipmentBooked = (newShipment: Shipment) => {
    setIsBookModalOpen(false);
    setSelectedTrackingNumber(newShipment.trackingNumber);
    setActiveTab('track');
  };

  // Dedicated recipient portal: show only the shipment shared via URL token
  const recipientToken = new URLSearchParams(window.location.search).get('token');

  if (recipientToken && !isStaffPortal) {
    return <RecipientShipmentView token={recipientToken} />;
  }

  // If in Separate Administrator Portal Mode, render AdminPortal exclusively
  if (isStaffPortal) {
    return (
      <AdminPortal
        onExitToCustomerView={() => {
          setIsStaffPortal(false);
          const url = new URL(window.location.href);
          url.searchParams.delete('portal');
          window.history.pushState({}, '', url.pathname === '/admin' ? '/' : url.toString());
        }}
        onOpenBookModal={() => setIsBookModalOpen(true)}
        onTrackShipment={(trk) => {
          setSelectedTrackingNumber(trk);
          setIsStaffPortal(false);
          setActiveTab('track');
        }}
      />
    );
  }

  const handleSetActiveTab = (tab: 'track' | 'consignments' | 'guide') => {
  if (tab === 'consignments' && !isAuthenticated) {
    openAuthModal('register');
    return;
  }

  setActiveTab(tab);
};
  // Otherwise, render Public Customer View
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Bar Contract Navbar (Customer Only) */}
      {/* ✅ FIX 2: Passed openAuthModal so Navbar Sign In / Register buttons trigger the pop-up modal */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        onOpenBookModal={() => setIsBookModalOpen(true)}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
      />

      {/* Main Customer Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'track' && (
          <TrackingView
            initialTrackingNumber={selectedTrackingNumber}
            onViewWaybill={(shipment) => setWaybillShipment(shipment)}
            onAddMilestone={() => {}}
            currentUser={user}
            isAuthenticated={isAuthenticated}
            isAuthLoading={isLoading}
            onRequestLogin={() => openAuthModal('login')}
          />
        )}

        {activeTab === 'consignments' && (
          <ClientDashboard
            onTrackShipment={handleTrackShipment}
            onViewWaybill={(shipment) => setWaybillShipment(shipment)}
            onOpenBookModal={() => setIsBookModalOpen(true)}
          />
        )}
      </main>

      {/* Global Customer Modals */}
      {isBookModalOpen && (
        <BookShipmentModal
          onClose={() => setIsBookModalOpen(false)}
          onSuccess={handleShipmentBooked}
        />
      )}

      {waybillShipment && (
        <WaybillModal
          shipment={waybillShipment}
          onClose={() => setWaybillShipment(null)}
        />
      )}

      {isConfigModalOpen && (
        <ConfigGuideModal onClose={() => setIsConfigModalOpen(false)} />
      )}

      {isDownloadModalOpen && (
        <DownloadModal onClose={() => setIsDownloadModalOpen(false)} />
      )}

      <AuthModal />

      {/* Customer Footer with Discreet Staff Portal Link */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-500" />
            <span className="font-semibold text-slate-300">Freight Plus Logistics</span>
            <span>·</span>
            <span>Consignment Telemetry & Cargo Operations</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsDownloadModalOpen(true)}
              className="hover:text-cyan-400 text-slate-400 transition-colors flex items-center gap-1 font-mono text-[11px]"
              title="Download full project source code"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download ZIP</span>
            </button>

            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="hover:text-slate-300 transition-colors flex items-center gap-1 font-mono text-[11px]"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Database & Config</span>
            </button>

            <button
              onClick={() => {
                setIsStaffPortal(true);
                const url = new URL(window.location.href);
                url.searchParams.set('portal', 'admin');
                window.history.pushState({}, '', url.toString());
              }}
              className="hover:text-amber-400 transition-colors flex items-center gap-1 text-[11px]"
              title="Restricted Staff & Dispatch Access"
            >
              <Lock className="w-3 h-3 text-slate-600 hover:text-amber-400" />
              <span>Staff Portal</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}