import React, { useState } from 'react';
import { X, MapPin, CheckCircle2, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { Shipment, ShipmentStatus, AddMilestoneInput } from '../types/shipment.js';
import { api } from '../services/api.js';

interface AddMilestoneModalProps {
  shipment: Shipment | null;
  onClose: () => void;
  onSuccess: (updatedShipment: Shipment) => void;
}

const PRESET_MILESTONES = [
  {
    title: 'Customs Clearance Granted & Released',
    status: 'Customs Clearance' as ShipmentStatus,
    location: 'Customs Bonded Inspection Bay',
    notes: 'Regulatory tariff code verified. Export/Import duty settled.',
  },
  {
    title: 'Cargo Transferred to Local Delivery Fleet',
    status: 'Out for Delivery' as ShipmentStatus,
    location: 'Regional Last-Mile Logistics Hub',
    notes: 'Loaded into secure delivery truck. Final route dispatched.',
  },
  {
    title: 'Touchdown at Transit Hub & Aircraft Unloaded',
    status: 'In Transit' as ShipmentStatus,
    location: 'Cargo Terminal Ramp 2',
    notes: 'Aircraft de-containerized. Pallet integrity inspected and confirmed.',
  },
  {
    title: 'Consignment Delivered & Recipient Signed',
    status: 'Delivered' as ShipmentStatus,
    location: 'Consignee Receiving Dock',
    notes: 'Proof of Delivery (POD) signed electronically. Handover complete.',
  },
  {
    title: 'Operational Weather Delay / Clearance Hold',
    status: 'Exception' as ShipmentStatus,
    location: 'Flight Operations Dispatch',
    notes: 'Adverse transatlantic weather causing re-routing hold.',
  },
];

export const AddMilestoneModal: React.FC<AddMilestoneModalProps> = ({
  shipment,
  onClose,
  onSuccess,
}) => {
  if (!shipment) return null;

  const [status, setStatus] = useState<ShipmentStatus>(shipment.status);
  const [title, setTitle] = useState<string>('Arrival at Intermediate Transit Checkpoint');
  const [location, setLocation] = useState<string>(`${shipment.destinationHub.name}`);
  const [city, setCity] = useState<string>(shipment.destinationHub.city);
  const [country, setCountry] = useState<string>(shipment.destinationHub.country);
  const [notes, setNotes] = useState<string>('Container scan verified. Security seal intact.');
  const [operator, setOperator] = useState<string>('Dispatcher M. Vance (OPS-01)');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: typeof PRESET_MILESTONES[0]) => {
    setTitle(preset.title);
    setStatus(preset.status);
    setLocation(preset.location);
    setNotes(preset.notes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !location || !city || !country) {
      setError('Please complete all required checkpoint fields.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const input: AddMilestoneInput = {
        status,
        title,
        location,
        city,
        country,
        notes,
        operator,
        timestamp: new Date().toISOString(),
      };
      const res = await api.shipments.addMilestone(shipment.id, input);
      onSuccess(res.shipment);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add milestone.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-md"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-amber-400" />
          <h2 className="text-base font-bold text-white">
            Dispatch Location Checkpoint
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4 font-mono">
          Consignment: {shipment.trackingNumber} · {shipment.title}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Quick Presets */}
        <div className="mb-4">
          <label className="text-[11px] uppercase font-semibold text-slate-400 block mb-1.5">
            Quick Preset Events:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_MILESTONES.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors text-left"
              >
                {p.title.split(' ')[0]} {p.title.split(' ')[1]} ({p.status})
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Target Status Transition *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
              >
                <option value="Pending">Pending</option>
                <option value="Picked Up">Picked Up</option>
                <option value="In Transit">In Transit</option>
                <option value="Customs Clearance">Customs Clearance</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Exception">Exception</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Checkpoint Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                placeholder="e.g. Departed Transit Hub"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">
              Hub / Facility Name *
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
              placeholder="e.g. Frankfurt CargoCity Gate 4"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                City *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Country *
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">
              Operational Notes & Cargo Inspection Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
              placeholder="e.g. Package inspected, seals intact, temperature at +4C"
            />
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">
              Authorized Dispatch Officer Initials
            </label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
              placeholder="e.g. Officer J. Doe (FRA-AIR)"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
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
              className="px-5 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? 'Logging Checkpoint...' : 'Append Checkpoint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
