/**
 * Database Schemas & Models for FreightPulse
 * 
 * This file provides complete schema definitions and connection templates
 * for both MongoDB (Mongoose) and PostgreSQL (SQL / Drizzle / Prisma).
 * You can easily copy these models into your production database.
 */

// ============================================================================
// 1. POSTGRESQL SCHEMA (SQL DDL)
// ============================================================================
export const POSTGRESQL_DDL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
    company VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shipments Table
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(100) UNIQUE NOT NULL,
    consignment_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    service_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender JSONB NOT NULL,
    recipient JSONB NOT NULL,
    origin_hub JSONB NOT NULL,
    destination_hub JSONB NOT NULL,
    current_location JSONB NOT NULL,
    cargo_details JSONB NOT NULL,
    carrier JSONB NOT NULL,
    estimated_delivery TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    signature_required BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Milestones Checkpoints Table
CREATE TABLE shipment_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    operator VARCHAR(100),
    completed BOOLEAN DEFAULT TRUE,
    lat NUMERIC(9,6),
    lng NUMERIC(9,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipments_user ON shipments(user_id);
CREATE INDEX idx_milestones_shipment ON shipment_milestones(shipment_id);
`;

// ============================================================================
// 2. MONGODB / MONGOOSE SCHEMAS (Reference Code)
// ============================================================================
export const MONGOOSE_SCHEMAS_CODE = `
import mongoose, { Schema } from 'mongoose';

// User Schema
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'client'], default: 'client' },
  company: { type: String },
  phone: { type: String },
}, { timestamps: true });

// Milestone Sub-Schema
const MilestoneSchema = new Schema({
  status: { type: String, required: true },
  title: { type: String, required: true },
  location: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  notes: { type: String },
  operator: { type: String },
  completed: { type: Boolean, default: true },
  lat: { type: Number },
  lng: { type: Number },
});

// Shipment Schema
const ShipmentSchema = new Schema({
  trackingNumber: { type: String, required: true, unique: true, index: true },
  consignmentNumber: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Picked Up', 'In Transit', 'Customs Clearance', 'Out for Delivery', 'Delivered', 'Exception'],
    default: 'Pending',
    index: true
  },
  serviceType: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  sender: {
    name: String,
    company: String,
    email: String,
    phone: String,
    street: String,
    city: String,
    postalCode: String,
    country: String,
  },
  recipient: {
    name: String,
    company: String,
    email: String,
    phone: String,
    street: String,
    city: String,
    postalCode: String,
    country: String,
  },
  originHub: {
    name: String,
    city: String,
    country: String,
    code: String,
    lat: Number,
    lng: Number,
  },
  destinationHub: {
    name: String,
    city: String,
    country: String,
    code: String,
    lat: Number,
    lng: Number,
  },
  currentLocation: {
    name: String,
    city: String,
    country: String,
    lat: Number,
    lng: Number,
  },
  cargoDetails: {
    pieces: Number,
    weightKg: Number,
    volumeCbm: Number,
    declaredValueUsd: Number,
    cargoType: String,
    dimensions: { lengthCm: Number, widthCm: Number, heightCm: Number },
    dangerousGoods: Boolean,
    temperatureControlled: Boolean,
    temperatureRange: String,
  },
  carrier: {
    name: String,
    serviceLevel: String,
    vesselOrFlight: String,
    sealNumber: String,
    contactNumber: String,
  },
  milestones: [MilestoneSchema],
  estimatedDelivery: { type: Date, required: true },
  actualDelivery: { type: Date },
  signatureRequired: { type: Boolean, default: false },
  notes: { type: String },
}, { timestamps: true });

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const ShipmentModel = mongoose.models.Shipment || mongoose.model('Shipment', ShipmentSchema);
`;
