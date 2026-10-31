import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  ArrowRight, 
  ExternalLink, 
  Printer, 
  PlusCircle, 
  RefreshCw, 
  CheckCircle2, 
  Plane, 
  ShieldAlert,
  Clock,
  AlertTriangle,
  MessageCircle
} from 'lucide-react';
import { Shipment, MovementStatus } from '../types/shipment.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import CustomerSupportChat from './CustomerSupportChat.js';
interface ClientDashboardProps {
  onTrackShipment: (trackingNumber: string) => void;
  onViewWaybill: (shipment: Shipment) => void;
  onOpenBookModal: () => void;
}



const FILTER_TABS: { label: string; value: string }[] = [
  { label: 'All Consignments', value: 'All' },
  { label: 'In Transit', value: 'In Transit' },
  { label: 'On Hold', value: 'On Hold' },
  { label: 'Out for Delivery', value: 'Out for Delivery' },
  { label: 'Delivered', value: 'Delivered' },
  { label: 'Awaiting Dispatch', value: 'Awaiting Dispatch' },
];

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  onTrackShipment,
  onViewWaybill,
  onOpenBookModal,
}) => {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
const [supportShipment, setSupportShipment] = useState<Shipment | null>(null);

  const loadShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.shipments.getAll({
        movementStatus: selectedStatus === 'All' ? undefined : selectedStatus,
        search: searchQuery.trim() || undefined,
      });
      setShipments(data.shipments);
    } catch (err: any) {
      setError(err.message || 'Failed to load shipments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadShipments();
  };

  // Metrics
  const activeCount = shipments.filter(s => s.movementStatus !== 'Delivered').length;
  const inTransitCount = shipments.filter(s => s.movementStatus === 'In Transit' || s.movementStatus === 'Out for Delivery').length;
  const holdCount = shipments.filter(s => s.movementStatus === 'On Hold' || s.holdDetails?.isOnHold).length;
  const deliveredCount = shipments.filter(s => s.movementStatus === 'Delivered').length;

  const renderMovementBadge = (status: MovementStatus) => {
    switch (status) {
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-mono">
            DELIVERED
          </span>
        );
      case 'In Transit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
            IN TRANSIT
          </span>
        );
      case 'On Hold':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-800/60 font-mono">
            ON HOLD
          </span>
        );
      case 'Out for Delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-950 text-blue-300 border border-blue-800/60 font-mono">
            OUT FOR DELIVERY
          </span>
        );
      case 'Awaiting Dispatch':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            AWAITING DISPATCH
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner & KPI Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Consignment Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tracking active commercial cargo, certified air waybills, and customs declarations for {user?.company || user?.name || 'Customer Account'}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadShipments}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs transition-colors"
            title="Refresh Consignments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenBookModal}
            className="px-3.5 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Book New Consignment</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Metric Strips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Active Shipments</span>
            <Package className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white font-mono tabular-nums">
            {activeCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-sans">
            Currently managed across global hubs
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>In Transit</span>
            <Plane className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-cyan-300 font-mono tabular-nums">
            {inTransitCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-sans">
            Airborne or highway freight lines
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Operational Holds</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-300 font-mono tabular-nums">
            {holdCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-sans">
            Customs inspection or port delays
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
            {deliveredCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-sans">
            Receipt signed with proof of delivery
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Interactive Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-xs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedStatus(tab.value)}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedStatus === tab.value
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracking, city, title..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </form>
      </div>

      {/* High-Density Data Grid */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Tracking & Consignment</th>
                <th className="py-3 px-4">Cargo Description</th>
                <th className="py-3 px-4">Routing Corridor</th>
                <th className="py-3 px-4 text-right">Gross Weight</th>
                <th className="py-3 px-4">Booking & Payment</th>
                <th className="py-3 px-4">Movement Status</th>
                <th className="py-3 px-4 text-right">Est. Delivery</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-sans">
              {loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Loading real-time consignments...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && shipments.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-300">No consignments found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      No shipments matched your current filter criteria. Book a new cargo shipment or reset filters.
                    </p>
                    <button
                      onClick={onOpenBookModal}
                      className="mt-4 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Book Consignment Now</span>
                    </button>
                  </td>
                </tr>
              )}

              {!loading &&
                shipments.map((shp) => (
                  <tr
                    key={shp.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => onTrackShipment(shp.trackingNumber)}
                  >
                    {/* Tracking ID & AWB */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-cyan-300 block hover:underline">
                        {shp.trackingNumber}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {shp.consignmentNumber}
                      </span>
                    </td>

                    {/* Cargo Title */}
                    <td className="py-3 px-4 max-w-[200px]">
                      <p className="font-medium text-slate-200 truncate">{shp.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">{shp.recipient.company || shp.recipient.name}</p>
                    </td>

                    {/* Routing Corridor */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-cyan-400 font-semibold">{shp.originHub.code}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="text-emerald-400 font-semibold">{shp.destinationHub.code}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {shp.originHub.city} ➔ {shp.destinationHub.city}
                      </span>
                    </td>

                    {/* Weight */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      <span>{shp.cargoDetails.weightKg} kg</span>
                      <span className="text-[11px] text-slate-500 block">
                        {shp.cargoDetails.pieces} pkgs
                      </span>
                    </td>

                    {/* Booking & Payment */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-[11px] font-mono">
                        <span className={`px-1.5 py-0.5 rounded ${
                          shp.bookingStatus === 'Approved' ? 'bg-emerald-950 text-emerald-300' :
                          shp.bookingStatus === 'Rejected' ? 'bg-red-950 text-red-300' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {shp.bookingStatus}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        Payment: {shp.paymentStatus}
                      </div>
                    </td>

                    {/* Movement Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderMovementBadge(shp.movementStatus)}
                    </td>

                    {/* Est. Delivery */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono tabular-nums text-slate-400">
                      {new Date(shp.estimatedDelivery).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
  <button
    onClick={() => setSupportShipment(shp)}
    className="px-2.5 py-1 bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/60 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
    title="Chat with Admin about this shipment"
  >
    <MessageCircle className="w-3 h-3" />
    <span>Chat</span>
  </button>

  <button
    onClick={() => onTrackShipment(shp.trackingNumber)}
                          className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                          title="Open Live Tracking & Map"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Track</span>
                        </button>
                        <button
                          onClick={() => onViewWaybill(shp)}
                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[11px] transition-colors"
                          title="View Printable Air Waybill (AWB)"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
       </table>
        </div>
      </div>

      {supportShipment && (
        <CustomerSupportChat
          shipmentId={supportShipment.id}
          shipmentLabel={supportShipment.trackingNumber}
   onClose={() => {
  alert('SUPPORT CHAT CLOSE HANDLER CALLED');
  setSupportShipment(null);
}}
/>
      )}
    </div>
  );
};
