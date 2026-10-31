import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

// -----------------------------------------------------------------------------
// Shared subdocuments
// -----------------------------------------------------------------------------

const AddressSchema = new Schema(
  {
    name: { type: String, required: true },
    company: String,
    email: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: String,
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    airportOrPortCode: String,
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const CargoDetailsSchema = new Schema(
  {
    pieces: { type: Number, required: true },
    weightKg: { type: Number, required: true },
    volumeCbm: Number,
    declaredValueUsd: { type: Number, required: true },
    cargoType: { type: String, required: true },
    dimensions: {
      lengthCm: Number,
      widthCm: Number,
      heightCm: Number,
    },
    dangerousGoods: Boolean,
    temperatureControlled: Boolean,
    temperatureRange: String,
  },
  { _id: false }
);

const CarrierSchema = new Schema(
  {
    name: { type: String, required: true },
    serviceLevel: { type: String, required: true },
    vesselOrFlight: String,
    sealNumber: String,
    contactNumber: String,
  },
  { _id: false }
);

const HubSchema = new Schema(
  {
    name: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    code: String,
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const CurrentLocationSchema = new Schema(
  {
    name: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const MilestoneSchema = new Schema(
  {
    id: { type: String, required: true },
    status: {
      type: String,
      enum: [
        'Awaiting Dispatch',
        'In Transit',
        'On Hold',
        'Out for Delivery',
        'Delivered',
      ],
      required: true,
    },
    title: { type: String, required: true },
    location: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    timestamp: { type: String, required: true },
    notes: String,
    operator: String,
    completed: { type: Boolean, default: false },
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const HoldDetailsSchema = new Schema(
  {
    isOnHold: { type: Boolean, default: false },
    reason: String,
    customerExplanation: String,
    placedOnHoldAt: String,
    resumedAt: String,
  },
  { _id: false }
);

const PricingSchema = new Schema(
  {
    baseAmount: { type: Number, required: true },
    handlingFee: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    currency: { type: String, required: true },
    payer: {
      type: String,
      enum: ['sender', 'recipient'],
      required: true,
    },
    adjustedByAdmin: Boolean,
    adjustmentReason: String,
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['admin', 'client'],
      required: true,
    },
    company: String,
    phone: String,
    passwordHash: { type: String, required: true, select: false },

    // Customer email verification
    emailVerified: { type: Boolean, default: false },
    emailVerificationCodeHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    emailVerificationAttempts: { type: Number, default: 0, select: false },

    // Customer password reset
    passwordResetCodeHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    passwordResetAttempts: { type: Number, default: 0, select: false },

    createdAt: { type: String, required: true },
  },
  {
    collection: 'freightplus_users',
    versionKey: false,
  }
);
// -----------------------------------------------------------------------------
// Shipment model
// -----------------------------------------------------------------------------

const ShipmentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    trackingNumber: { type: String, required: true, unique: true, index: true },
    consignmentNumber: { type: String, required: true, unique: true, index: true },
    trackingToken: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },

    bookingStatus: {
      type: String,
      enum: ['Awaiting Admin Review', 'Approved', 'Rejected'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        'Awaiting Payment',
        'Pending Verification',
        'Paid',
        'Rejected',
        'Refunded',
      ],
      required: true,
    },
    movementStatus: {
      type: String,
      enum: [
        'Awaiting Dispatch',
        'In Transit',
        'On Hold',
        'Out for Delivery',
        'Delivered',
      ],
      required: true,
    },
    status: { type: String, required: true },

    serviceType: {
      type: String,
      enum: [
        'Air Express',
        'Standard Freight',
        'Ocean Cargo',
        'Cold Chain Express',
      ],
      required: true,
    },

    sender: { type: AddressSchema, required: true },
    recipient: { type: AddressSchema, required: true },

    originHub: { type: HubSchema, required: true },
    destinationHub: { type: HubSchema, required: true },
    currentLocation: { type: CurrentLocationSchema, required: true },

    cargoDetails: { type: CargoDetailsSchema, required: true },
    carrier: { type: CarrierSchema, required: true },
    pricing: { type: PricingSchema, required: true },
    holdDetails: { type: HoldDetailsSchema, default: () => ({}) },
    milestones: { type: [MilestoneSchema], default: [] },

    estimatedDelivery: { type: String, required: true },
    dispatchDate: { type: String, default: null },
    actualDelivery: { type: String, default: null },

    journeyStartedAt: { type: String, default: null },
    journeyDurationSeconds: Number,
    journeyPausedAt: { type: String, default: null },
    journeyPausedElapsedSeconds: Number,
    journeyProgressAtPause: Number,

    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    notes: String,
    signatureRequired: Boolean,
  },
  {
    collection: 'freightplus_shipments',
    versionKey: false,
    strict: false,
  }
);

// -----------------------------------------------------------------------------
// Audit logs
// -----------------------------------------------------------------------------

const AuditLogSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    adminId: { type: String, required: true },
    adminEmail: { type: String, required: true },
    action: { type: String, required: true },
    targetId: { type: String, required: true },
    details: Schema.Types.Mixed,
    timestamp: { type: String, required: true },
  },
  {
    collection: 'freightplus_audit_logs',
    versionKey: false,
  }
);

// -----------------------------------------------------------------------------
// Customer and recipient support messages
// -----------------------------------------------------------------------------

const AttachmentSchema = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: String,
    size: Number,
  },
  { _id: false, strict: false }
);

const SupportMessageSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    shipmentId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: {
      type: String,
      enum: ['customer', 'admin'],
      required: true,
    },
    text: { type: String, default: '' },
    attachments: { type: [AttachmentSchema], default: [] },
    createdAt: { type: String, required: true },
  },
  {
    collection: 'freightplus_support_messages',
    versionKey: false,
  }
);

const RecipientSupportMessageSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    shipmentId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: {
      type: String,
      enum: ['recipient', 'admin'],
      required: true,
    },
    text: { type: String, default: '' },
    attachments: { type: [AttachmentSchema], default: [] },
    createdAt: { type: String, required: true },
  },
  {
    collection: 'freightplus_recipient_support_messages',
    versionKey: false,
  }
);

// -----------------------------------------------------------------------------
// Administrator configuration
// -----------------------------------------------------------------------------

const AdminConfigSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    isInitialized: { type: Boolean, default: false },
    initializedAt: String,
    adminEmail: String,
  },
  {
    collection: 'freightplus_admin_config',
    versionKey: false,
  }
);

// Reuse registered models during development hot reloads.
export const UserModel =
  (models.FreightPlusUser as mongoose.Model<any>) ||
  model('FreightPlusUser', UserSchema);

export const ShipmentModel =
  (models.FreightPlusShipment as mongoose.Model<any>) ||
  model('FreightPlusShipment', ShipmentSchema);

export const AuditLogModel =
  (models.FreightPlusAuditLog as mongoose.Model<any>) ||
  model('FreightPlusAuditLog', AuditLogSchema);

export const SupportMessageModel =
  (models.FreightPlusSupportMessage as mongoose.Model<any>) ||
  model('FreightPlusSupportMessage', SupportMessageSchema);

export const RecipientSupportMessageModel =
  (models.FreightPlusRecipientSupportMessage as mongoose.Model<any>) ||
  model('FreightPlusRecipientSupportMessage', RecipientSupportMessageSchema);

export const AdminConfigModel =
  (models.FreightPlusAdminConfig as mongoose.Model<any>) ||
  model('FreightPlusAdminConfig', AdminConfigSchema);