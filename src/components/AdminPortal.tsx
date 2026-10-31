import React, { useState, useEffect } from 'react';
import {
ShieldAlert,
Lock,
Key,
Mail,
User as UserIcon,
CheckCircle2,
AlertTriangle,
PauseCircle,
PlayCircle,
Truck,
LogOut,
RefreshCw,
PlusCircle,
FileText,
Layers,
ExternalLink,
ChevronDown,
History,
Eye,
X,
MessageCircle,
Send,
Paperclip,
UserRound,
LoaderCircle,
Globe2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import ShipmentGlobe from './ShipmentGlobe';
import type {
  SupportMessage,
  RecipientSupportMessage
} from '../services/api.js';
import { Shipment, BookingStatus, PaymentStatus, MovementStatus, HoldShipmentInput, AddMilestoneInput } from '../types/shipment.js';
import { calculateShipmentProgress } from '../utils/shipmentProgress';

interface AdminPortalProps {
  onExitToCustomerView: () => void;
  onOpenBookModal: () => void;
  onTrackShipment: (trackingNumber: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onExitToCustomerView,
  onOpenBookModal,
  onTrackShipment,
}) => {
  const { adminUser, isAdminAuthenticated, adminLogin, adminLogout, isAdminInitialized, refreshAdminStatus } = useAuth();

  // Login / Setup Form State
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [setupSecret, setSetupSecret] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Admin View
 const [adminTab, setAdminTab] = useState<
  'shipments' | 'audit' | 'security' | 'overview' | 'communications'
>('shipments');

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedGlobeShipment, setSelectedGlobeShipment] =
  useState<Shipment | null>(null);
  // Communication Desk
const [selectedCommunicationShipmentId, setSelectedCommunicationShipmentId] =
  useState('');

const [communicationSide, setCommunicationSide] =
  useState<'sender' | 'recipient'>('sender');

const [communicationMessages, setCommunicationMessages] =
  useState<(SupportMessage | RecipientSupportMessage)[]>([]);

const [communicationLoading, setCommunicationLoading] = useState(false);
const [communicationReply, setCommunicationReply] = useState('');
const [communicationFile, setCommunicationFile] = useState<File | null>(null);
const [communicationSending, setCommunicationSending] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [shipmentStats, setShipmentStats] = useState<{
  totalShipments: number;
  awaitingReview: number;
  inTransit: number;
  onHold: number;
  delivered: number;
  awaitingPayment: number;
  totalWeightKg: number;
} | null>(null);
  const [fleetLoading, setFleetLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Hold Modal State
  const [holdTargetShipment, setHoldTargetShipment] = useState<Shipment | null>(null);
  const [holdReason, setHoldReason] = useState<string>('Customs inspection documentation hold.');
  const [customerExplanation, setCustomerExplanation] = useState<string>('Customs clearance inspection in progress at regional hub.');

  // Resume Modal State
  const [resumeTargetShipment, setResumeTargetShipment] = useState<Shipment | null>(null);
  const [revisedEstimate, setRevisedEstimate] = useState<string>('');
  const [resumptionNote, setResumptionNote] = useState<string>('Clearance granted. Scheduled on next dispatch transport line.');

  // Checkpoint Modal State
  const [checkpointTarget, setCheckpointTarget] = useState<Shipment | null>(null);
  const [checkpointTitle, setCheckpointTitle] = useState<string>('Arrived at Transit Hub');
  const [checkpointLocation, setCheckpointLocation] = useState<string>('Regional Intermodal Hub');
  const [checkpointCity, setCheckpointCity] = useState<string>('');
  const [checkpointCountry, setCheckpointCountry] = useState<string>('');
  const [checkpointNotes, setCheckpointNotes] = useState<string>('Barcode verified. Security seal intact.');
  const [checkpointStatus, setCheckpointStatus] = useState<MovementStatus>('In Transit');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState<boolean>(false);

 const loadAdminData = async () => {
  if (!isAdminAuthenticated) return;
  setFleetLoading(true);

  try {
    const shipData = await api.shipments.getAll();
    setShipments(shipData.shipments);

    const logsData = await api.shipments.getAuditLogs();
    setAuditLogs(logsData.logs || []);

    const statsData = await api.getStats();
    setShipmentStats(statsData.stats || null);
  } catch (err: any) {
    setToastMessage({
      text: err.message || 'Failed to load fleet data',
      type: 'error',
    });
  } finally {
    setFleetLoading(false);
  }
};
// Load the selected shipment's sender or recipient conversation
const loadCommunicationMessages = async (
  shipmentId: string,
  side: 'sender' | 'recipient'
) => {
  if (!shipmentId) return;

  setCommunicationLoading(true);
  setCommunicationMessages([]);

  try {
    if (side === 'sender') {
      const result = await api.support.getAdminSenderMessages(shipmentId);
      setCommunicationMessages(result.messages);
    } else {
      const result = await api.support.getAdminRecipientMessages(shipmentId);
      setCommunicationMessages(result.messages);
    }
  } catch (error) {
    console.error('Failed to load communication messages:', error);
    alert(
      error instanceof Error
        ? error.message
        : 'Failed to load conversation.'
    );
  } finally {
    setCommunicationLoading(false);
  }
};

// Send an administrator reply to the selected person
const handleSendCommunicationReply = async () => {
  const shipmentId = selectedCommunicationShipmentId;
  const text = communicationReply.trim();

  if (!shipmentId || (!text && !communicationFile)) {
    alert('Enter a message or select an attachment.');
    return;
  }

  setCommunicationSending(true);

  try {
    let attachments: {
      name: string;
      url: string;
      type: string;
      size: number;
    }[] = [];

    if (communicationFile) {
      const uploadResult = await api.support.uploadAdminAttachment(
        shipmentId,
        communicationFile
      );

      attachments = [uploadResult.attachment];
    }

    if (communicationSide === 'sender') {
      await api.support.sendAdminSenderMessage(
        shipmentId,
        text,
        attachments
      );
    } else {
      await api.support.sendAdminRecipientMessage(
        shipmentId,
        text,
        attachments
      );
    }

    setCommunicationReply('');
    setCommunicationFile(null);

    await loadCommunicationMessages(
      shipmentId,
      communicationSide
    );
  } catch (error) {
    console.error('Failed to send communication reply:', error);

    alert(
      error instanceof Error
        ? error.message
        : 'Failed to send reply.'
    );
  } finally {
    setCommunicationSending(false);
  }
};
  useEffect(() => {
    if (isAdminAuthenticated) {
      loadAdminData();
    }
  }, [isAdminAuthenticated]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Admin Login Submission
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      await adminLogin(email, password);
    } catch (err: any) {
      setLoginError(err.message || 'Administrator authentication failed. Access denied.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Initial Admin Setup Submission
  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await api.auth.setupAdmin({
        name,
        email,
        password,
        setupSecret,
      });
      localStorage.setItem('freightplus_admin_token', res.token);
      await refreshAdminStatus();
      await adminLogin(email, password);
    } catch (err: any) {
      setLoginError(err.message || 'Administrator setup failed. Please verify your setup secret.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Actions
  const handleUpdateBookingStatus = async (shipmentId: string, status: BookingStatus) => {
    try {
      await api.shipments.updateBookingStatus(shipmentId, status);
      showToast(`Booking status updated to "${status}".`);
      loadAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdatePaymentStatus = async (shipmentId: string, status: PaymentStatus) => {
    try {
      await api.shipments.updatePaymentStatus(shipmentId, status);
      showToast(`Payment status updated to "${status}".`);
      loadAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAuthorizeDispatch = async (shipmentId: string) => {
    try {
      await api.shipments.authorizeDispatch(shipmentId);
      showToast('Shipment authorized for dispatch! Movement status is now In Transit.');
      loadAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdTargetShipment) return;
    try {
      await api.shipments.placeHold(holdTargetShipment.id, holdReason, customerExplanation);
      showToast(`Shipment ${holdTargetShipment.trackingNumber} placed On Hold.`);
      setHoldTargetShipment(null);
      loadAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeTargetShipment) return;
    try {
      await api.shipments.resumeHold(resumeTargetShipment.id, revisedEstimate || undefined, resumptionNote);
      showToast(`Shipment ${resumeTargetShipment.trackingNumber} transit resumed.`);
      setResumeTargetShipment(null);
      loadAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointTarget) return;
    try {
      await api.shipments.addMilestone(checkpointTarget.id, {
        status: checkpointStatus,
        title: checkpointTitle,
        location: checkpointLocation,
        city: checkpointCity || checkpointTarget.destinationHub.city,
        country: checkpointCountry || checkpointTarget.destinationHub.country,
        notes: checkpointNotes,
      });
      showToast(`Checkpoint logged: ${checkpointTitle}`);
      setCheckpointTarget(null);
      loadAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeLoading(true);
    try {
      await api.auth.changeAdminPassword(currentPassword, newPassword);
      showToast('Administrator password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Screen 1: Administrator Authentication & One-Time Setup (if unauthenticated)
  // --------------------------------------------------------------------------
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-4 text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Freight Plus Command Gateway
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Authorized Administrator & Dispatch Officer Clearance
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-950/70 border border-red-800 rounded-lg text-xs text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {!isAdminInitialized ? (
            /* First-Time Administrator Provisioning Form */
            <form onSubmit={handleInitialSetup} className="space-y-3.5 text-xs">
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-[11px] text-amber-300">
                <span className="font-bold block mb-1">One-Time Administrator Setup</span>
                No administrator account exists yet. Enter your configured <code>ADMIN_SETUP_SECRET</code> from your <code>.env</code> file to initialize the master account.
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Setup Secret *</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={setupSecret}
                    onChange={(e) => setSetupSecret(e.target.value)}
                    placeholder="Enter ADMIN_SETUP_SECRET from .env"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Administrator Name *</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Chief Dispatcher"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Administrator Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@yourcompany.com"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Master Password * (min 8 chars)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={8}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition-colors shadow-sm"
              >
                {loginLoading ? 'Provisioning...' : 'Initialize Master Administrator'}
              </button>
            </form>
          ) : (
            /* Standard Administrator Login Form */
            <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Administrator Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@yourcompany.com"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Security Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition-colors shadow-sm"
              >
                {loginLoading ? 'Verifying Clearance...' : 'Authenticate Clearance'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <button
              onClick={onExitToCustomerView}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              ← Return to Customer Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Screen 2: Protected Administrator Control Dashboard
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Administrator Top Bar */}
      <header className="sticky top-0 z-40 border-b border-amber-900/50 bg-slate-950/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block">
                Freight Plus Dispatch Command
              </span>
              <span className="text-[10px] uppercase font-mono text-amber-400 tracking-wider">
                ADMIN CLEARANCE: {adminUser?.email}
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2">
            <button
  onClick={() => setAdminTab('overview')}
  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
    adminTab === 'overview'
      ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
      : 'text-slate-400 hover:text-white'
  }`}
>
  Overview
</button>
            <button
              onClick={() => setAdminTab('shipments')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                adminTab === 'shipments'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Master Fleet ({shipments.length})
            </button>
            <button
onClick={() => setAdminTab('communications')}
className={"px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${ adminTab === 'communications' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' : 'text-slate-400 hover:text-white' }"}
>
Communication Desk
</button>
            <button
              onClick={() => setAdminTab('audit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                adminTab === 'audit'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Audit Trail
            </button>
            <button
              onClick={() => setAdminTab('security')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                adminTab === 'security'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Security Settings
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onExitToCustomerView}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 transition-colors"
            >
              Customer Site
            </button>
            <button
              onClick={adminLogout}
              className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {toastMessage && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                : 'bg-red-950/80 border-red-800 text-red-300'
            }`}
          >
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}
        {/* TAB 0: Overview Dashboard */}
{adminTab === 'overview' && (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-white">
          Operations Overview
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Shipment activity and cargo statistics.
        </p>
      </div>

      <button
        onClick={loadAdminData}
        disabled={fleetLoading}
        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs flex items-center gap-2"
      >
        <RefreshCw
          className={`w-4 h-4 ${fleetLoading ? 'animate-spin' : ''}`}
        />
        Refresh
      </button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        {
          label: 'Total Shipments',
          value: shipmentStats?.totalShipments ?? 0,
          color: 'text-white',
        },
        {
          label: 'Awaiting Review',
          value: shipmentStats?.awaitingReview ?? 0,
          color: 'text-amber-300',
        },
        {
          label: 'In Transit',
          value: shipmentStats?.inTransit ?? 0,
          color: 'text-cyan-300',
        },
        {
          label: 'On Hold',
          value: shipmentStats?.onHold ?? 0,
          color: 'text-red-300',
        },
        {
          label: 'Delivered',
          value: shipmentStats?.delivered ?? 0,
          color: 'text-emerald-300',
        },
        {
          label: 'Awaiting Payment',
          value: shipmentStats?.awaitingPayment ?? 0,
          color: 'text-orange-300',
        },
        {
          label: 'Total Cargo Weight',
          value: `${(shipmentStats?.totalWeightKg ?? 0).toLocaleString()} kg`,
          color: 'text-violet-300',
        },
      ].map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <p className="text-xs text-slate-400">{stat.label}</p>
          <p className={`text-2xl font-bold mt-3 ${stat.color}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>

     <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <h3 className="text-sm font-bold text-white mb-4">
        Shipment Status Distribution
      </h3>

      {[
        {
          label: 'In Transit',
          value: shipmentStats?.inTransit ?? 0,
          color: 'bg-cyan-400',
        },
        {
          label: 'Awaiting Review',
          value: shipmentStats?.awaitingReview ?? 0,
          color: 'bg-amber-400',
        },
        {
          label: 'On Hold',
          value: shipmentStats?.onHold ?? 0,
          color: 'bg-red-400',
        },
        {
          label: 'Delivered',
          value: shipmentStats?.delivered ?? 0,
          color: 'bg-emerald-400',
        },
      ].map((stat) => {
        const total = shipmentStats?.totalShipments ?? 0;
        const percentage =
          total > 0
            ? Math.min(100, (stat.value / total) * 100)
            : 0;

        return (
          <div key={stat.label} className="mb-4 last:mb-0">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-300">{stat.label}</span>
              <span className="text-slate-400">
                {stat.value} ({percentage.toFixed(0)}%)
              </span>
            </div>

            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${stat.color}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}

{/* COMMUNICATION DESK */}
{adminTab === 'communications' && (
  <div className="space-y-4">
    <div>
      <h2 className="text-lg font-bold text-white">
        Shipment Communication Desk
      </h2>
      <p className="text-xs text-slate-400">
        Communicate privately with a shipment's sender or recipient.
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Shipment and contact selection */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-bold text-white mb-3">
          Select a Shipment
        </h3>

        <div className="space-y-2">
          {shipments.length === 0 ? (
            <p className="text-xs text-slate-400">
              No shipments are available.
            </p>
          ) : (
            shipments.map((shp) => (
              <div
                key={shp.id}
                className={`rounded-lg border p-3 ${
                  selectedCommunicationShipmentId === shp.id
                    ? 'border-amber-500 bg-amber-950/20'
                    : 'border-slate-800 bg-slate-950/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCommunicationShipmentId(shp.id);
                    setCommunicationMessages([]);
                    setCommunicationSide('sender');
                    void loadCommunicationMessages(shp.id, 'sender');
                  }}
                  className="w-full text-left"
                >
                  <span className="block text-xs font-bold text-cyan-300">
                    {shp.trackingNumber}
                  </span>
                  <span className="block text-xs text-slate-300 mt-1">
                    {shp.originHub.city} → {shp.destinationHub.city}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCommunicationShipmentId(shp.id);
                      setCommunicationSide('sender');
                      setCommunicationMessages([]);
                      void loadCommunicationMessages(shp.id, 'sender');
                    }}
                    className={`rounded-md px-2 py-2 text-xs ${
                      selectedCommunicationShipmentId === shp.id &&
                      communicationSide === 'sender'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Sender
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCommunicationShipmentId(shp.id);
                      setCommunicationSide('recipient');
                      setCommunicationMessages([]);
                      void loadCommunicationMessages(shp.id, 'recipient');
                    }}
                    className={`rounded-md px-2 py-2 text-xs ${
                      selectedCommunicationShipmentId === shp.id &&
                      communicationSide === 'recipient'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Recipient
                  </button>
                </div>

                <div className="mt-3 text-xs text-slate-400 space-y-1">
                  <p>
                    Sender: {shp.sender.name}
                  </p>
                  <p className="break-all">
                    {shp.sender.email}
                  </p>
                  <p className="mt-2">
                    Recipient: {shp.recipient.name}
                  </p>
                  <p className="break-all">
                    {shp.recipient.email}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col min-h-[420px]">
        <div className="border-b border-slate-800 p-4">
          <h3 className="text-sm font-bold text-white">
            {communicationSide === 'sender'
              ? 'Sender Conversation'
              : 'Recipient Conversation'}
          </h3>

          <p className="text-xs text-slate-400 mt-1">
            {shipments.find(
              (shp) => shp.id === selectedCommunicationShipmentId
            )?.trackingNumber || 'Select a shipment to begin'}
          </p>
        </div>

        <div className="flex-1 p-4 space-y-3">
          {!selectedCommunicationShipmentId ? (
            <p className="text-sm text-slate-400">
              Select a shipment and contact to view messages.
            </p>
          ) : communicationLoading ? (
            <p className="text-sm text-slate-400">
              Loading conversation...
            </p>
          ) : communicationMessages.length === 0 ? (
            <p className="text-sm text-slate-400">
              No messages in this conversation yet.
            </p>
          ) : (
            communicationMessages.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg p-3 max-w-full ${
                  message.senderRole === 'admin'
                    ? 'bg-amber-950/30 border border-amber-900/50'
                    : 'bg-slate-950/60 border border-slate-800'
                }`}
              >
                <div className="flex flex-wrap justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-white">
                    {message.senderName}
                    {' · '}
                    {message.senderRole === 'admin'
                      ? 'Administrator'
                      : communicationSide === 'sender'
                        ? 'Sender'
                        : 'Recipient'}
                  </span>

                  <span className="text-[10px] text-slate-500">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>

                {message.text && (
                  <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">
                    {message.text}
                  </p>
                )}

                {message.attachments?.map((attachment, index) => (
                  <a
                    key={`${message.id}-${index}`}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block mt-2 text-xs text-cyan-300 underline break-all"
                  >
                    View attachment: {attachment.name}
                  </a>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Reply form */}
        <form
          className="border-t border-slate-800 p-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSendCommunicationReply();
          }}
        >
          <textarea
            value={communicationReply}
            onChange={(event) => setCommunicationReply(event.target.value)}
            placeholder={
              selectedCommunicationShipmentId
                ? `Write a reply to the ${
                    communicationSide === 'sender' ? 'sender' : 'recipient'
                  }...`
                : 'Select a shipment first'
            }
            disabled={
              !selectedCommunicationShipmentId ||
              communicationSending
            }
            maxLength={5000}
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                disabled={
                  !selectedCommunicationShipmentId ||
                  communicationSending
                }
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;

                  if (file && file.size > 10 * 1024 * 1024) {
                    alert('The attachment cannot exceed 10 MB.');
                    event.target.value = '';
                    setCommunicationFile(null);
                    return;
                  }

                  setCommunicationFile(file);
                }}
                className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-slate-200"
              />

              {communicationFile && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                  <span className="break-all">
                    {communicationFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCommunicationFile(null)}
                    disabled={communicationSending}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={
                !selectedCommunicationShipmentId ||
                communicationSending ||
                (!communicationReply.trim() && !communicationFile)
              }
              className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
            >
              {communicationSending ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
)}
        {/* TAB 1: Master Fleet Table */}
        {adminTab === 'shipments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Consignment Master Manifest</h2>
                <p className="text-xs text-slate-400">
                  Decoupled authority over Booking Approvals, Payment Verification, Dispatch Authorization, and Operational Holds.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadAdminData}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs transition-colors"
                  title="Reload Fleet Data"
                >
                  <RefreshCw className={`w-4 h-4 ${fleetLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onOpenBookModal}
                  className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Book Consignment</span>
                </button>
              </div>
            </div>
{/* Selected Shipment Globe */}
{selectedGlobeShipment && (
  <div className="mt-6 overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/80 shadow-lg">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
      <div>
        <h3 className="text-lg font-semibold text-white">
          Shipment Route Globe
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Tracking Number: {selectedGlobeShipment.trackingNumber}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setSelectedGlobeShipment(null)}
        className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800"
      >
        Close Globe
      </button>
    </div>

    <div className="p-4">
    <ShipmentGlobe
  shipment={selectedGlobeShipment}
  progressPercentage={calculateShipmentProgress({
    movementStatus: selectedGlobeShipment.movementStatus,
    journeyStartedAt: selectedGlobeShipment.journeyStartedAt,
    journeyDurationSeconds: selectedGlobeShipment.journeyDurationSeconds,
    journeyPausedAt: selectedGlobeShipment.journeyPausedAt,
    journeyPausedElapsedSeconds:
      selectedGlobeShipment.journeyPausedElapsedSeconds ?? 0,
    journeyProgressAtPause:
      selectedGlobeShipment.journeyProgressAtPause,
  })}
/>
    </div>
  </div>
)}

            {/* High-Density Data Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Consignment Reference</th>
                      <th className="py-3 px-4">Route & Cargo</th>
                      <th className="py-3 px-4">Booking Status</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4">Movement State</th>
                      <th className="py-3 px-4 text-right">Administrative Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-sans">
                    {shipments.map((shp) => (
                      <tr key={shp.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Reference */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-cyan-300 block">
                            {shp.trackingNumber}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 block">
                            {shp.consignmentNumber}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(shp.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        {/* Route & Cargo */}
                        <td className="py-3 px-4 max-w-[200px]">
                          <p className="font-semibold text-slate-200 truncate">
                            {shp.originHub.city} ➔ {shp.destinationHub.city}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {shp.cargoDetails.cargoType} · {shp.cargoDetails.weightKg} kg
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Payer: {shp.pricing?.payer || 'sender'} (${shp.pricing?.totalAmount || 0})
                          </p>
                        </td>

                        {/* 1. Booking Status Control */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <select
                            value={shp.bookingStatus}
                            onChange={(e) => handleUpdateBookingStatus(shp.id, e.target.value as BookingStatus)}
                            className={`text-xs font-semibold rounded px-2 py-1 border focus:outline-none ${
                              shp.bookingStatus === 'Approved'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                : shp.bookingStatus === 'Rejected'
                                ? 'bg-red-950/80 text-red-300 border-red-800'
                                : 'bg-amber-950/80 text-amber-300 border-amber-800'
                            }`}
                          >
                            <option value="Awaiting Admin Review">Awaiting Admin Review</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>

                        {/* 2. Payment Status Control */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <select
                            value={shp.paymentStatus}
                            onChange={(e) => handleUpdatePaymentStatus(shp.id, e.target.value as PaymentStatus)}
                            className={`text-xs font-semibold rounded px-2 py-1 border focus:outline-none ${
                              shp.paymentStatus === 'Paid'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                : shp.paymentStatus === 'Pending Verification'
                                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            <option value="Awaiting Payment">Awaiting Payment</option>
                            <option value="Pending Verification">Pending Verification</option>
                            <option value="Paid">Paid</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Refunded">Refunded</option>
                          </select>
                        </td>

                        {/* 3. Movement Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {shp.movementStatus === 'On Hold' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-red-950 text-red-300 border border-red-800/80 font-mono">
                              <PauseCircle className="w-3 h-3 text-red-400" />
                              ON HOLD
                            </span>
                          ) : shp.movementStatus === 'In Transit' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-mono">
                              <Truck className="w-3 h-3 text-cyan-400" />
                              IN TRANSIT
                            </span>
                          ) : shp.movementStatus === 'Delivered' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-mono">
                              DELIVERED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                              AWAITING DISPATCH
                            </span>
                          )}

                          {shp.holdDetails?.isOnHold && shp.holdDetails.customerExplanation && (
                            <p className="text-[10px] text-amber-300/80 max-w-[150px] truncate mt-0.5" title={shp.holdDetails.customerExplanation}>
                              Reason: {shp.holdDetails.customerExplanation}
                            </p>
                          )}
                        </td>

                        {/* 4. Operations Action Strip */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Authorize Dispatch (only if Awaiting Dispatch and Booking Approved) */}
                            {shp.movementStatus === 'Awaiting Dispatch' && shp.bookingStatus === 'Approved' && (
                              <button
                                onClick={() => handleAuthorizeDispatch(shp.id)}
                                className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                                title="Authorize physical departure"
                              >
                                <PlayCircle className="w-3 h-3" />
                                <span>Authorize Dispatch</span>
                              </button>
                            )}

                            {/* Place Hold / Resume Hold */}
                            {shp.movementStatus !== 'On Hold' && shp.movementStatus !== 'Delivered' && (
                              <button
                                onClick={() => setHoldTargetShipment(shp)}
                                className="px-2 py-1 bg-red-950/50 hover:bg-red-900/70 text-red-300 border border-red-800/60 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                                title="Place shipment on operational hold"
                              >
                                <PauseCircle className="w-3 h-3" />
                                <span>Hold</span>
                              </button>
                            )}

                            {shp.movementStatus === 'On Hold' && (
                              <button
                                onClick={() => setResumeTargetShipment(shp)}
                                className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/60 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                                title="Clear hold and resume transit"
                              >
                                <PlayCircle className="w-3 h-3" />
                                <span>Resume</span>
                              </button>
                            )}

                            {/* Add Checkpoint */}
                            <button
                              onClick={() => {
                                setCheckpointTarget(shp);
                                setCheckpointCity(shp.destinationHub.city);
                                setCheckpointCountry(shp.destinationHub.country);
                              }}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-medium transition-colors"
                              title="Add checkpoint milestone"
                            >
                              + Checkpoint
                            </button>

                            {/* Track Link View */}
                            <button
                              onClick={() => onTrackShipment(shp.trackingNumber)}
                              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                              title="View tracking page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
  onClick={() => setSelectedGlobeShipment(shp)}
  className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors"
  title="View shipment route on globe"
>
  <Globe2 className="h-3.5 w-3.5" />
  View Globe
</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Audit Logs */}
        {adminTab === 'audit' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              <span>Administrative Actions & Audit Trail</span>
            </h2>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 divide-y divide-slate-800 text-xs">
              {auditLogs.length === 0 ? (
                <p className="text-slate-500 py-4 text-center">No audit logs recorded yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-4">
                    <div>
                      <span className="font-mono font-bold text-amber-300 mr-2">{log.action}</span>
                      <span className="text-slate-400">Target: {log.targetId}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        By {log.adminEmail} · Details: {JSON.stringify(log.details || {})}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Security & Password Settings */}
        {adminTab === 'security' && (
          <div className="max-w-md bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Change Administrator Password</span>
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Current Password *</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">New Master Password * (min 8 chars)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <button
                type="submit"
                disabled={passwordChangeLoading}
                className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg transition-colors"
              >
                {passwordChangeLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Place on Hold Modal */}
      {holdTargetShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <PauseCircle className="w-5 h-5" />
                <span>Place Consignment On Hold ({holdTargetShipment.trackingNumber})</span>
              </div>
              <button onClick={() => setHoldTargetShipment(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmHold} className="space-y-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Public Customer Explanation (Displayed to recipient on tracking page) *
                </label>
                <input
                  type="text"
                  value={customerExplanation}
                  onChange={(e) => setCustomerExplanation(e.target.value)}
                  placeholder="e.g. Customs documentation inspection in progress at regional hub."
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Internal Private Administrative Reason (Kept strictly private) *
                </label>
                <textarea
                  rows={3}
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="e.g. Awaiting RoHS certificate verification from supplier."
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setHoldTargetShipment(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 font-bold text-white rounded"
                >
                  Confirm Hold
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resume Hold Modal */}
      {resumeTargetShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <PlayCircle className="w-5 h-5" />
                <span>Resume Transit ({resumeTargetShipment.trackingNumber})</span>
              </div>
              <button onClick={() => setResumeTargetShipment(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmResume} className="space-y-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Revised Estimated Delivery Date (Optional)
                </label>
                <input
                  type="date"
                  value={revisedEstimate}
                  onChange={(e) => setRevisedEstimate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Resumption Milestone Note *
                </label>
                <input
                  type="text"
                  value={resumptionNote}
                  onChange={(e) => setResumptionNote(e.target.value)}
                  placeholder="e.g. Clearance documents confirmed. Transferred to aircraft."
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResumeTargetShipment(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded"
                >
                  Resume Transit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkpoint Modal */}
      {checkpointTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-sm text-white">Append Checkpoint Milestone</span>
              <button onClick={() => setCheckpointTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCheckpoint} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Movement Status</label>
                  <select
                    value={checkpointStatus}
                    onChange={(e) => setCheckpointStatus(e.target.value as MovementStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                  >
                    <option value="Awaiting Dispatch">Awaiting Dispatch</option>
                    <option value="In Transit">In Transit</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Event Title *</label>
                  <input
                    type="text"
                    value={checkpointTitle}
                    onChange={(e) => setCheckpointTitle(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Location Facility *</label>
                <input
                  type="text"
                  value={checkpointLocation}
                  onChange={(e) => setCheckpointLocation(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">City *</label>
                  <input
                    type="text"
                    value={checkpointCity}
                    onChange={(e) => setCheckpointCity(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Country *</label>
                  <input
                    type="text"
                    value={checkpointCountry}
                    onChange={(e) => setCheckpointCountry(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Inspection / Transit Notes</label>
                <textarea
                  rows={2}
                  value={checkpointNotes}
                  onChange={(e) => setCheckpointNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCheckpointTarget(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 font-bold text-slate-950 rounded"
                >
                  Save Checkpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
