import { useEffect, useState, type FormEvent } from 'react';
import {
  Package,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  Truck,
  AlertCircle,
  LoaderCircle,
  MessageCircle,
  Send,
  Paperclip,
  X,
} from 'lucide-react';
import { api, type RecipientSupportMessage } from '../services/api';
import ShipmentGlobe from './ShipmentGlobe';
import type { Shipment } from '../types/shipment';
interface RecipientShipmentViewProps {
token: string;
}

interface RecipientShipment {
id: string;
trackingNumber: string;
consignmentNumber: string;
title: string;
bookingStatus: string;
paymentStatus: string;
movementStatus: string;
serviceType: string;
sender: {
name: string;
company?: string;
city: string;
country: string;
};
recipient: {
name: string;
company?: string;
city: string;
country: string;
};
originHub: {
name: string;
city: string;
country: string;
};
destinationHub: {
name: string;
city: string;
country: string;
};
currentLocation: {
name: string;
city: string;
country: string;
};
cargoDetails: {
pieces: number;
weightKg: number;
cargoType: string;
declaredValueUsd: number;
};
pricing: {
totalAmount: number;
currency: string;
payer: 'sender' | 'recipient';
};
holdDetails?: {
isOnHold: boolean;
customerExplanation?: string;
};
milestones: Array<{
id: string;
title: string;
status: string;
location: string;
city: string;
country: string;
timestamp: string;
completed: boolean;
}>;
estimatedDelivery: string;
dispatchDate?: string | null;
actualDelivery?: string | null;
}

interface TrackingResponse {
shipment: RecipientShipment;
progressPercentage: number;
hoursRemaining: number;
isDelivered: boolean;
isOnHold: boolean;
}

function statusColor(status: string): string {
if (status === 'Paid' || status === 'Approved' || status === 'Delivered') {
return 'bg-green-100 text-green-800';
}

if (status === 'Rejected' || status === 'On Hold') {
return 'bg-red-100 text-red-800';
}

if (status === 'In Transit' || status === 'Out for Delivery') {
return 'bg-blue-100 text-blue-800';
}

return 'bg-amber-100 text-amber-800';
}

function formatDate(value?: string | null): string {
if (!value) return 'Not available';

const date = new Date(value);

if (Number.isNaN(date.getTime())) return 'Not available';

return date.toLocaleDateString(undefined, {
day: 'numeric',
month: 'long',
year: 'numeric',
});
}

export default function RecipientShipmentView({
token,
}: RecipientShipmentViewProps) {
const [data, setData] = useState<TrackingResponse | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

const [messages, setMessages] = useState<RecipientSupportMessage[]>([]);
const [messageText, setMessageText] = useState('');
const [messagesLoading, setMessagesLoading] = useState(true);
const [messageSending, setMessageSending] = useState(false);
const [messageError, setMessageError] = useState('');
const [selectedFile, setSelectedFile] = useState<File | null>(null);

useEffect(() => {
  let active = true;

  async function loadMessages() {
    setMessagesLoading(true);
    setMessageError('');

    try {
      const result = await api.support.getRecipientMessages(token);

      if (active) {
        setMessages(result.messages);
      }
    } catch (err: unknown) {
      if (active) {
        setMessageError(
          err instanceof Error
            ? err.message
            : 'Unable to load your messages.'
        );
      }
    } finally {
      if (active) {
        setMessagesLoading(false);
      }
    }
  }

  if (token.trim()) {
    void loadMessages();
  } else {
    setMessagesLoading(false);
    setMessageError('The recipient access link is invalid.');
  }

  return () => {
    active = false;
  };
}, [token]);


  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const text = messageText.trim();

  if ((!text && !selectedFile) || messageSending) return;

  setMessageSending(true);
  setMessageError('');

  try {
    let attachments: {
      name: string;
      url: string;
      type: string;
      size: number;
    }[] = [];

    if (selectedFile) {
      const uploadResult = await api.support.uploadRecipientAttachment(
        token,
        selectedFile
      );

      attachments = [uploadResult.attachment];
    }

    const result = await api.support.sendRecipientMessage(
      token,
      text,
      attachments
    );

    setMessages((previous) => [...previous, result.message]);
    setMessageText('');
    setSelectedFile(null);
  } catch (err: unknown) {
    setMessageError(
      err instanceof Error
        ? err.message
        : 'Unable to send your message. Please try again.'
    );
  } finally {
    setMessageSending(false);
  }
}

useEffect(() => {
  let active = true;
async function loadShipment() {
  setLoading(true);
  setError('');
  setData(null);

  if (!token.trim()) {
    setError('This shipment link is missing its access token.');
    setLoading(false);
    return;
  }

  try {
    const result = await api.track.getByTrackingNumber(token);

    if (active) {
      setData(result as TrackingResponse);
    }
  } catch {
    if (active) {
      setError(
        'We could not find this shipment. Please check that you have the complete, correct link.'
      );
    }
  } finally {
    if (active) setLoading(false);
  }
}

void loadShipment();

return () => {
  active = false;
};

}, [token]);

if (loading) {
return (
<main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
<div className="text-center">
<LoaderCircle className="h-10 w-10 animate-spin text-blue-700 mx-auto mb-4" />
<p className="text-slate-600">Loading your shipment details...</p>
</div>
</main>
);
}

if (error || !data) {
return (
<main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
<section className="max-w-md w-full rounded-2xl bg-white border border-slate-200 p-8 text-center">
<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
<h1 className="text-xl font-bold text-slate-900 mb-2">
Shipment unavailable
</h1>
<p className="text-slate-600">
{error || 'Shipment information could not be loaded.'}
</p>
</section>
</main>
);
}

const shipment = data.shipment;

return (
<main className="min-h-screen bg-slate-50 text-slate-900">
<header className="bg-slate-950 text-white">
<div className="max-w-5xl mx-auto px-5 py-6">
<div className="flex items-center gap-3">
<div className="rounded-xl bg-blue-600 p-3">
<Package className="h-6 w-6" />
</div>
<div>
<p className="text-lg font-bold">FreightPulse</p>
<p className="text-sm text-slate-300">
Shipment Recipient Portal
</p>
</div>
</div>
</div>
</header>

  <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">
    <section className="rounded-2xl bg-white border border-slate-200 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Tracking number</p>
          <h1 className="text-2xl font-bold mt-1">
            {shipment.trackingNumber}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Consignment: {shipment.consignmentNumber}
          </p>
          <h2 className="font-semibold mt-4">{shipment.title}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {shipment.serviceType}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-2 text-sm font-semibold ${statusColor(
            shipment.movementStatus
          )}`}
        >
          {shipment.movementStatus}
        </span>
      </div>

      <div className="mt-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-500">Delivery progress</span>
          <span className="font-semibold">
            {data.progressPercentage}%
          </span>
        </div>

        <div
          className="h-3 rounded-full bg-slate-100 overflow-hidden"
          role="progressbar"
          aria-valuenow={data.progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Shipment delivery progress"
        >
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{
              width: `${Math.max(
                0,
                Math.min(100, data.progressPercentage)
              )}%`,
            }}
          />
        </div>
      </div>

      {data.isOnHold && (
        <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <p className="font-semibold text-amber-900">
            Shipment temporarily on hold
          </p>
          <p className="text-sm text-amber-800 mt-1">
            {shipment.holdDetails?.customerExplanation ||
              'Please contact the support team for further information.'}
          </p>
        </div>
      )}
    </section>

{/* Interactive 3D Shipment Tracking Globe */}
    <ShipmentGlobe
      shipment={shipment as unknown as Shipment}
      progressPercentage={data.progressPercentage}
    />
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-2xl bg-white border border-slate-200 p-6">
        <h2 className="font-bold flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-blue-700" />
          Sender
        </h2>
        <p className="font-semibold">{shipment.sender.name}</p>
        {shipment.sender.company && (
          <p className="text-sm text-slate-600">
            {shipment.sender.company}
          </p>
        )}
        <p className="text-sm text-slate-600 mt-2">
          {shipment.sender.city}, {shipment.sender.country}
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6">
        <h2 className="font-bold flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-blue-700" />
          Recipient
        </h2>
        <p className="font-semibold">{shipment.recipient.name}</p>
        {shipment.recipient.company && (
          <p className="text-sm text-slate-600">
            {shipment.recipient.company}
          </p>
        )}
        <p className="text-sm text-slate-600 mt-2">
          {shipment.recipient.city}, {shipment.recipient.country}
        </p>
      </div>
    </section>

    <section className="rounded-2xl bg-white border border-slate-200 p-6">
      <h2 className="font-bold flex items-center gap-2 mb-5">
        <Package className="h-5 w-5 text-blue-700" />
        Shipment details
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div>
          <p className="text-sm text-slate-500">Goods</p>
          <p className="font-semibold mt-1">
            {shipment.cargoDetails.cargoType}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Weight</p>
          <p className="font-semibold mt-1">
            {shipment.cargoDetails.weightKg} kg
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Packages</p>
          <p className="font-semibold mt-1">
            {shipment.cargoDetails.pieces}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Declared value</p>
          <p className="font-semibold mt-1">
            ${shipment.cargoDetails.declaredValueUsd.toLocaleString()}
          </p>
        </div>
      </div>
    </section>

    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-2xl bg-white border border-slate-200 p-6">
        <h2 className="font-bold flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-blue-700" />
          Payment
        </h2>

        <p className="text-sm text-slate-500">Shipping charge</p>
        <p className="text-2xl font-bold mt-1">
          {shipment.pricing.currency}{' '}
          {shipment.pricing.totalAmount.toLocaleString()}
        </p>

        <div className="mt-4">
          <p className="text-sm text-slate-500">Payment status</p>
          <span
            className={`inline-block mt-2 rounded-full px-3 py-1 text-sm font-semibold ${statusColor(
              shipment.paymentStatus
            )}`}
          >
            {shipment.paymentStatus}
          </span>
        </div>

        <p className="text-sm text-slate-500 mt-4">
          Payer: {shipment.pricing.payer}
        </p>

        <p className="text-sm text-slate-500 mt-2">
          Booking status: {shipment.bookingStatus}
        </p>

        <p className="text-sm text-slate-500 mt-2">
          Payment verification is handled by FreightPulse administration.
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6">
        <h2 className="font-bold flex items-center gap-2 mb-4">
          <Truck className="h-5 w-5 text-blue-700" />
          Delivery route
        </h2>

        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Origin
            </p>
            <p className="font-semibold mt-1">
              {shipment.originHub.name}
            </p>
            <p className="text-sm text-slate-600">
              {shipment.originHub.city}, {shipment.originHub.country}
            </p>
          </div>

          <div className="border-l-2 border-dashed border-slate-300 ml-1 pl-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Current location
            </p>
            <p className="font-semibold mt-1">
              {shipment.currentLocation.name}
            </p>
            <p className="text-sm text-slate-600">
              {shipment.currentLocation.city},{' '}
              {shipment.currentLocation.country}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Destination
            </p>
            <p className="font-semibold mt-1">
              {shipment.destinationHub.name}
            </p>
            <p className="text-sm text-slate-600">
              {shipment.destinationHub.city},{' '}
              {shipment.destinationHub.country}
            </p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Estimated delivery
          </p>
          <p className="font-semibold mt-1">
            {formatDate(shipment.estimatedDelivery)}
          </p>

          {data.isDelivered && (
            <p className="mt-3 text-sm font-semibold text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Delivered
            </p>
          )}

          {!data.isDelivered && (
            <p className="mt-3 text-sm text-slate-500 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {data.hoursRemaining > 0
                ? `Approximately ${data.hoursRemaining} hours remaining`
                : 'Estimated delivery time has passed'}
            </p>
          )}
        </div>
      </div>
    </section>

    <section className="rounded-2xl bg-white border border-slate-200 p-6">
      <h2 className="font-bold mb-5">Tracking history</h2>

      {shipment.milestones.length === 0 ? (
        <p className="text-sm text-slate-500">
          Tracking updates will appear here as the shipment progresses.
        </p>
      ) : (
        <ol className="space-y-5">
          {shipment.milestones.map((milestone) => (
            <li key={milestone.id} className="flex gap-3">
              <div className="mt-1 h-3 w-3 rounded-full bg-blue-600 shrink-0" />
              <div>
                <p className="font-semibold">{milestone.title}</p>
                <p className="text-sm text-slate-600">
                  {milestone.location}, {milestone.city},{' '}
                  {milestone.country}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatDate(milestone.timestamp)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>

   <section className="rounded-2xl bg-white border border-slate-200 p-6">
  <div className="flex items-center gap-3 mb-5">
    <div className="rounded-xl bg-blue-100 p-3">
      <MessageCircle className="h-6 w-6 text-blue-700" />
    </div>

    <div>
      <h2 className="text-lg font-bold text-slate-900">
        Shipment Support
      </h2>
      <p className="text-sm text-slate-500">
        Message our administration team about this shipment.
      </p>
    </div>
  </div>

  <div className="space-y-4 mb-5">
    {messagesLoading ? (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading your messages...
      </div>
    ) : !messages || messages.length === 0 ? (
      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        No messages yet. Send a message below to contact our team.
      </p>
    ) : (
      messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.senderRole === 'recipient'
              ? 'justify-end'
              : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[90%] rounded-2xl p-4 ${
              message.senderRole === 'recipient'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-900'
            }`}
          >
            <p className="text-xs font-semibold mb-1">
              {message.senderRole === 'admin'
                ? 'FreightPulse Support'
                : 'You'}
            </p>

           {message.text && (
  <p className="text-sm whitespace-pre-wrap break-words">
    {message.text}
  </p>
)}

{message.attachments?.map((attachment, index) => (
  <div
    key={`${message.id}-${index}`}
    className="mt-2 max-w-full"
  >
    {attachment.type?.startsWith('image/') ? (
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <img
            src={attachment.url}
            alt={attachment.name || 'Image attachment'}
            className="block max-h-80 max-w-full object-contain"
            loading="lazy"
          />
        </a>

        <div className="px-3 py-2 text-xs text-gray-500">
          {attachment.name}
          {' · '}
          {(attachment.size / (1024 * 1024)).toFixed(2)} MB
        </div>
      </div>
    ) : (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 hover:bg-gray-50"
      >
        <Paperclip className="h-5 w-5 shrink-0" />

        <div className="min-w-0">
          <p className="break-words text-sm font-medium">
            {attachment.name}
          </p>

          <p className="text-xs text-gray-500">
            {attachment.type || 'Document'}
            {' · '}
            {(attachment.size / (1024 * 1024)).toFixed(2)} MB
          </p>

          <p className="mt-1 text-xs text-blue-600">
            Open attachment
          </p>
        </div>
      </a>
    )}
  </div>
))}

            <p
              className={`text-xs mt-2 ${
                message.senderRole === 'recipient'
                  ? 'text-blue-100'
                  : 'text-slate-500'
              }`}
            >
              {new Date(message.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))
    )}
  </div>

  {messageError && (
    <div
      role="alert"
      className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700"
    >
      {messageError}
    </div>
  )}

 <form onSubmit={handleSendMessage} className="space-y-3">
  <label
    htmlFor="recipient-support-message"
    className="block text-sm font-medium text-slate-700"
  >
    Your message
  </label>

  <textarea
    id="recipient-support-message"
    value={messageText}
    onChange={(event) => setMessageText(event.target.value)}
    placeholder="Type your question about this shipment..."
    rows={4}
    maxLength={5000}
    disabled={messageSending}
    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
  />

  {selectedFile && (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">
          Attachment selected
        </p>
        <p className="truncate text-xs text-slate-600">
          {selectedFile.name}
        </p>
        <p className="text-xs text-slate-500">
          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
        </p>
      </div>

      <button
        type="button"
        onClick={() => setSelectedFile(null)}
        disabled={messageSending}
        aria-label="Remove selected attachment"
        className="rounded-lg p-2 text-slate-600 hover:bg-blue-100 disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )}

  <div className="flex flex-wrap items-center justify-between gap-3">
    <label
      htmlFor="recipient-support-attachment"
      className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 ${
        messageSending ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <Paperclip className="h-4 w-4" />
      Attach image or PDF
    </label>

    <input
      id="recipient-support-attachment"
      type="file"
      accept="image/jpeg,image/png,image/webp,application/pdf"
      className="hidden"
      disabled={messageSending}
      onChange={(event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
        ];

        if (!allowedTypes.includes(file.type)) {
          setMessageError('Please select a JPG, PNG, WebP, or PDF file.');
          event.target.value = '';
          return;
        }

        if (file.size > 10 * 1024 * 1024) {
          setMessageError('The attachment must be 10 MB or smaller.');
          event.target.value = '';
          return;
        }

        setMessageError('');
        setSelectedFile(file);
      }}
    />

    <span className="text-xs text-slate-500">
      Maximum size: 10 MB
    </span>
  </div>

  <div className="flex items-center justify-between gap-3">
    <span className="text-xs text-slate-500">
      {messageText.length}/5000 characters
    </span>

    <button
      type="submit"
      disabled={(!messageText.trim() && !selectedFile) || messageSending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {messageSending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}

      {messageSending ? 'Sending...' : 'Send message'}
    </button>
  </div>
</form>
</section>

    <footer className="text-center text-xs text-slate-500 pb-6">
      FreightPulse · Shipment Recipient Portal
    </footer>
  </div>
</main>

);
}