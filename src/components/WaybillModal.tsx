import React from 'react';
import { X, Printer, Download, CheckCircle2, Package, ShieldCheck } from 'lucide-react';
import { Shipment } from '../types/shipment.js';

interface WaybillModalProps {
  shipment: Shipment | null;
  onClose: () => void;
}

export const WaybillModal: React.FC<WaybillModalProps> = ({
  shipment,
  onClose,
}) => {
  if (!shipment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs no-print">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header Controls */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              Official Air Waybill / Consignment Manifest
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Air Waybill Document (IATA Standard Layout) */}
        <div className="bg-white text-slate-900 rounded-lg p-6 shadow-md border border-slate-300 font-sans text-xs">
          {/* Top Document Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-950 block">
                FREIGHTPULSE LOGISTICS
              </span>
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold block">
                Non-Negotiable Air Waybill / Consignment Note
              </span>
              <span className="text-[10px] text-slate-500">
                Issued subject to the Conditions of Contract and Warsaw/Montreal Convention.
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Air Waybill Number</span>
              <span className="font-mono text-xl font-extrabold tracking-wider text-slate-950 block">
                {shipment.trackingNumber}
              </span>
              <span className="text-xs font-mono text-slate-600">
                Consignment: {shipment.consignmentNumber}
              </span>
            </div>
          </div>

          {/* Barcode Graphic */}
          <div className="py-3 flex flex-col items-center justify-center border-b border-slate-300 bg-slate-50">
            <svg className="w-64 h-12" viewBox="0 0 200 40">
              {/* Simulated Code-128 Barcode */}
              {[2,4,7,9,11,15,18,22,25,27,30,34,37,42,46,49,52,55,59,62,67,71,74,78,82,85,89,92,96,101,105,108,112,116,120,123,127,130,135,139,143,147,151,155,160,164,168,172,176,180,185,190].map((x, i) => (
                <rect key={i} x={x} y="4" width={(i % 3 === 0 ? 3 : 1.5)} height="32" fill="#0f172a" />
              ))}
            </svg>
            <span className="font-mono text-[10px] text-slate-600 tracking-widest mt-1">
              *{shipment.trackingNumber.replace(/-/g, '')}*
            </span>
          </div>

          {/* 2-Column Shipper / Consignee Table */}
          <div className="grid grid-cols-2 border-b border-slate-900 divide-x divide-slate-900">
            {/* Shipper */}
            <div className="p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Shipper's Name & Full Address
              </span>
              <p className="font-bold text-sm text-slate-900">{shipment.sender.name}</p>
              {shipment.sender.company && (
                <p className="font-semibold text-xs text-slate-700">{shipment.sender.company}</p>
              )}
              <p className="text-xs text-slate-600 mt-1">{shipment.sender.street}</p>
              <p className="text-xs text-slate-600">
                {shipment.sender.city}, {shipment.sender.postalCode}
              </p>
              <p className="text-xs font-semibold text-slate-800">{shipment.sender.country}</p>
              <p className="text-[11px] text-slate-500 mt-1">Tel: {shipment.sender.phone}</p>
            </div>

            {/* Consignee */}
            <div className="p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Consignee's Name & Full Address
              </span>
              <p className="font-bold text-sm text-slate-900">{shipment.recipient.name}</p>
              {shipment.recipient.company && (
                <p className="font-semibold text-xs text-slate-700">{shipment.recipient.company}</p>
              )}
              <p className="text-xs text-slate-600 mt-1">{shipment.recipient.street}</p>
              <p className="text-xs text-slate-600">
                {shipment.recipient.city}, {shipment.recipient.postalCode}
              </p>
              <p className="text-xs font-semibold text-slate-800">{shipment.recipient.country}</p>
              <p className="text-[11px] text-slate-500 mt-1">Tel: {shipment.recipient.phone}</p>
            </div>
          </div>

          {/* Routing Information Grid */}
          <div className="grid grid-cols-4 border-b border-slate-900 divide-x divide-slate-900 bg-slate-100 text-[11px]">
            <div className="p-2">
              <span className="text-[9px] uppercase text-slate-500 block font-semibold">Airport of Departure</span>
              <span className="font-mono font-bold text-slate-900">
                {shipment.originHub.code} - {shipment.originHub.city}
              </span>
            </div>
            <div className="p-2">
              <span className="text-[9px] uppercase text-slate-500 block font-semibold">Airport of Destination</span>
              <span className="font-mono font-bold text-slate-900">
                {shipment.destinationHub.code} - {shipment.destinationHub.city}
              </span>
            </div>
            <div className="p-2">
              <span className="text-[9px] uppercase text-slate-500 block font-semibold">Issuing Carrier</span>
              <span className="font-bold text-slate-900 truncate block">
                {shipment.carrier.name}
              </span>
            </div>
            <div className="p-2">
              <span className="text-[9px] uppercase text-slate-500 block font-semibold">Flight / Vessel No.</span>
              <span className="font-mono font-bold text-slate-900">
                {shipment.carrier.vesselOrFlight || 'DIRECT LINE'}
              </span>
            </div>
          </div>

          {/* Cargo Ledger Grid */}
          <div className="border-b border-slate-900">
            <div className="grid grid-cols-6 bg-slate-200 text-[10px] font-bold uppercase text-slate-700 py-1.5 px-2 border-b border-slate-300">
              <span className="col-span-1">No. of Pieces</span>
              <span className="col-span-1">Gross Weight</span>
              <span className="col-span-1">Rate Class</span>
              <span className="col-span-1">Declared Value</span>
              <span className="col-span-2">Nature & Quantity of Goods</span>
            </div>
            <div className="grid grid-cols-6 py-3 px-2 text-xs font-mono">
              <span className="col-span-1 font-bold">{shipment.cargoDetails.pieces} PKG</span>
              <span className="col-span-1 font-bold">{shipment.cargoDetails.weightKg} KG</span>
              <span className="col-span-1">Q (General)</span>
              <span className="col-span-1">${shipment.cargoDetails.declaredValueUsd.toLocaleString()}</span>
              <span className="col-span-2 font-sans font-medium text-slate-800">
                {shipment.cargoDetails.cargoType}
                {shipment.cargoDetails.temperatureControlled && (
                  <span className="block text-[10px] text-blue-700 font-semibold mt-0.5">
                    Temperature Controlled: {shipment.cargoDetails.temperatureRange || '2°C-8°C'}
                  </span>
                )}
                {shipment.cargoDetails.dangerousGoods && (
                  <span className="block text-[10px] text-red-700 font-semibold mt-0.5">
                    Dangerous Goods Class 9 Manifest
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Handling & Special Instructions */}
          <div className="p-3 border-b border-slate-900 text-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
              Handling Information & Special Customs Declarations
            </span>
            <p className="text-slate-700">
              {shipment.notes || 'Standard commercial air cargo handling. Store in dry bonded warehouse.'}
            </p>
            {shipment.carrier.sealNumber && (
              <p className="text-[11px] font-mono text-slate-800 mt-1">
                Customs Tamper-Evident Seal: {shipment.carrier.sealNumber}
              </p>
            )}
          </div>

          {/* Signatures & Certification Footer */}
          <div className="grid grid-cols-2 divide-x divide-slate-900 pt-3 text-[10px]">
            <div className="pr-4">
              <p className="text-slate-500">
                Shipper certifies that the particulars on the face hereof are correct and that insofar as any part of the consignment contains dangerous goods, such part is properly described by name and is in proper condition for carriage by air according to applicable regulations.
              </p>
              <div className="mt-6 border-t border-slate-400 pt-1 text-slate-600 flex justify-between">
                <span>Signature of Shipper or his Agent</span>
                <span className="font-mono">{new Date(shipment.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="pl-4">
              <p className="text-slate-500">
                Executed on behalf of FreightPulse Logistics and Carrier Agents at {shipment.originHub.city}. Consignment accepted for transportation in apparent good order and condition.
              </p>
              <div className="mt-6 border-t border-slate-400 pt-1 text-slate-600 flex justify-between">
                <span>Signature of Issuing Carrier Agent</span>
                <span className="font-mono text-emerald-700 font-bold">DIGITALLY VERIFIED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Close Action */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition-colors"
          >
            Close Air Waybill
          </button>
        </div>
      </div>
    </div>
  );
};
