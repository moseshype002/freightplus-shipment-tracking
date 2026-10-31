# FreightPulse — Shipment & Consignment Tracking Platform

A complete, full-stack enterprise web application for shipment and consignment tracking, real-time milestone management, and cargo dispatch.

## Features

- **Public & Authenticated Track & Trace**: Live progress indicators, GPS corridor visualization, and milestone timelines.
- **Client Consignment Dashboard**: Commercial cargo management, high-density tabular view, filtering, and metric strips.
- **Cargo Booking Flow**: Shipper/consignee management, weight & dimension specs, dangerous goods & cold chain tracking, and real-time rate calculator.
- **Admin Dispatch Console**: Role-based access control, checkpoint appending, facility and operator logs, and instant status transitions.
- **Air Waybill (AWB) Generator**: Printable IATA-standard non-negotiable airway bill with Code-128 barcodes.
- **Full-Stack Express & TypeScript**: RESTful CRUD endpoints, JWT authentication with bcrypt password hashing, and flexible database store.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend**: Node.js, Express, tsx.
- **Authentication**: JSON Web Tokens (JWT), bcryptjs.
- **Database Support**: Built-in in-memory store with realistic seeds, ready for PostgreSQL (SQL DDL provided) or MongoDB (Mongoose models provided).

---

## Quick Start (Run Locally)

### 1. Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### 2. Installation
```bash
# Clone or extract this repository
cd freightpulse-shipment-tracking

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the provided `.env.example` to `.env`:
```bash
cp .env.example .env
```

Review and adjust variables in `.env` (optional for local testing; defaults work out of the box):
```env
PORT=3000
JWT_SECRET="freightpulse-super-secret-jwt-key-2026"
```

### 4. Start the Application
Run the full-stack server (runs Express API and Vite frontend on port 3000):
```bash
npm run dev
```

Open your browser at:
```
http://localhost:3000
```

---

## Default Demo Accounts

You can log in directly or use the **Quick Role Switcher** in the top navigation:
- **Admin Dispatcher**:
  - Email: `admin@freightpulse.com`
  - Password: `admin123`
  - Permissions: Full CRUD, checkpoint append, status override, seed reset.
- **Client Shipper**:
  - Email: `client@acmecorp.com`
  - Password: `client123`
  - Permissions: Consignment booking, track & trace, print AWB.

---

## Sample Tracking Numbers for Testing

- `FP-8942-US` — High-Precision Surgical Robotics & Sensors (Air Express: FRA ➔ JFK, In Transit)
- `FP-7104-DE` — Automated Industrial Controllers (Standard Freight: HND ➔ FRA, Customs Clearance)
- `FP-3329-SG` — Biotech Cold-Chain Cellular Therapies (Cold Chain Express: GVA ➔ SIN, Delivered)
- `FP-5512-UK` — Aerospace Composite Turbine Blades (Air Express: EMA ➔ DXB, Out for Delivery)
- `FP-1209-CA` — Automotive EV Battery Cell Packs (Standard Freight: ORD ➔ YUL, Pending Dispatch)

---

## Connecting External Databases

### Option A: PostgreSQL
1. Create a PostgreSQL database on Supabase, Neon, AWS RDS, or local Postgres.
2. Run the SQL schema from `src/server/db/schema.ts`.
3. Set `DATABASE_URL="postgresql://user:password@host:5432/dbname"` in `.env`.

### Option B: MongoDB
1. Create a database in MongoDB Atlas or local MongoDB.
2. Use the Mongoose schemas provided in `src/server/db/schema.ts`.
3. Set `MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/dbname"` in `.env`.

---

## Production Build & Deployment

```bash
# Build frontend client
npm run build

# Start production server
npm start
```
