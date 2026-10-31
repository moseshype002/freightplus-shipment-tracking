import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Plane, 
  Truck, 
  Ship, 
  AlertTriangle, 
  ShieldCheck, 
  Share2, 
  Printer, 
  PlusCircle, 
  Thermometer, 
  Box, 
  Anchor, 
  Compass,
  ArrowRight,
  ExternalLink,
  Info,
  PauseCircle
} from 'lucide-react';
import { Shipment, Milestone, MovementStatus, User } from '../types/shipment.js';
import { api } from '../services/api.js';
import { SupportMessage } from '../services/api.js';
import { RecipientSupportMessage } from '../services/api.js';
import ShipmentGlobe from './ShipmentGlobe';
interface TrackingViewProps {
initialTrackingNumber?: string;
onViewWaybill: (shipment: Shipment) => void;
onAddMilestone?: (shipment: Shipment) => void;
currentUser: User | null;
isAuthenticated: boolean;
isAuthLoading: boolean;
onRequestLogin: () => void;
}

const SAMPLE_TRACKING_NUMBERS = [
  { number: 'FP-8942-US', label: 'Air Express (FRA ➔ JFK)', status: 'In Transit' },
  { number: 'FP-7104-DE', label: 'Tokyo Sensors (HND ➔ FRA)', status: 'On Hold' },
  { number: 'FP-3329-SG', label: 'Cold-Chain Cryo (GVA ➔ SIN)', status: 'Delivered' },
  { number: 'FP-5512-UK', label: 'Aerospace AOG (EMA ➔ DXB)', status: 'Out for Delivery' },
  { number: 'FP-1209-CA', label: 'EV Battery Cells (ORD ➔ YUL)', status: 'Awaiting Dispatch' },
];

export const TrackingView: React.FC<TrackingViewProps> = ({
  initialTrackingNumber = 'FP-8942-US',
  onViewWaybill,
  onAddMilestone,
  currentUser,
  isAuthenticated,
  isAuthLoading,
  onRequestLogin,
}) => {
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
const [supportText, setSupportText] = useState('');
const [supportLoading, setSupportLoading] = useState(false);
const [supportSending, setSupportSending] = useState(false);
const [supportError, setSupportError] = useState('');
const [recipientMessages, setRecipientMessages] = useState<RecipientSupportMessage[]>([]);
const [recipientText, setRecipientText] = useState('');
const [recipientLoading, setRecipientLoading] = useState(false);
const [recipientSending, setRecipientSending] = useState(false);
const [recipientError, setRecipientError] = useState('');

  const [searchInput, setSearchInput] = useState<string>(initialTrackingNumber);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<{
    
    shipment: Shipment;
    progressPercentage: number;
    hoursRemaining: number;
    isDelivered: boolean;
    currentCheckpoint: Milestone | null;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  useEffect(() => {
const shipment = trackingData?.shipment;

if (
isAuthLoading ||
!isAuthenticated ||
!currentUser ||
!shipment ||
shipment.userId !== currentUser.id
) {
setSupportMessages([]);
return;
}

let cancelled = false;

const loadSupportMessages = async () => {
setSupportLoading(true);
setSupportError('');

try {
  const result = await api.support.getMessages(shipment.id);

  if (!cancelled) {
    setSupportMessages(result.messages);
  }
} catch (error) {
  if (!cancelled) {
    setSupportError(
      error instanceof Error
        ? error.message
        : 'Unable to load shipment messages.'
    );
  }
} finally {
  if (!cancelled) {
    setSupportLoading(false);
  }
}

};

void loadSupportMessages();

return () => {
cancelled = true;
};
}, [
trackingData?.shipment?.id,
trackingData?.shipment?.userId,
currentUser?.id,
isAuthenticated,
isAuthLoading,
]);

  const fetchTracking = async (trkNum: string) => {
    if (!trkNum.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.track.getByTrackingNumber(trkNum.trim());
      setTrackingData(data);
    } catch (err: any) {
      setError(err.message || 'Tracking number not found');
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTrackingNumber) {
      setSearchInput(initialTrackingNumber);
      fetchTracking(initialTrackingNumber);
    }
  }, [initialTrackingNumber]);
  useEffect(() => {
  const shipment = trackingData?.shipment;
  const token = shipment?.trackingToken;

  if (!token || token !== initialTrackingNumber) {
    setRecipientMessages([]);
    return;
  }

  handleLoadRecipientMessages(token);
}, [trackingData, initialTrackingNumber]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(searchInput);
  };
const handleSendSupportMessage = async (e: React.FormEvent) => {
  e.preventDefault();

  const text = supportText.trim();
  const shipment = trackingData?.shipment;

  if (!text || !shipment || supportSending) return;

  if (isAuthLoading) return;

  if (!isAuthenticated || !currentUser) {
    onRequestLogin();
    return;
  }

  if (shipment.userId !== currentUser.id) {
    setSupportError('You can only message about your own shipment.');
    return;
  }

  setSupportSending(true);
  setSupportError('');

  try {
    const result = await api.support.sendMessage(shipment.id, text);

    setSupportMessages((previousMessages) => [
      ...previousMessages,
      result.message,
    ]);

    setSupportText('');
  } catch (err: unknown) {
    setSupportError(
      err instanceof Error
        ? err.message
        : 'Unable to send your message. Please try again.'
    );
  } finally {
    setSupportSending(false);
  }
};

const handleLoadRecipientMessages = async (token: string) => {
  if (!token) return;

  setRecipientLoading(true);
  setRecipientError('');

  try {
    const result = await api.support.getRecipientMessages(token);
    setRecipientMessages(result.messages);
  } catch (err: unknown) {
    setRecipientError(
      err instanceof Error
        ? err.message
        : 'Unable to load recipient messages.'
    );
  } finally {
    setRecipientLoading(false);
  }
};

const handleSendRecipientMessage = async (e: React.FormEvent) => {
  e.preventDefault();

  const text = recipientText.trim();
  const token = trackingData?.shipment.trackingToken;

  if (!text || !token || recipientSending) return;

  setRecipientSending(true);
  setRecipientError('');

  try {
    const result = await api.support.sendRecipientMessage(token, text);

    setRecipientMessages((previousMessages) => [
      ...previousMessages,
      result.message,
    ]);

    setRecipientText('');
  } catch (err: unknown) {
    setRecipientError(
      err instanceof Error
        ? err.message
        : 'Unable to send your message. Please try again.'
    );
  } finally {
    setRecipientSending(false);
  }
};

 const handleCopyShareLink = async () => {
  if (!trackingData) return;

  const token = trackingData.shipment.trackingToken;

  if (!token) {
    setError('A secure sharing link is not available for this shipment.');
    return;
  }

  const url = `${window.location.origin}/?token=${encodeURIComponent(token)}`;

  try {
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  } catch {
    setError('Could not copy the link. Please check your browser permissions.');
  }
};

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Delivered & Signed</span>
          </span>
        );
      case 'In Transit':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
            <Plane className="w-3.5 h-3.5 animate-pulse" />
            <span>In Transit En Route</span>
          </span>
        );
      case 'On Hold':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-red-950/80 text-red-300 border border-red-800/50">
            <PauseCircle className="w-3.5 h-3.5 text-red-400" />
            <span>Operational Hold</span>
          </span>
        );
      case 'Out for Delivery':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/50">
            <Truck className="w-3.5 h-3.5" />
            <span>Out for Final Delivery</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <Box className="w-3.5 h-3.5" />
            <span>Awaiting Dispatch</span>
          </span>
        );
    }
  };

  const getServiceIcon = (service: string) => {
    if (service.includes('Air')) return <Plane className="w-4 h-4 text-cyan-400" />;
    if (service.includes('Cold')) return <Thermometer className="w-4 h-4 text-blue-400" />;
    if (service.includes('Ocean')) return <Ship className="w-4 h-4 text-emerald-400" />;
    return <Truck className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Search Header Hero */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 md:p-8 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-cyan-400 tracking-wide uppercase mb-2">
            <Compass className="w-3.5 h-3.5" />
            <span>Real-Time Consignment Telemetry</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Shipment Track & Trace
          </h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Enter your FreightPulse tracking ID or international consignment number to access live milestone checkpoints, transit coordinates, customs clearance logs, and certified waybills.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter Tracking Number (e.g. FP-8942-US or CN-2026-8942)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Locate Shipment</span>
            </button>
          </form>

          {/* Quick Select Sample Chips */}
          <div className="mt-4 flex items-center flex-wrap gap-2 text-xs">
            <span className="text-slate-500 font-medium mr-1">Demo Shipments:</span>
            {SAMPLE_TRACKING_NUMBERS.map((sample) => (
              <button
                key={sample.number}
                type="button"
                onClick={() => {
                  setSearchInput(sample.number);
                  fetchTracking(sample.number);
                }}
                className={`px-2.5 py-1 rounded border text-xs font-mono transition-colors ${
                  searchInput.toUpperCase() === sample.number.toUpperCase()
                    ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>{sample.number}</span>
                <span className="text-slate-500 ml-1.5 font-sans">({sample.status})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Tracking Lookup Failed</p>
            <p className="text-xs text-red-400/90 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Populated Tracking Results */}
      {trackingData && (
        <div className="space-y-6">
          {/* Operational Hold Notice Banner if applicable */}
          {trackingData.shipment.holdDetails?.isOnHold && (
            <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-xs text-red-200 flex items-start gap-3">
              <PauseCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-red-300 text-sm block">Operational Transit Hold</span>
                <p className="mt-1 text-slate-300 leading-relaxed">
                  {trackingData.shipment.holdDetails.customerExplanation || 'Consignment temporarily held for regulatory documentation review.'}
                </p>
                {trackingData.shipment.holdDetails.placedOnHoldAt && (
                  <span className="font-mono text-[10px] text-slate-500 block mt-1.5">
                    Hold Registered: {new Date(trackingData.shipment.holdDetails.placedOnHoldAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Main Status & Corridor Header Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-bold text-white font-mono">
                    {trackingData.shipment.trackingNumber}
                  </h2>
                  <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                    AWB: {trackingData.shipment.consignmentNumber}
                  </span>
                  {getStatusBadge(trackingData.shipment.movementStatus || trackingData.shipment.status)}
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60">
                    {trackingData.shipment.bookingStatus}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60">
                    {trackingData.shipment.paymentStatus}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-300 mt-2">
                  {trackingData.shipment.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span>Carrier: {trackingData.shipment.carrier.name}</span>
                  <span>·</span>
                  <span>Service: {trackingData.shipment.serviceType}</span>
                  {trackingData.shipment.carrier.vesselOrFlight && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-cyan-300">
                        {trackingData.shipment.carrier.vesselOrFlight}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons (Customer Only — No Admin Controls) */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => onViewWaybill(trackingData.shipment)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Consignment Note</span>
                </button>

                <button
                  onClick={handleCopyShareLink}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Link Copied!' : 'Share Link'}</span>
                </button>
              </div>
            </div>

            {/* Origin -> Destination Corridor Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 items-center">
              {/* Origin Hub */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <span className="font-mono font-bold text-sm text-cyan-400">
                    {trackingData.shipment.originHub.code}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Origin</span>
                  <p className="text-sm font-semibold text-white">
                    {trackingData.shipment.originHub.city}, {trackingData.shipment.originHub.country}
                  </p>
                  <p className="text-xs text-slate-400 truncate max-w-[220px]">
                    {trackingData.shipment.sender.company || trackingData.shipment.sender.name}
                  </p>
                </div>
              </div>

              {/* Progress & Corridor Visualization */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="text-slate-400">Route Progress</span>
                  <span className="text-cyan-400 font-bold">{trackingData.progressPercentage}%</span>
                </div>
                {/* Progress Track */}
                <div className="w-full bg-slate-800 rounded-full h-2 relative overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 h-full rounded-full transition-all duration-700"
                    style={{ width: `${trackingData.progressPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Departed</span>
                  <span className="text-cyan-300 font-medium">
                    {trackingData.shipment.status === 'Delivered'
                      ? 'Delivered'
                      : trackingData.hoursRemaining > 0
                      ? `~${trackingData.hoursRemaining}h remaining`
                      : 'Arriving today'}
                  </span>
                  <span>Destination</span>
                </div>
              </div>

              {/* Destination Hub */}
              <div className="flex items-start gap-3 md:justify-end">
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Destination</span>
                  <p className="text-sm font-semibold text-white">
                    {trackingData.shipment.destinationHub.city}, {trackingData.shipment.destinationHub.country}
                  </p>
                  <p className="text-xs text-slate-400 truncate max-w-[220px]">
                    {trackingData.shipment.recipient.company || trackingData.shipment.recipient.name}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    {trackingData.shipment.destinationHub.code}
                  </span>
                </div>
              </div>
            </div>
          </div>

     {/* Geographical Shipment Tracking Globe */}
          <ShipmentGlobe
            shipment={trackingData.shipment}
            progressPercentage={trackingData.progressPercentage}
          />

          {/* 2-Column Split: Milestone Timeline & Cargo Specifications */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1 & 2: Milestone Timeline (2 cols on large screen) */}
            <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Verified Tracking Timeline</span>
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {trackingData.shipment.milestones.length} Checkpoints Logged
                </span>
              </div>

              {/* Vertical Milestone Progress Timeline */}
              <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                {trackingData.shipment.milestones.map((ms: Milestone, idx: number) => {
                  const isLatest = idx === trackingData.shipment.milestones.length - 1;
                  return (
                    <div key={ms.id} className="relative group">
                      {/* Milestone Dot */}
                      <div
                        className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                          isLatest
                            ? 'bg-cyan-500 border-white text-slate-950 shadow-md shadow-cyan-500/40'
                            : 'bg-slate-900 border-cyan-500/60 text-cyan-400'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${isLatest ? 'bg-slate-950' : 'bg-cyan-400'}`} />
                      </div>

                      {/* Milestone Card */}
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4 transition-colors hover:border-slate-700">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{ms.title}</span>
                            {isLatest && (
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                                Latest
                              </span>
                            )}
                          </h4>
                          <span className="text-xs font-mono tabular-nums text-slate-400">
                            {new Date(ms.timestamp).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{ms.location} · {ms.city}, {ms.country}</span>
                        </div>

                        {ms.notes && (
                          <p className="mt-2 text-xs text-slate-300 leading-relaxed bg-slate-900/50 rounded p-2.5 border border-slate-800/60">
                            {ms.notes}
                          </p>
                        )}

                        {ms.operator && (
                          <div className="mt-2 text-[11px] text-slate-500 font-mono">
                            Signed off by: <span className="text-slate-400">{ms.operator}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 3: Cargo Details & Specs */}
            <div className="space-y-6">
              {/* Cargo Specification Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Box className="w-4 h-4 text-cyan-400" />
                  <span>Consignment Details</span>
                </h3>

                <dl className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                    <dt className="text-slate-400">Cargo Type</dt>
                    <dd className="font-medium text-slate-200 text-right">{trackingData.shipment.cargoDetails.cargoType}</dd>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                    <dt className="text-slate-400">Gross Weight</dt>
                    <dd className="font-mono tabular-nums font-semibold text-cyan-300 text-right">
                      {trackingData.shipment.cargoDetails.weightKg} kg
                    </dd>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                    <dt className="text-slate-400">Piece Count</dt>
                    <dd className="font-mono tabular-nums text-slate-200 text-right">
                      {trackingData.shipment.cargoDetails.pieces} Units
                    </dd>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                    <dt className="text-slate-400">Declared Value</dt>
                    <dd className="font-mono tabular-nums text-slate-200 text-right">
                      ${trackingData.shipment.cargoDetails.declaredValueUsd.toLocaleString()} USD
                    </dd>
                  </div>

                  {trackingData.shipment.cargoDetails.volumeCbm && (
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                      <dt className="text-slate-400">Volume</dt>
                      <dd className="font-mono tabular-nums text-slate-200 text-right">
                        {trackingData.shipment.cargoDetails.volumeCbm} CBM
                      </dd>
                    </div>
                  )}

                  {trackingData.shipment.carrier.sealNumber && (
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                      <dt className="text-slate-400">Customs Seal #</dt>
                      <dd className="font-mono text-xs text-amber-300 text-right">
                        {trackingData.shipment.carrier.sealNumber}
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Special Handling Notice */}
                {trackingData.shipment.cargoDetails.temperatureControlled && (
                  <div className="mt-4 rounded-lg bg-blue-950/40 border border-blue-800/50 p-3 text-xs text-blue-300 flex items-start gap-2">
                    <Thermometer className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Cold Chain Regulated</p>
                      <p className="text-[11px] text-blue-300/80 mt-0.5">
                        Target range: {trackingData.shipment.cargoDetails.temperatureRange || '2°C - 8°C'}. Certified logger active.
                      </p>
                    </div>
                  </div>
                )}

                {trackingData.shipment.cargoDetails.dangerousGoods && (
                  <div className="mt-4 rounded-lg bg-amber-950/40 border border-amber-800/50 p-3 text-xs text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Dangerous Goods Manifest</p>
                      <p className="text-[11px] text-amber-300/80 mt-0.5">
                        Class 9 hazardous cargo documentation verified.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Schedule & SLA Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Delivery Schedule</span>
                </h3>

                <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    {trackingData.shipment.status === 'Delivered' ? 'Actual Delivery' : 'Estimated Delivery'}
                  </span>
                  <p className="text-base font-bold text-white font-mono mt-0.5">
                    {new Date(
                      trackingData.shipment.actualDelivery || trackingData.shipment.estimatedDelivery
                    ).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Signature required</span>
                  <span className="font-medium text-slate-200">
                    {trackingData.shipment.signatureRequired ? 'Yes (Mandatory)' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Shipment Support Messaging */}
<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
<div className="flex items-center gap-3 mb-5">
<div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center">
<Info className="w-5 h-5 text-cyan-400" />
</div>
<div>
<h3 className="text-base font-semibold text-white">
Shipment Support
</h3>
<p className="text-xs text-slate-400 mt-1">
Contact the FreightPulse team about this shipment.
</p>
</div>
</div>

        {!isAuthenticated ? (
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-300">
              Sign in to your account to message support about your shipment.
            </p>
            <button
              type="button"
              onClick={onRequestLogin}
              className="mt-3 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold transition-colors"
            >
              Sign In to Message Support
            </button>
          </div>
        ) : isAuthLoading ? (
          <p className="text-sm text-slate-400">
            Checking your account...
          </p>
        ) : !currentUser ? (
          <p className="text-sm text-slate-400">
            Please sign in to access shipment support.
          </p>
        ) : trackingData.shipment.userId !== currentUser.id ? (
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">
              Shipment messaging is available to the account associated with this shipment.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 max-h-96 overflow-y-auto mb-5">
              {supportLoading ? (
                <p className="text-sm text-slate-400 py-3">
                  Loading conversation...
                </p>
              ) : supportMessages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700 p-5 text-center">
                  <p className="text-sm text-slate-300">
                    No messages yet.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Send a message below to start a conversation with support.
                  </p>
                </div>
              ) : (
                supportMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderRole === 'customer'
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[90%] sm:max-w-[75%] rounded-xl border p-3 ${
                        message.senderRole === 'customer'
                          ? 'bg-cyan-950/40 border-cyan-800/50'
                          : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-white">
                          {message.senderName}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-slate-500">
                          {message.senderRole === 'admin' ? 'Support' : 'You'}
                        </span>
                      </div>

                      <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">
                        {message.text}
                      </p>

                      {message.attachments?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment, index) => (
                            <a
                              key={`${message.id}-attachment-${index}`}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-xs text-cyan-300 underline break-all"
                            >
                              {attachment.name}
                            </a>
                          ))}
                        </div>
                      )}

                      <p className="text-[10px] text-slate-500 mt-2">
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {supportError && (
              <div className="mb-3 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-xs text-red-300">
                {supportError}
              </div>
            )}

            <form onSubmit={handleSendSupportMessage} className="space-y-3">
              <label
                htmlFor="shipment-support-message"
                className="block text-xs font-medium text-slate-300"
              >
                Your message
              </label>

              <textarea
                id="shipment-support-message"
                value={supportText}
                onChange={(e) => setSupportText(e.target.value)}
                placeholder="Type your message about this shipment..."
                rows={3}
                maxLength={5000}
                disabled={supportSending}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 disabled:opacity-60"
              />

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[11px] text-slate-500">
                  Maximum 5,000 characters
                </span>

                <button
                  type="submit"
                  disabled={supportSending || !supportText.trim()}
                  className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-sm font-bold transition-colors"
                >
                  {supportSending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
        </div>
      )}
    </div>

  );
};
