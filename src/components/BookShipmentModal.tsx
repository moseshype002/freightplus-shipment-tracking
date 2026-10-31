import React, { useState } from 'react';
import { X, Package, Plane, Ship, Thermometer, Truck, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { CreateShipmentInput, ServiceType, Shipment } from '../types/shipment.js';
import { api } from '../services/api.js';

interface BookShipmentModalProps {
  onClose: () => void;
  onSuccess: (newShipment: Shipment) => void;
}

const SERVICE_RATES: Record<ServiceType, { perKg: number; base: number; days: number }> = {
  'Air Express': { perKg: 8.5, base: 120, days: 2 },
  'Standard Freight': { perKg: 3.2, base: 65, days: 5 },
  'Ocean Cargo': { perKg: 1.4, base: 180, days: 16 },
  'Cold Chain Express': { perKg: 13.5, base: 250, days: 3 },
};

export const BookShipmentModal: React.FC<BookShipmentModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [serviceType, setServiceType] = useState<ServiceType>('Air Express');
  const [title, setTitle] = useState<string>('High-Precision Industrial Instruments');

  // Sender / Shipper
  const [senderName, setSenderName] = useState<string>('Marcus Vance');
  const [senderCompany, setSenderCompany] = useState<string>('Heidelberg Precision Labs');
  const [senderStreet, setSenderStreet] = useState<string>('Industriestrasse 42');
  const [senderCity, setSenderCity] = useState<string>('Frankfurt');
  const [senderPostal, setSenderPostal] = useState<string>('60549');
  const [senderCountry, setSenderCountry] = useState<string>('Germany');
  const [senderPhone, setSenderPhone] = useState<string>('+49 69 5050 11');
  const [senderEmail, setSenderEmail] = useState<string>('logistics@heidelberg-labs.de');

  // Recipient / Consignee
  const [recipName, setRecipName] = useState<string>('Elena Rostova');
  const [recipCompany, setRecipCompany] = useState<string>('Acme Global Aerospace');
  const [recipStreet, setRecipStreet] = useState<string>('750 3rd Avenue, Fl 18');
  const [recipCity, setRecipCity] = useState<string>('New York');
  const [recipPostal, setRecipPostal] = useState<string>('10017');
  const [recipCountry, setRecipCountry] = useState<string>('United States');
  const [recipPhone, setRecipPhone] = useState<string>('+1 (555) 234-9000');
  const [recipEmail, setRecipEmail] = useState<string>('elena@acme-aerospace.com');

  // Cargo Specs
  const [cargoType, setCargoType] = useState<string>('Electronic Sensors & Transducers');
  const [weightKg, setWeightKg] = useState<number>(85.0);
  const [pieces, setPieces] = useState<number>(3);
  const [declaredValueUsd, setDeclaredValueUsd] = useState<number>(45000);
  const [dangerousGoods, setDangerousGoods] = useState<boolean>(false);
  const [tempControlled, setTempControlled] = useState<boolean>(false);
  const [tempRange, setTempRange] = useState<string>('2°C - 8°C');
  const [notes, setNotes] = useState<string>('Handle with care. Optoelectronic components.');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Live Rate Calculation
  const rateConfig = SERVICE_RATES[serviceType];
  const calculatedCost = Math.round(rateConfig.base + weightKg * rateConfig.perKg);
  const estimatedDate = new Date(Date.now() + rateConfig.days * 24 * 3600 * 1000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const input: CreateShipmentInput = {
        title,
        serviceType,
        sender: {
          name: senderName,
          company: senderCompany,
          street: senderStreet,
          city: senderCity,
          postalCode: senderPostal,
          country: senderCountry,
          phone: senderPhone,
          email: senderEmail,
        },
        recipient: {
          name: recipName,
          company: recipCompany,
          street: recipStreet,
          city: recipCity,
          postalCode: recipPostal,
          country: recipCountry,
          phone: recipPhone,
          email: recipEmail,
        },
        cargoDetails: {
          cargoType,
          weightKg: Number(weightKg),
          pieces: Number(pieces),
          declaredValueUsd: Number(declaredValueUsd),
          dangerousGoods,
          temperatureControlled: tempControlled,
          temperatureRange: tempControlled ? tempRange : undefined,
          dimensions: {
            lengthCm: 80,
            widthCm: 60,
            heightCm: 50,
          },
        },
        notes,
        signatureRequired: true,
      };

      const res = await api.shipments.create(input);
      onSuccess(res.shipment);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to book consignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-md"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Package className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">
            Book Commercial Consignment
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Generate an international Air Waybill (AWB) and register cargo into the FreightPulse dispatch network.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Service Tier Selector */}
          <div>
            <label className="text-slate-300 font-semibold block mb-2">
              Select Logistics Service Tier *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Air Express', 'Standard Freight', 'Ocean Cargo', 'Cold Chain Express'] as ServiceType[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setServiceType(st)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    serviceType === st
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    {st.includes('Air') && <Plane className="w-3.5 h-3.5 text-cyan-400" />}
                    {st.includes('Ocean') && <Ship className="w-3.5 h-3.5 text-emerald-400" />}
                    {st.includes('Cold') && <Thermometer className="w-3.5 h-3.5 text-blue-400" />}
                    {st.includes('Standard') && <Truck className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{st}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-mono">
                    ~{SERVICE_RATES[st].days} days transit
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Consignment Title */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Consignment Title / Reference Description *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
              placeholder="e.g. Precision Medical Laser Optics"
              required
            />
          </div>

          {/* Shipper & Consignee 2-Column Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shipper Box */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2.5">
              <span className="text-[11px] uppercase font-bold text-cyan-400 tracking-wider block">
                01. Shipper / Origin Address
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Shipper Name *"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={senderCompany}
                  onChange={(e) => setSenderCompany(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
              </div>
              <input
                type="text"
                placeholder="Street Address *"
                value={senderStreet}
                onChange={(e) => setSenderStreet(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                required
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="City *"
                  value={senderCity}
                  onChange={(e) => setSenderCity(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Postal Code"
                  value={senderPostal}
                  onChange={(e) => setSenderPostal(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Country *"
                  value={senderCountry}
                  onChange={(e) => setSenderCountry(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="email"
                  placeholder="Email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Consignee Box */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2.5">
              <span className="text-[11px] uppercase font-bold text-emerald-400 tracking-wider block">
                02. Consignee / Recipient Address
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Recipient Name *"
                  value={recipName}
                  onChange={(e) => setRecipName(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={recipCompany}
                  onChange={(e) => setRecipCompany(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
              </div>
              <input
                type="text"
                placeholder="Street Address *"
                value={recipStreet}
                onChange={(e) => setRecipStreet(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                required
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="City *"
                  value={recipCity}
                  onChange={(e) => setRecipCity(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Postal Code"
                  value={recipPostal}
                  onChange={(e) => setRecipPostal(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Country *"
                  value={recipCountry}
                  onChange={(e) => setRecipCountry(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="email"
                  placeholder="Email"
                  value={recipEmail}
                  onChange={(e) => setRecipEmail(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={recipPhone}
                  onChange={(e) => setRecipPhone(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Cargo Specifications */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg space-y-3">
            <span className="text-[11px] uppercase font-bold text-amber-400 tracking-wider block">
              03. Cargo Specifications & Customs
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Gross Weight (kg) *</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Total Packages *</label>
                <input
                  type="number"
                  min="1"
                  value={pieces}
                  onChange={(e) => setPieces(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Declared Value ($ USD) *</label>
                <input
                  type="number"
                  min="1"
                  value={declaredValueUsd}
                  onChange={(e) => setDeclaredValueUsd(parseFloat(e.target.value) || 100)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Cargo Category</label>
                <input
                  type="text"
                  value={cargoType}
                  onChange={(e) => setCargoType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Special Handling Checkboxes */}
            <div className="pt-2 flex flex-wrap gap-4 text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dangerousGoods}
                  onChange={(e) => setDangerousGoods(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                />
                <span>Dangerous Goods / HazMat (UN Regulated)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tempControlled}
                  onChange={(e) => setTempControlled(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                />
                <span>Temperature Controlled Cold Chain</span>
              </label>
            </div>
          </div>

          {/* Rate & ETA Summary Strip */}
          <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[11px] text-cyan-300 font-semibold uppercase block">
                Estimated Commercial Airway Rate
              </span>
              <p className="font-mono text-lg font-bold text-white">
                ${calculatedCost.toLocaleString()} USD
              </p>
            </div>
            <div className="text-right sm:text-right">
              <span className="text-[11px] text-slate-400 block">Estimated Arrival Date</span>
              <span className="font-mono text-cyan-300 font-semibold">
                {estimatedDate.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              {loading ? 'Booking Consignment...' : 'Confirm & Generate Consignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
