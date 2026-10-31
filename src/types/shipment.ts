/**
 * Freight Plus — Shipment & Consignment Tracking Type Definitions
 */

export type BookingStatus = 
  | 'Awaiting Admin Review'
  | 'Approved'
  | 'Rejected';

export type PaymentStatus = 
  | 'Awaiting Payment'
  | 'Pending Verification'
  | 'Paid'
  | 'Rejected'
  | 'Refunded';

export type MovementStatus = 
  | 'Awaiting Dispatch'
  | 'In Transit'
  | 'On Hold'
  | 'Out for Delivery'
  | 'Delivered';

// Backward compatibility alias
export type ShipmentStatus = MovementStatus;

export type ServiceType = 
  | 'Air Express'
  | 'Standard Freight'
  | 'Ocean Cargo'
  | 'Cold Chain Express';

export type UserRole = 'admin' | 'client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  phone?: string;
  createdAt?: string;
}

export interface Address {
  name: string;
  company?: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  airportOrPortCode?: string;
  lat?: number;
  lng?: number;
}

export interface CargoDetails {
  pieces: number;
  weightKg: number;
  volumeCbm?: number;
  declaredValueUsd: number;
  cargoType: string;
  dimensions?: {
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  };
  dangerousGoods?: boolean;
  temperatureControlled?: boolean;
  temperatureRange?: string;
}

export interface CarrierDetails {
  name: string;
  serviceLevel: string;
  vesselOrFlight?: string;
  sealNumber?: string;
  contactNumber?: string;
}

export interface Milestone {
  id: string;
  status: MovementStatus;
  title: string;
  location: string;
  city: string;
  country: string;
  timestamp: string;
  notes?: string;
  operator?: string;
  completed: boolean;
  lat?: number;
  lng?: number;
}

export interface HoldDetails {
  isOnHold: boolean;
  reason?: string;             // Private internal administrative note
  customerExplanation?: string;// Customer-facing explanation displayed on tracking page
  placedOnHoldAt?: string;
  resumedAt?: string;
}

export interface ShippingCharge {
  baseAmount: number;
  handlingFee: number;
  totalAmount: number;
  currency: string;
  payer: 'sender' | 'recipient';
  adjustedByAdmin?: boolean;
  adjustmentReason?: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  consignmentNumber: string;
  trackingToken: string;       // Secure unguessable token for tracking link sharing
  title: string;
  
  // Decoupled Three-Part Status Model
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  movementStatus: MovementStatus;
  status: MovementStatus;      // Compatibility getter pointing to movementStatus

  serviceType: ServiceType;
  sender: Address;
  recipient: Address;
  
  originHub: {
    name: string;
    city: string;
    country: string;
    code: string;
    lat: number;
    lng: number;
  };
  destinationHub: {
    name: string;
    city: string;
    country: string;
    code: string;
    lat: number;
    lng: number;
  };
  currentLocation: {
    name: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
  };

  cargoDetails: CargoDetails;
  carrier: CarrierDetails;
  pricing: ShippingCharge;
  holdDetails: HoldDetails;
  milestones: Milestone[];
  
 estimatedDelivery: string;
dispatchDate?: string | null;
actualDelivery?: string | null;

// Persisted timing for simulated shipment movement
journeyStartedAt?: string | null;
journeyDurationSeconds?: number;
journeyPausedAt?: string | null;
journeyPausedElapsedSeconds?: number;
journeyProgressAtPause?: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  notes?: string;
  signatureRequired?: boolean;
}

export interface ShipmentStats {
  totalShipments: number;
  awaitingReview: number;
  inTransit: number;
  onHold: number;
  delivered: number;
  awaitingPayment: number;
  totalWeightKg: number;
}

export interface CreateShipmentInput {
  title: string;
  serviceType: ServiceType;
  sender: Address;
  recipient: Address;
  cargoDetails: CargoDetails;
  payer?: 'sender' | 'recipient';
  carrierName?: string;
  notes?: string;
  signatureRequired?: boolean;
}

export interface AddMilestoneInput {
  status: MovementStatus;
  title: string;
  location: string;
  city: string;
  country: string;
  notes?: string;
  operator?: string;
  lat?: number;
  lng?: number;
  timestamp?: string;
}

export interface HoldShipmentInput {
  reason: string;
  customerExplanation: string;
}

export interface ResumeShipmentInput {
  revisedEstimatedDelivery?: string;
  resumptionNote?: string;
}

export interface AdminSetupStatus {
  isInitialized: boolean;
  adminEmail?: string;
}
