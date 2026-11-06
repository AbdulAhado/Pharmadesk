<<<<<<< HEAD
<div align="center">

<img src="assets/pharma-removebg-preview.png" alt="PharmaDesk Logo" width="120" height="120" />

# PharmaDesk™
### Enterprise Pharmacy Management System & Cryptographic Licensing Suite

[![Electron](https://img.shields.io/badge/Electron-33.x-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Offline--First-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas_Cloud-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Ed25519](https://img.shields.io/badge/Security-Ed25519_Signed-0F766E?style=for-the-badge&logo=shield&logoColor=white)](#cryptographic-licensing-engine)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](#)

<p align="center">
  <b>A production-grade, offline-first pharmacy ERP and Point of Sale (POS) solution paired with an enterprise cryptographic licensing server and web control portal.</b>
</p>

[Key Features](#-key-features) •
[System Architecture](#-system-architecture) •
[Quick Start](#-quick-start) •
[Licensing Portal](#-licensing-portal-nextjs) •
[Security Architecture](#-security--cryptography) •
[Packaging & Build](#-packaging--release)

---

</div>

## 📑 Overview

**PharmaDesk** is a dual-system software suite engineered specifically for pharmacies, retail medical stores, and healthcare dispensaries:

1. **Desktop Client (Electron + React + SQLite)**: High-performance, offline-first desktop application with FEFO medicine tracking, rapid POS checkout, thermal printing, expense tracking, and optional MongoDB Atlas cloud backups.
2. **SaaS Admin Control Center (`license-admin/`)**: Next.js full-stack control dashboard deployed to Vercel/Node.js, communicating with MongoDB Atlas to remotely issue Ed25519-signed licenses, inspect payment slips, and manage hardware machine locks.

---

## ✨ Key Features

### 🛒 High-Speed Point of Sale (POS)
- **Sub-Second Barcode Scanning & Item Lookup**: Instant keyboard-driven medicine selection.
- **FEFO Dispensing (First-Expired, First-Out)**: Automatically routes the earliest-expiring batch first to eliminate stock wastage.
- **Dynamic Pricing & Discounts**: Support for item-level or bill-level discounts, tax breakdowns, and multiple payment methods (Cash, Card, Digital Wallets).
- **Thermal Receipt Printing**: Automatic ESC/POS thermal receipt formatting and silent printing support.

### 💊 Inventory & Batch Management
- **Multi-Batch Tracking**: Track batch numbers, manufacturer codes, purchase prices, retail prices, and expiry dates per SKU.
- **Expiry Warning Radar**: Real-time alerts for expired medicines, stocks expiring within 30/60/90 days, and low stock thresholds.
- **Purchase Orders & Supplier Ledgers**: Full supplier invoicing, purchase history, returns, and outstanding balance logs.

### 📊 Business Intelligence & Financials
- **Comprehensive Daily/Monthly Reports**: Sales volume, gross profit margins, inventory valuation, and top-selling medicines.
- **Expense Tracking**: Categorized overhead logging (rent, utilities, salaries, maintenance).
- **Offline-First Resilience**: All core transactions execute instantly against local embedded SQLite (`better-sqlite3`).

### ☁️ Hybrid Cloud Synchronization
- **One-Click & Scheduled Atlas Backup**: Optional background synchronization of medicine catalogs and sales to MongoDB Atlas.
- **Point-in-Time Restore**: Pull cloud snapshots into local SQLite with data integrity checks.

---

## 🔐 Cryptographic Licensing Engine

PharmaDesk features a commercial-grade, hardware-bound licensing mechanism designed to prevent software piracy while enabling seamless offline operation:

```
┌───────────────────────────────────────────────────────────────┐
│                     Client Machine (POS)                     │
│  Hardware ID: SHA-256(CPU ID + Motherboard UUID + MAC + Disk)  │
└───────────────────────────────┬───────────────────────────────┘
                                │ 1. Sends Machine Fingerprint
                                ▼
┌───────────────────────────────────────────────────────────────┐
│              SaaS Licensing Authority (Next.js)               │
│  Payload: { licenseId, deviceId, plan, expiryDate, version }  │
│  Ed25519 Signature: sign(SHA-256(canonicalPayload), PrivKey) │
└───────────────────────────────┬───────────────────────────────┘
                                │ 2. Issues Signed JSON Envelope
                                ▼
┌───────────────────────────────────────────────────────────────┐
│                     Client Machine (POS)                     │
│  Verification: verify(canonicalPayload, PubKey, Signature)    │
│  Result: 100% Offline-Verified Token Stored in SQLite         │
└───────────────────────────────────────────────────────────────┘
```

- **Hardware Fingerprinting**: Locks licenses to specific motherboard, processor, and system disk UUIDs.
- **Asymmetric Ed25519 Signing**: Fast, tamper-proof elliptic-curve digital signatures.
- **Clock Rollback Protection**: Monotonic UTC checkpoint logging prevents users from setting back system clocks to bypass expiration.
- **14-Day Automated Trial**: Auto-provisions an offline evaluation license upon fresh installation without requiring immediate network connectivity.

---

## 🏛 System Architecture

```
PharmaDesk Ecosystem
├── electron/                  # Electron Main Process & Native Backends
│   ├── ipc/                   # Secure IPC channels (POS, Inventory, Backup, License)
│   └── services/              # SQLite database, hardware fingerprinting, auto-updater
├── src/                       # React 18 Desktop Frontend
│   ├── pages/                 # POS, Inventory, Medicines, Purchases, Reports, Settings
│   └── assets/                # Visual branding, SVG vectors, icons
├── license-admin/             # Full-Stack Next.js 16 SaaS Licensing Authority
│   ├── src/app/               # App Router pages (Overview, Subscriptions, Renewals, Locks)
│   ├── src/app/api/           # RESTful endpoints for remote activation & validation
│   └── src/lib/               # MongoDB singleton client & Ed25519 signer
├── licensing-server/          # Standalone Express.js Microservice alternative
└── docs/                      # Architectural guides & release documentation
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Package Manager**: `npm` (v10+)
- **Build Tools (Windows)**: Visual Studio C++ Build Tools (required for native `better-sqlite3` compilation)

### 1. Installation
Clone the repository and install desktop dependencies:

```powershell
git clone https://github.com/YOUR_GITHUB_USERNAME/pharmadesk.git
cd pharmadesk
npm install
npm run rebuild
```

### 2. Launching Desktop App in Development Mode

```powershell
# Runs Vite HMR and launches Electron simultaneously
npm run dev
```

### 3. Running Unit & Integration Tests

```powershell
npm test
```

---

## 🌐 Licensing Portal (Next.js)

The SaaS Licensing Authority is located in `license-admin/` and is deployable to **Vercel** or any Node.js hosting platform.

### Local Setup:

```powershell
cd license-admin
npm install
cp .env.example .env.local
```

Configure your `.env.local`:
```env
MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.mongodb.net/pharmadesk_licensing?retryWrites=true&w=majority"
JWT_SECRET="<your-custom-jwt-secret>"
ADMIN_USERNAME="admin@pharmadesk.pk"
ADMIN_PASSWORD="<your-strong-password>"
ED25519_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
ED25519_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

Start the admin development server:
```powershell
npm run dev
# Open http://localhost:3000 in your browser
```

### Deploying to Vercel:
1. Import the repository on [Vercel](https://vercel.com).
2. Set **Root Directory** to `license-admin`.
3. Add the 6 environment variables from your `.env.local`.
4. Deploy!

---

## 📦 Packaging & Release

PharmaDesk includes an automated CI/CD pipeline via GitHub Actions (`.github/workflows/build-and-release.yml`).

To build a standalone Windows Installer locally:

```powershell
# Build frontend assets and bundle Windows NSIS installer
npm run build
npm run electron:build
```

Compiled installation artifacts will be output to:
- `dist/PharmaDesk Setup.exe` (Self-extracting NSIS installer)
- `dist/win-unpacked/` (Portable unpackaged directory)

---

## 🛡️ Security & Safe Git Practices

- **Zero Secrets in Git**: All private keys, JWT secrets, and database connection strings are managed strictly through environment variables.
- **Git Ignore Safeguards**: Database files (`*.sqlite`, `*.db`), installer binaries (`dist/*.exe`), `.env` files, and local build caches are permanently ignored.
- **Audited Commits**: Every change is scanned prior to repository push to prevent accidental credential leakage.

---

<div align="center">

**Developed with precision for modern healthcare operations.**

<sub>© 2026 PharmaDesk Systems. All rights reserved.</sub>

</div>
=======
# Pharmadesk
>>>>>>> origin/main
