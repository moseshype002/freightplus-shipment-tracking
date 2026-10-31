import React from 'react';
import { Package, PlusCircle, LogOut, Download, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface NavbarProps {
  activeTab: 'track' | 'consignments' | 'guide';
  setActiveTab: (tab: 'track' | 'consignments' | 'guide') => void;
  onOpenBookModal: () => void;
  onOpenDownloadModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenBookModal,
  onOpenDownloadModal,
}) => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
const handleBookClick = () => {
  if (!isAuthenticated) {
    openAuthModal('register');
    return;
  }

  onOpenBookModal();
};
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element wordmark) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Package className="w-5 h-5 text-white" />
          </div>
          <button
            onClick={() => setActiveTab('track')}
            className="text-left font-bold text-lg tracking-tight text-white flex items-center gap-1.5 focus:outline-none"
          >
            <span>Freight Plus</span>
            <span className="text-cyan-400 font-mono text-[11px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50">
              CARGO
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links (single line, clean typography, NO admin links) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            onClick={() => setActiveTab('track')}
            className={`whitespace-nowrap transition-colors pb-1 border-b-2 ${
              activeTab === 'track'
                ? 'border-cyan-400 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Track & Trace
          </button>

          <button
            onClick={() => setActiveTab('consignments')}
            className={`whitespace-nowrap transition-colors pb-1 border-b-2 ${
              activeTab === 'consignments'
                ? 'border-cyan-400 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            My Consignments
          </button>

          <button
            onClick={handleBookClick}
            className="whitespace-nowrap transition-colors pb-1 border-b-2 border-transparent text-slate-400 hover:text-slate-200"
          >
            Book Shipment
          </button>
        </nav>

        {/* Zone 3: Actions & Customer Account (NO Admin Toggle) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenDownloadModal}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
            title="Download project ZIP archive"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xs:inline sm:inline">Download ZIP</span>
          </button>

          <button
            onClick={handleBookClick}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors shadow-sm shadow-cyan-400/20 whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Book Cargo</span>
          </button>

          {/* Customer Profile or Sign In */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800 text-xs">
              <div className="text-right hidden sm:block">
                <p className="font-medium text-slate-200 truncate max-w-[130px]">{user.name}</p>
                <p className="text-[11px] text-slate-500 truncate max-w-[130px] font-mono">{user.company || 'Customer'}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal('login')}
                className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-md border border-cyan-800/60 bg-cyan-950/40 hover:bg-cyan-950/60 transition-colors hidden sm:block"
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
