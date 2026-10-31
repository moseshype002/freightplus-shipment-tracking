import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Shipment, User, BookingStatus, PaymentStatus, MovementStatus, HoldDetails, ShippingCharge, AddMilestoneInput, CreateShipmentInput, ShipmentStats } from '../../types/shipment.js';

export interface DbUser extends User {
  passwordHash: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId: string;
  details?: any;
  timestamp: string;
}

interface SupportMessage {
id: string;
shipmentId: string;
senderId: string;
senderName: string;
senderRole: 'customer' | 'admin';
text: string;
attachments: {
name: string;
url: string;
type: string;
size: number;
}[];
createdAt: string;
}

interface RecipientSupportMessage {
  id: string;
  shipmentId: string;
  senderId: string;
  senderName: string;
  senderRole: 'recipient' | 'admin';
  text: string;
  attachments: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  createdAt: string;
}
interface DatabaseSchema {
version: number;
adminConfig: {
isInitialized: boolean;
initializedAt?: string;
adminEmail?: string;
};
users: DbUser[];
shipments: Shipment[];
auditLogs: AuditLog[];
supportMessages: SupportMessage[];
recipientSupportMessages: RecipientSupportMessage[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'freightplus_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache synced to disk
let db: DatabaseSchema = {
  version: 1,
  adminConfig: {
    isInitialized: false,
  },
  users: [],
  shipments: [],
  auditLogs: [],
  supportMessages: [],
  recipientSupportMessages: [],
};

// Atomic write to disk to prevent corruption
function persistToDisk() {
  try {
    const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('[FreightPlus DB] Failed to persist database to disk:', err);
  }
}

// Generate secure unguessable tracking token
export function generateTrackingToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Initial realistic seed shipments
function getInitialSeedShipments(): Shipment[] {
  const now = Date.now();
  return [
    {
      id: 'shp-001',
      trackingNumber: 'FP-8942-US',
      consignmentNumber: 'CN-2026-8942',
      trackingToken: 'tok_8942_frankfurt_jfk_a7b9',
      title: 'High-Precision Surgical Robotics & Sensors',
      
      bookingStatus: 'Approved',
      paymentStatus: 'Paid',
      movementStatus: 'In Transit',
      status: 'In Transit',

      serviceType: 'Air Express',
      userId: 'user-client-01',
      sender: {
        name: 'Dr. Klaus Becker',
        company: 'Heidelberg BioMedical Instruments GmbH',
        email: 'logistics@heidelberg-med.de',
        phone: '+49 6221 5400',
        street: 'Tiergartenstrasse 17',
        city: 'Heidelberg',
        postalCode: '69121',
        country: 'Germany',
        airportOrPortCode: 'FRA',
        lat: 49.4093,
        lng: 8.6942,
      },
      recipient: {
        name: 'Elena Rostova',
        company: 'Acme High-Tech Components Inc.',
        email: 'client@acmecorp.com',
        phone: '+1 (555) 234-5678',
        street: '750 Lexington Avenue, Fl 14',
        city: 'New York',
        state: 'NY',
        postalCode: '10022',
        country: 'United States',
        airportOrPortCode: 'JFK',
        lat: 40.7629,
        lng: -73.9701,
      },
      originHub: {
        name: 'Frankfurt CargoCity South Hub',
        city: 'Frankfurt',
        country: 'Germany',
        code: 'FRA',
        lat: 50.0379,
        lng: 8.5622,
      },
      destinationHub: {
        name: 'John F. Kennedy International Cargo Terminal',
        city: 'New York',
        country: 'United States',
        code: 'JFK',
        lat: 40.6413,
        lng: -73.7781,
      },
      currentLocation: {
        name: 'Transatlantic Flight Corridor (Flight LH-8201)',
        city: 'Mid-Atlantic En Route',
        country: 'International Airspace',
        lat: 48.2100,
        lng: -35.4000,
      },
      cargoDetails: {
        pieces: 4,
        weightKg: 142.5,
        volumeCbm: 1.25,
        declaredValueUsd: 185000,
        cargoType: 'Precision Medical Equipment',
        dimensions: { lengthCm: 120, widthCm: 80, heightCm: 110 },
        dangerousGoods: false,
        temperatureControlled: true,
        temperatureRange: '15°C - 25°C',
      },
      carrier: {
        name: 'Lufthansa Cargo AG',
        serviceLevel: 'Air Priority Secure',
        vesselOrFlight: 'LH-8201 (Boeing 777F)',
        sealNumber: 'SEAL-FRA-8942-A',
        contactNumber: '+49 69 6960',
      },
      pricing: {
        baseAmount: 1211.25,
        handlingFee: 150.0,
        totalAmount: 1361.25,
        currency: 'USD',
        payer: 'sender',
      },
      holdDetails: {
        isOnHold: false,
      },
      estimatedDelivery: new Date(now + 28 * 3600 * 1000).toISOString(),
      dispatchDate: new Date(now - 6 * 3600 * 1000).toISOString(),
      actualDelivery: null,
      createdAt: new Date(now - 36 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - 6 * 3600 * 1000).toISOString(),
      signatureRequired: true,
      notes: 'Fragile optoelectronic sensors. Keep upright. Shock sensors armed.',
      milestones: [
        {
          id: 'ms-001-1',
          status: 'Awaiting Dispatch',
          title: 'Booking Approved & Consignment Documented',
          location: 'Heidelberg Operations Center',
          city: 'Heidelberg',
          country: 'Germany',
          timestamp: new Date(now - 36 * 3600 * 1000).toISOString(),
          notes: 'Airway Bill AWB-020-8942-01 generated. Consignment manifest approved.',
          operator: 'H. Weber (FRA-OPS)',
          completed: true,
          lat: 49.4093,
          lng: 8.6942,
        },
        {
          id: 'ms-001-2',
          status: 'In Transit',
          title: 'Departed Frankfurt On Flight LH-8201',
          location: 'Frankfurt Cargo Terminal Ramp 4',
          city: 'Frankfurt',
          country: 'Germany',
          timestamp: new Date(now - 6 * 3600 * 1000).toISOString(),
          notes: 'Loaded into Lower Deck Pallet Position 22R. Cruising at 36,000 ft.',
          operator: 'Captain J. Wagner',
          completed: true,
          lat: 48.2100,
          lng: -35.4000,
        },
      ],
    },
    {
      id: 'shp-002',
      trackingNumber: 'FP-7104-DE',
      consignmentNumber: 'CN-2026-7104',
      trackingToken: 'tok_7104_tokyo_frankfurt_b2c4',
      title: 'Automated Industrial Controller Wafers & Sensors',
      
      bookingStatus: 'Approved',
      paymentStatus: 'Paid',
      movementStatus: 'On Hold',
      status: 'On Hold',

      serviceType: 'Standard Freight',
      userId: 'user-client-01',
      sender: {
        name: 'Kenji Takahashi',
        company: 'Sora Precision Automation K.K.',
        email: 'export@sora-precision.co.jp',
        phone: '+81 3 5555 0142',
        street: 'Minato-ku Shibaura 3-1-21',
        city: 'Tokyo',
        postalCode: '108-0023',
        country: 'Japan',
        airportOrPortCode: 'HND',
        lat: 35.6441,
        lng: 139.7475,
      },
      recipient: {
        name: 'Elena Rostova',
        company: 'Acme Components Germany',
        email: 'elena@acme.de',
        phone: '+49 69 9998 01',
        street: 'Speicherstrasse 55',
        city: 'Frankfurt am Main',
        postalCode: '60327',
        country: 'Germany',
        airportOrPortCode: 'FRA',
        lat: 50.1012,
        lng: 8.6653,
      },
      originHub: {
        name: 'Tokyo Haneda Air Cargo Terminal',
        city: 'Tokyo',
        country: 'Japan',
        code: 'HND',
        lat: 35.5494,
        lng: 139.7798,
      },
      destinationHub: {
        name: 'Frankfurt Logistics Air Hub',
        city: 'Frankfurt',
        country: 'Germany',
        code: 'FRA',
        lat: 50.0379,
        lng: 8.5622,
      },
      currentLocation: {
        name: 'Frankfurt Main Customs Inspection Bay C',
        city: 'Frankfurt',
        country: 'Germany',
        lat: 50.0385,
        lng: 8.5635,
      },
      cargoDetails: {
        pieces: 8,
        weightKg: 380.0,
        volumeCbm: 3.4,
        declaredValueUsd: 94000,
        cargoType: 'Industrial Automation Electronics',
        dimensions: { lengthCm: 100, widthCm: 100, heightCm: 120 },
        dangerousGoods: false,
        temperatureControlled: false,
      },
      carrier: {
        name: 'Nippon Cargo Airlines',
        serviceLevel: 'Express Freight Global',
        vesselOrFlight: 'KZ-024 (Boeing 747-8F)',
        sealNumber: 'JP-TYO-99120',
        contactNumber: '+81 3 5742 2200',
      },
      pricing: {
        baseAmount: 1216.0,
        handlingFee: 120.0,
        totalAmount: 1336.0,
        currency: 'USD',
        payer: 'recipient',
      },
      holdDetails: {
        isOnHold: true,
        reason: 'Customs awaiting RoHS compliance certificates and revised EU tariff valuation.',
        customerExplanation: 'Customs clearance inspection in progress at Frankfurt Hub. Documentation review underway.',
        placedOnHoldAt: new Date(now - 4 * 3600 * 1000).toISOString(),
      },
      estimatedDelivery: new Date(now + 48 * 3600 * 1000).toISOString(),
      dispatchDate: new Date(now - 55 * 3600 * 1000).toISOString(),
      actualDelivery: null,
      createdAt: new Date(now - 72 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - 4 * 3600 * 1000).toISOString(),
      signatureRequired: true,
      notes: 'Customs declaration under tariff code 8538.90.',
      milestones: [
        {
          id: 'ms-002-1',
          status: 'Awaiting Dispatch',
          title: 'Export Documentation Verified',
          location: 'Tokyo Logistics Dispatch Center',
          city: 'Tokyo',
          country: 'Japan',
          timestamp: new Date(now - 70 * 3600 * 1000).toISOString(),
          notes: 'EDI manifest dispatched to Haneda customs authority.',
          operator: 'K. Tanaka',
          completed: true,
          lat: 35.5494,
          lng: 139.7798,
        },
        {
          id: 'ms-002-2',
          status: 'In Transit',
          title: 'Arrived at Frankfurt Transit Hub',
          location: 'Frankfurt Airport CargoCity Ramp 3',
          city: 'Frankfurt',
          country: 'Germany',
          timestamp: new Date(now - 14 * 3600 * 1000).toISOString(),
          notes: 'Flight KZ-024 touched down. De-consolidated into bonded warehouse.',
          operator: 'R. Braun',
          completed: true,
          lat: 50.0379,
          lng: 8.5622,
        },
        {
          id: 'ms-002-3',
          status: 'On Hold',
          title: 'Customs Hold — Documentation Review Underway',
          location: 'Hauptzollamt Frankfurt Flughafen',
          city: 'Frankfurt',
          country: 'Germany',
          timestamp: new Date(now - 4 * 3600 * 1000).toISOString(),
          notes: 'Awaiting European Union RoHS compliance declaration certificate.',
          operator: 'Inspector D. Mueller',
          completed: false,
          lat: 50.0385,
          lng: 8.5635,
        },
      ],
    },
    {
      id: 'shp-003',
      trackingNumber: 'FP-1209-CA',
      consignmentNumber: 'CN-2026-1209',
      trackingToken: 'tok_1209_chicago_montreal_d5e8',
      title: 'Automotive EV Battery Cell Modules',
      
      bookingStatus: 'Awaiting Admin Review',
      paymentStatus: 'Awaiting Payment',
      movementStatus: 'Awaiting Dispatch',
      status: 'Awaiting Dispatch',

      serviceType: 'Standard Freight',
      userId: 'user-client-01',
      sender: {
        name: 'Robert Miller',
        company: 'Great Lakes Lithium Cells LLC',
        email: 'freight@greatlakes-cells.com',
        phone: '+1 (312) 555-0188',
        street: '4200 South Pulaski Rd',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60632',
        country: 'United States',
        airportOrPortCode: 'ORD',
        lat: 41.8164,
        lng: -87.7247,
      },
      recipient: {
        name: 'Marc Tremblay',
        company: 'St. Lawrence Electric Mobility Ltd.',
        email: 'm.tremblay@stlawrence-ev.ca',
        phone: '+1 (514) 555-0149',
        street: '8800 Rue Saint-Urbain',
        city: 'Montreal',
        state: 'QC',
        postalCode: 'H2P 2N7',
        country: 'Canada',
        airportOrPortCode: 'YUL',
        lat: 45.5401,
        lng: -73.6394,
      },
      originHub: {
        name: 'Chicago O\'Hare Intermodal Freight Depot',
        city: 'Chicago',
        country: 'United States',
        code: 'ORD',
        lat: 41.9742,
        lng: -87.9073,
      },
      destinationHub: {
        name: 'Montreal Pierre Elliott Trudeau Cargo Logistics',
        city: 'Montreal',
        country: 'Canada',
        code: 'YUL',
        lat: 45.4705,
        lng: -73.7408,
      },
      currentLocation: {
        name: 'Great Lakes Packaging Center',
        city: 'Chicago',
        country: 'United States',
        lat: 41.8164,
        lng: -87.7247,
      },
      cargoDetails: {
        pieces: 12,
        weightKg: 1240.0,
        volumeCbm: 6.2,
        declaredValueUsd: 68000,
        cargoType: 'Lithium Ion Battery Modules (UN3480)',
        dimensions: { lengthCm: 120, widthCm: 100, heightCm: 140 },
        dangerousGoods: true,
        temperatureControlled: false,
      },
      carrier: {
        name: 'North American Freightways Intermodal',
        serviceLevel: 'Cross-Border HazMat Ground',
        vesselOrFlight: 'TRK-NA-449',
        sealNumber: 'HAZ-USCA-8819',
        contactNumber: '+1 (800) 555-8833',
      },
      pricing: {
        baseAmount: 3968.0,
        handlingFee: 250.0,
        totalAmount: 4218.0,
        currency: 'USD',
        payer: 'sender',
      },
      holdDetails: {
        isOnHold: false,
      },
      estimatedDelivery: new Date(now + 72 * 3600 * 1000).toISOString(),
      dispatchDate: null,
      actualDelivery: null,
      createdAt: new Date(now - 3 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - 3 * 3600 * 1000).toISOString(),
      signatureRequired: true,
      notes: 'UN 3480 Class 9 Dangerous Goods. Awaiting administrator review and border pre-clearance.',
      milestones: [
        {
          id: 'ms-005-1',
          status: 'Awaiting Dispatch',
          title: 'Booking Submitted — Awaiting Administrator Review',
          location: 'Chicago Packaging Center',
          city: 'Chicago',
          country: 'United States',
          timestamp: new Date(now - 3 * 3600 * 1000).toISOString(),
          notes: 'Class 9 HazMat documentation uploaded. Awaiting dispatch authorization.',
          operator: 'Automated Booking System',
          completed: true,
          lat: 41.8164,
          lng: -87.7247,
        },
      ],
    },
  ];
}

// Load database from disk or initialize fresh
export function loadDatabase(): void {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);
      db.supportMessages ??= [];
      db.recipientSupportMessages ??= [];
      console.log(`[FreightPlus DB] Loaded persistent database from ${DB_FILE} (${db.shipments.length} shipments, ${db.users.length} users)`);
    } else {
      console.log('[FreightPlus DB] No database file found on disk. Initializing new persistent store...');
      db = {
        version: 1,
        adminConfig: {
          isInitialized: false,
        },
        users: [],
        shipments: getInitialSeedShipments(),
        auditLogs: [],
        supportMessages: [],
        recipientSupportMessages: [],
      };
      
      // Seed default customer account (Elena Rostova - client)
      const salt = bcrypt.genSaltSync(12);
      const defaultClient: DbUser = {
        id: 'user-client-01',
        name: 'Elena Rostova',
        email: 'client@acmecorp.com',
        role: 'client',
        company: 'Acme High-Tech Components Inc.',
        phone: '+1 (555) 234-5678',
        passwordHash: bcrypt.hashSync('client123', salt),
        createdAt: new Date().toISOString(),
      };
      db.users.push(defaultClient);
      persistToDisk();
    }

    // Check for Environment-based Administrator Bootstrapping
    bootstrapAdminFromEnv();
  } catch (err) {
    console.error('[FreightPlus DB] Error loading database file:', err);
  }
}

// Bootstrap administrator account from environment variables if configured
function bootstrapAdminFromEnv() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD?.trim();

  if (adminEmail && adminPassword) {
    const existingAdmin = db.users.find(u => u.email.toLowerCase() === adminEmail && u.role === 'admin');
    if (!existingAdmin) {
      console.log(`[FreightPlus Security] Initializing Administrator account from environment configuration (${adminEmail})...`);
      const salt = bcrypt.genSaltSync(12);
      const newAdmin: DbUser = {
        id: `admin-${Date.now()}`,
        name: process.env.ADMIN_NAME || 'System Administrator',
        email: adminEmail,
        role: 'admin',
        company: 'Freight Plus Executive Command',
        phone: process.env.ADMIN_PHONE || '',
        passwordHash: bcrypt.hashSync(adminPassword, salt),
        createdAt: new Date().toISOString(),
      };
      db.users.push(newAdmin);
      db.adminConfig.isInitialized = true;
      db.adminConfig.initializedAt = new Date().toISOString();
      db.adminConfig.adminEmail = adminEmail;
      persistToDisk();
      console.log('[FreightPlus Security] Administrator account provisioned successfully and permanently stored in database.');
    }
  }
}

// Initialize on module load
loadDatabase();

// ============================================================================
// Database Repository Methods
// ============================================================================

export const Database = {
  // --- Admin Configuration & Setup ---
  getAdminSetupStatus(): { isInitialized: boolean; adminEmail?: string } {
    const adminExists = db.users.some(u => u.role === 'admin');
    return {
      isInitialized: adminExists || db.adminConfig.isInitialized,
      adminEmail: db.adminConfig.adminEmail,
    };
  },

  setupInitialAdmin(data: { name: string; email: string; password: string; setupSecret: string }): User {
    const configuredSecret = process.env.ADMIN_SETUP_SECRET || 'freightplus_admin_setup_secure_token_2026';
    
    if (this.getAdminSetupStatus().isInitialized) {
      throw new Error('Administrator setup has already been completed. This endpoint is permanently disabled.');
    }

    if (data.setupSecret !== configuredSecret) {
      throw new Error('Invalid Administrator Setup Secret. Please verify your configured ADMIN_SETUP_SECRET in .env.');
    }

    if (!data.name || !data.email || !data.password) {
      throw new Error('Name, email, and password are required for administrator provisioning.');
    }

    if (data.password.length < 8) {
      throw new Error('Administrator password must be at least 8 characters long.');
    }

    const salt = bcrypt.genSaltSync(12);
    const newAdmin: DbUser = {
      id: `admin-${Date.now()}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: 'admin',
      company: 'Freight Plus Command',
      passwordHash: bcrypt.hashSync(data.password, salt),
      createdAt: new Date().toISOString(),
    };

    db.users.push(newAdmin);
    db.adminConfig.isInitialized = true;
    db.adminConfig.initializedAt = new Date().toISOString();
    db.adminConfig.adminEmail = newAdmin.email;
    persistToDisk();

    return {
      id: newAdmin.id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
    };
  },

  // --- Users & Customers ---
  findUserByEmail(email: string): DbUser | undefined {
    const normalized = email.toLowerCase().trim();
    return db.users.find(u => u.email.toLowerCase() === normalized);
  },

  findUserById(id: string): DbUser | undefined {
    return db.users.find(u => u.id === id);
  },

  createCustomer(data: { name: string; email: string; password: string; company?: string; phone?: string }): User {
    const normalizedEmail = data.email.toLowerCase().trim();
    if (this.findUserByEmail(normalizedEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    // STRICT: Public registration can NEVER create an admin
    const salt = bcrypt.genSaltSync(12);
    const id = `user-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const newUser: DbUser = {
      id,
      name: data.name.trim(),
      email: normalizedEmail,
      role: 'client', // Forced to client
      company: data.company,
      phone: data.phone,
      passwordHash: bcrypt.hashSync(data.password, salt),
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    persistToDisk();

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      company: newUser.company,
      phone: newUser.phone,
    };
  },

  // --- Shipments ---
  findAllShipments(filter?: { movementStatus?: string; bookingStatus?: string; search?: string; userId?: string }): Shipment[] {
    let result = [...db.shipments];

    if (filter?.userId) {
      result = result.filter(s => s.userId === filter.userId);
    }

    if (filter?.movementStatus && filter.movementStatus !== 'All') {
      result = result.filter(s => s.movementStatus.toLowerCase() === filter.movementStatus?.toLowerCase());
    }

    if (filter?.bookingStatus && filter.bookingStatus !== 'All') {
      result = result.filter(s => s.bookingStatus.toLowerCase() === filter.bookingStatus?.toLowerCase());
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(s =>
        s.trackingNumber.toLowerCase().includes(q) ||
        s.consignmentNumber.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.sender.city.toLowerCase().includes(q) ||
        s.recipient.city.toLowerCase().includes(q) ||
        s.recipient.name.toLowerCase().includes(q) ||
        s.carrier.name.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  findShipmentById(id: string): Shipment | undefined {
    return db.shipments.find(s => s.id === id);
  },

  findShipmentByTrackingNumberOrToken(identifier: string): Shipment | undefined {
    const clean = identifier.trim();
    return db.shipments.find(
      s => s.trackingNumber.toUpperCase() === clean.toUpperCase() ||
           s.consignmentNumber.toUpperCase() === clean.toUpperCase() ||
           s.trackingToken === clean
    );
  },

  createShipment(input: CreateShipmentInput, userId: string): Shipment {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const countryCode = (input.recipient.country.slice(0, 2) || 'GL').toUpperCase();
    const trackingNumber = `FP-${randNum}-${countryCode}`;
    const consignmentNumber = `CN-2026-${randNum}`;
    const trackingToken = generateTrackingToken();
    const now = new Date().toISOString();

    // Standard business pricing calculation based on weight & service
    const perKgRate = input.serviceType === 'Air Express' ? 8.5 : input.serviceType === 'Cold Chain Express' ? 13.5 : input.serviceType === 'Standard Freight' ? 3.2 : 1.4;
    const baseHandling = input.serviceType === 'Air Express' ? 120 : 65;
    const calculatedAmount = Math.round(baseHandling + input.cargoDetails.weightKg * perKgRate);

    const deliveryDays = input.serviceType === 'Air Express' ? 2 : input.serviceType === 'Cold Chain Express' ? 3 : input.serviceType === 'Standard Freight' ? 5 : 14;
    const estimatedDelivery = new Date(Date.now() + deliveryDays * 24 * 3600 * 1000).toISOString();

    const originHub = {
      name: `${input.sender.city} Cargo Gateway`,
      city: input.sender.city,
      country: input.sender.country,
      code: (input.sender.city.slice(0, 3) || 'ORG').toUpperCase(),
      lat: input.sender.lat || 50.0,
      lng: input.sender.lng || 8.5,
    };

    const destinationHub = {
      name: `${input.recipient.city} International Terminal`,
      city: input.recipient.city,
      country: input.recipient.country,
      code: (input.recipient.city.slice(0, 3) || 'DST').toUpperCase(),
      lat: input.recipient.lat || 40.7,
      lng: input.recipient.lng || -74.0,
    };

    const newShipment: Shipment = {
      id: `shp-${Date.now()}`,
      trackingNumber,
      consignmentNumber,
      trackingToken,
      title: input.title,

      // CRITICAL: Newly created shipments are never automatically In Transit
      bookingStatus: 'Awaiting Admin Review',
      paymentStatus: 'Awaiting Payment',
      movementStatus: 'Awaiting Dispatch',
      status: 'Awaiting Dispatch',

      serviceType: input.serviceType,
      sender: input.sender,
      recipient: input.recipient,
      originHub,
      destinationHub,
      currentLocation: {
        name: `${input.sender.city} Consignment Collection Point`,
        city: input.sender.city,
        country: input.sender.country,
        lat: originHub.lat,
        lng: originHub.lng,
      },
      cargoDetails: input.cargoDetails,
      carrier: {
        name: input.carrierName || 'Freight Plus Logistics Network',
        serviceLevel: input.serviceType,
        sealNumber: `SEAL-${randNum}-A`,
      },
      pricing: {
        baseAmount: calculatedAmount,
        handlingFee: baseHandling,
        totalAmount: calculatedAmount,
        currency: 'USD',
        payer: input.payer || 'sender',
      },
      holdDetails: {
        isOnHold: false,
      },
      estimatedDelivery,
      dispatchDate: null,
      actualDelivery: null,
      signatureRequired: input.signatureRequired ?? true,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
      userId,
      milestones: [
        {
          id: `ms-${Date.now()}-1`,
          status: 'Awaiting Dispatch',
          title: 'Booking Received — Awaiting Admin Review',
          location: `${input.sender.city} Booking Portal`,
          city: input.sender.city,
          country: input.sender.country,
          timestamp: now,
          notes: `Consignment created with ${input.serviceType} service tier. Awaiting payment and dispatch authorization.`,
          operator: 'System Automation',
          completed: true,
          lat: originHub.lat,
          lng: originHub.lng,
        },
      ],
    };

    db.shipments.unshift(newShipment);
    persistToDisk();
    return newShipment;
  },

  updateShipment(id: string, updates: Partial<Shipment>): Shipment | undefined {
    const index = db.shipments.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    const current = db.shipments[index];
    const updated: Shipment = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (updates.movementStatus) {
      updated.status = updates.movementStatus;
    }

    db.shipments[index] = updated;
    persistToDisk();
    return updated;
  },

  // Place Shipment on Hold
  placeShipmentOnHold(id: string, reason: string, customerExplanation: string, adminUser: User): Shipment | undefined {
    const shipment = db.shipments.find(s => s.id === id);
    if (!shipment) return undefined;

 const now = new Date().toISOString();

// Save simulated journey progress before changing the status.
let progressAtPause = 30;

if (
  shipment.journeyStartedAt &&
  shipment.journeyDurationSeconds &&
  shipment.journeyDurationSeconds > 0
) {
  const startTime = new Date(shipment.journeyStartedAt).getTime();

  if (Number.isFinite(startTime)) {
    const elapsedSeconds = Math.max(
      0,
      (Date.now() - startTime) / 1000 -
        (shipment.journeyPausedElapsedSeconds ?? 0)
    );

    progressAtPause = Math.min(
      85,
      Math.max(
        30,
        Math.round(
          (elapsedSeconds / shipment.journeyDurationSeconds) * 100
        )
      )
    );
  }
}

shipment.journeyPausedAt = now;
shipment.journeyProgressAtPause = progressAtPause;

shipment.movementStatus = 'On Hold';
shipment.status = 'On Hold';
shipment.holdDetails = {
  isOnHold: true,
  reason,
  customerExplanation,
  placedOnHoldAt: now,
};
shipment.updatedAt = now;

if (
  shipment.journeyStartedAt &&
  shipment.journeyDurationSeconds &&
  shipment.journeyDurationSeconds > 0
) {
  const startTime = new Date(shipment.journeyStartedAt).getTime();

  if (Number.isFinite(startTime)) {
    const elapsedSeconds = Math.max(
      0,
      (Date.now() - startTime) / 1000 -
        (shipment.journeyPausedElapsedSeconds ?? 0)
    );

    progressAtPause = Math.min(
      85,
      Math.max(
        30,
        Math.round(
          (elapsedSeconds / shipment.journeyDurationSeconds) * 100
        )
      )
    );
  }
}

shipment.journeyPausedAt = now;
shipment.journeyProgressAtPause = progressAtPause;

    // Add milestone event
    shipment.milestones.push({
      id: `ms-hold-${Date.now()}`,
      status: 'On Hold',
      title: 'Operational Hold Placed',
      location: shipment.currentLocation.name,
      city: shipment.currentLocation.city,
      country: shipment.currentLocation.country,
      timestamp: now,
      notes: customerExplanation,
      operator: adminUser.name,
      completed: true,
      lat: shipment.currentLocation.lat,
      lng: shipment.currentLocation.lng,
    });

    // Record audit log
    this.recordAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'PLACE_HOLD',
      targetId: shipment.id,
      details: { reason, customerExplanation },
    });

    persistToDisk();
    return shipment;
  },

  // Resume Shipment from Hold
  resumeShipmentFromHold(id: string, revisedEstimate: string | undefined, resumptionNote: string | undefined, adminUser: User): Shipment | undefined {
    const shipment = db.shipments.find(s => s.id === id);
    if (!shipment) return undefined;

    const now = new Date().toISOString();
    shipment.movementStatus = 'In Transit';
    shipment.status = 'In Transit';
    shipment.holdDetails = {
      ...shipment.holdDetails,
      isOnHold: false,
      resumedAt: now,
    };
    if (revisedEstimate) {
      shipment.estimatedDelivery = revisedEstimate;
    }
    shipment.updatedAt = now;
// Exclude the time spent on hold from the active journey duration.
if (shipment.journeyPausedAt) {
  const pausedAtTime = new Date(shipment.journeyPausedAt).getTime();

  if (Number.isFinite(pausedAtTime)) {
    const holdDurationSeconds = Math.max(
      0,
      Math.round((Date.now() - pausedAtTime) / 1000)
    );

    shipment.journeyPausedElapsedSeconds =
      (shipment.journeyPausedElapsedSeconds ?? 0) +
      holdDurationSeconds;
  }
}

shipment.journeyPausedAt = null;
shipment.journeyProgressAtPause = undefined;
    // Add milestone event
    shipment.milestones.push({
      id: `ms-resume-${Date.now()}`,
      status: 'In Transit',
      title: 'Operational Hold Cleared — Transit Resumed',
      location: shipment.currentLocation.name,
      city: shipment.currentLocation.city,
      country: shipment.currentLocation.country,
      timestamp: now,
      notes: resumptionNote || 'Verification completed. Consignment released for onward routing.',
      operator: adminUser.name,
      completed: true,
      lat: shipment.currentLocation.lat,
      lng: shipment.currentLocation.lng,
    });

    this.recordAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'RESUME_HOLD',
      targetId: shipment.id,
      details: { revisedEstimate, resumptionNote },
    });

    persistToDisk();
    return shipment;
  },

  // Add Location Milestone
  addMilestone(id: string, input: AddMilestoneInput, adminUser: User): Shipment | undefined {
    const shipment = db.shipments.find(s => s.id === id);
    if (!shipment) return undefined;

    const timestamp = input.timestamp || new Date().toISOString();
    const newMilestone = {
      id: `ms-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      status: input.status,
      title: input.title,
      location: input.location,
      city: input.city,
      country: input.country,
      timestamp,
      notes: input.notes,
      operator: input.operator || adminUser.name,
      completed: true,
      lat: input.lat || shipment.destinationHub.lat,
      lng: input.lng || shipment.destinationHub.lng,
    };

    shipment.movementStatus = input.status;
    shipment.status = input.status;
    shipment.currentLocation = {
      name: input.location,
      city: input.city,
      country: input.country,
      lat: newMilestone.lat,
      lng: newMilestone.lng,
    };
    shipment.updatedAt = timestamp;

    if (input.status === 'Delivered') {
      shipment.actualDelivery = timestamp;
    }

    shipment.milestones.push(newMilestone);
    persistToDisk();
    return shipment;
  },

  deleteShipment(id: string): boolean {
    const initLen = db.shipments.length;
    db.shipments = db.shipments.filter(s => s.id !== id);
    const deleted = db.shipments.length < initLen;
    if (deleted) {
      persistToDisk();
    }
    return deleted;
  },

  getStats(): ShipmentStats {
    return {
      totalShipments: db.shipments.length,
      awaitingReview: db.shipments.filter(s => s.bookingStatus === 'Awaiting Admin Review').length,
      inTransit: db.shipments.filter(s => s.movementStatus === 'In Transit' || s.movementStatus === 'Out for Delivery').length,
      onHold: db.shipments.filter(s => s.movementStatus === 'On Hold').length,
      delivered: db.shipments.filter(s => s.movementStatus === 'Delivered').length,
      awaitingPayment: db.shipments.filter(s => s.paymentStatus === 'Awaiting Payment').length,
      totalWeightKg: Math.round(db.shipments.reduce((acc, s) => acc + (s.cargoDetails.weightKg || 0), 0) * 10) / 10,
    };
  },

  recordAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    db.auditLogs.unshift({
      id: `log-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      ...log,
      timestamp: new Date().toISOString(),
    });
    persistToDisk();
  },

 getAuditLogs(): AuditLog[] {
return db.auditLogs.slice(0, 100);
},

getSupportMessages(shipmentId: string): SupportMessage[] {
  return db.supportMessages
    .filter(message => message.shipmentId === shipmentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
},

addSupportMessage(
  message: Omit<SupportMessage, 'id' | 'createdAt'>
): SupportMessage {
  const newMessage: SupportMessage = {
    ...message,
    id: `msg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    createdAt: new Date().toISOString(),
  };

  db.supportMessages.push(newMessage);
  persistToDisk();

  return newMessage;
},

getRecipientSupportMessages(
  shipmentId: string
): RecipientSupportMessage[] {
  return db.recipientSupportMessages
    .filter(message => message.shipmentId === shipmentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
},

addRecipientSupportMessage(
  message: Omit<RecipientSupportMessage, 'id' | 'createdAt'>
): RecipientSupportMessage {
  const newMessage: RecipientSupportMessage = {
    ...message,
    id: `recipient-msg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    createdAt: new Date().toISOString(),
  };

  db.recipientSupportMessages.push(newMessage);
  persistToDisk();

  return newMessage;
},
};