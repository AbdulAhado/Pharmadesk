# PharmaDesk — Licensing & Subscription System Guide

> Complete documentation for the PharmaDesk Subscription, Licensing, and Offline Renewal system.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Ed25519 Key Management](#2-ed25519-key-management)
3. [Free Trial System](#3-free-trial-system)
4. [Subscription Plans](#4-subscription-plans)
5. [License Activation Flow](#5-license-activation-flow)
6. [Offline Usage & Renewal](#6-offline-usage--renewal)
7. [Read-Only Mode (Expired License)](#7-read-only-mode-expired-license)
8. [Anti-Tampering & Clock Rollback Protection](#8-anti-tampering--clock-rollback-protection)
9. [Device ID System](#9-device-id-system)
10. [Licensing Server Setup](#10-licensing-server-setup)
11. [Admin Dashboard](#11-admin-dashboard)
12. [Database Schema (Client-Side)](#12-database-schema-client-side)
13. [IPC API Reference](#13-ipc-api-reference)
14. [Deployment Checklist](#14-deployment-checklist)
15. [Troubleshooting](#15-troubleshooting)
16. [Security Notes & Limitations](#16-security-notes--limitations)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  PharmaDesk Desktop App                  │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ React UI │──│ Preload API  │──│  Electron Main    │  │
│  │          │  │ (contextBrg) │  │                   │  │
│  │ Subscrip-│  │              │  │ ┌───────────────┐ │  │
│  │ tion.jsx │  │ window.api.  │  │ │ trialService  │ │  │
│  │          │  │ license.*    │  │ │ licenseService│ │  │
│  │ POS.jsx  │  │              │  │ │ deviceService │ │  │
│  │ (r/o lck)│  │              │  │ │ database.js   │ │  │
│  └──────────┘  └──────────────┘  │ └───────────────┘ │  │
│                                  └─────────┬─────────┘  │
│                                            │            │
│                         SQLite (userData)   │            │
│                         device_identity.json│            │
└────────────────────────────────┬────────────┘
                                 │ HTTPS (activation/renewal only)
                                 ▼
                   ┌──────────────────────────┐
                   │   Licensing Server        │
                   │   (Node.js + Express)     │
                   │                           │
                   │   MongoDB Atlas / JSON DB │
                   │   Ed25519 Private Key     │
                   │   Admin Dashboard (SPA)   │
                   └──────────────────────────┘
```

**Key design principles:**

- **Offline-first:** The desktop app works 100% offline once activated. Internet is needed only for initial activation and renewals.
- **Cryptographic verification:** Licenses are Ed25519-signed by the server. The client verifies signatures with an embedded public key — no server round-trip needed.
- **Data safety:** Pharmacy business data (medicines, sales, purchases, inventory) is never deleted or damaged by license expiry. Expired licenses trigger read-only mode.
- **Separation of concerns:** Licensing state is stored in dedicated SQLite tables, completely separate from business data.

---

## 2. Ed25519 Key Management

### How It Works

PharmaDesk uses Ed25519 asymmetric cryptography for license signing:

| Component | Key | Location |
|-----------|-----|----------|
| Licensing Server | **Private Key** | `licensing-server/.env` → `ED25519_PRIVATE_KEY` |
| Desktop App | **Public Key** | Embedded in `electron/services/licenseService.js` |

The server signs license payloads with the private key. The desktop app verifies signatures with the embedded public key. This ensures licenses cannot be forged without the private key.

### Generating New Keys

If you need to generate a fresh Ed25519 key pair (e.g., for production):

```bash
cd licensing-server
node scripts/generateKeys.js
```

This outputs:
- A new **private key** (PEM format) — copy into your `.env` file.
- A new **public key** (PEM format) — replace the embedded key in `electron/services/licenseService.js`.

> ⚠️ **CRITICAL:** The private key must NEVER be included in the Electron app, client-side code, or any distributed binary. It stays on the server only.

### Current Development Keys

These keys are included for development and testing only. **Replace them before production deployment.**

**Public Key** (embedded in client):
```
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAhtHeu2JyyJEsHX9Vul6XNSZWvXAWKISWo0y1N0xruH8=
-----END PUBLIC KEY-----
```

**Private Key** (server `.env` only — keep secret, never commit):
```
-----BEGIN PRIVATE KEY-----
<YOUR_SECURE_ED25519_PRIVATE_KEY_BASE64>
-----END PRIVATE KEY-----
```

---

## 3. Free Trial System

### Behavior

| Aspect | Details |
|--------|---------|
| Duration | 14 days (configurable in `trialService.js`) |
| Trigger | Automatic on first application launch |
| Account Required | No |
| Application Access | Full access (all modules, POS, reports, etc.) |
| Storage Location | `%APPDATA%/PharmaDesk/pharmadesk.db` → `trial_state` table |

### Anti-Reset Protection

- Trial start date is stored with a SHA-256 salt hash.
- On each launch, the stored hash is verified. If tampered, the trial is marked expired.
- Reinstalling the app does not reset the trial because `userData` persists outside the installation directory.
- UTC high-water mark timestamps detect backward system clock changes.

### Trial Notifications

| Remaining Days | Notification |
|----------------|--------------|
| 7 days | Warning banner |
| 3 days | Urgent reminder |
| 1 day | Final warning |
| 0 days | Trial expired → read-only mode |

### Limitations (Documented Honestly)

A fully offline trial **cannot be made 100% tamper-proof**. A technically sophisticated user could:
- Delete or modify the `userData` directory.
- Manipulate the system clock and clear checkpoints.

This is a fundamental limitation of any offline trial system. The protections implemented are "best-effort" and sufficient for the target audience (pharmacy shop owners), but not cryptographically absolute.

---

## 4. Subscription Plans

All plans are configurable from the Admin Dashboard. Default plans:

| Plan | Duration | Device Limit |
|------|----------|-------------|
| Free Trial | 14 days | 1 |
| Monthly | 30 days | 1 |
| Yearly | 365 days | 3 |
| Lifetime | No expiry | 5 |
| Custom | Admin-defined | Admin-defined |

- Prices are **not hardcoded**. Set them via the Admin Dashboard.
- Plans can be created, modified, enabled, or disabled by the admin.
- No payment provider is assumed — the admin manually verifies payment and issues the license.

---

## 5. License Activation Flow

```
Customer                    Desktop App                  Licensing Server
   │                            │                              │
   │  1. Opens Subscription     │                              │
   │     page in Settings       │                              │
   │                            │                              │
   │  2. Copies Device ID       │                              │
   │     (PHD-XXXX-XXXX-...)    │                              │
   │                            │                              │
   │  3. Sends Device ID +      │                              │
   │     payment to admin       │                              │
   │     (WhatsApp/email/etc.)  ├──────────────────────────────│
   │                            │                              │
   │                            │  Admin creates license in    │
   │                            │  dashboard, enters Device ID │
   │                            │  and plan selection          │
   │                            │                              │
   │                            │  Server signs license with   │
   │                            │  Ed25519 private key         │
   │                            │                              │
   │  4. Receives activation    │                              │
   │     key from admin         │                              │
   │                            │                              │
   │  5. Enters activation key  │                              │
   │     in Subscription page   │                              │
   │                            │──── POST /api/license/       │
   │                            │     activate                 │
   │                            │                              │
   │                            │◄─── Signed license payload   │
   │                            │                              │
   │                            │  6. Verifies Ed25519         │
   │                            │     signature locally        │
   │                            │                              │
   │                            │  7. Stores verified license  │
   │                            │     in SQLite                │
   │                            │                              │
   │  ✓ Activated!              │                              │
   │  Can disconnect internet   │                              │
```

### Activation Key Entry

The customer enters the activation key in **Settings → License & Subscription → Activate License**.

### Offline License Import

For environments with no internet on the POS machine:
1. Admin generates a signed license file from the dashboard.
2. Customer transfers the `.json` license file via USB.
3. Customer imports it via **Settings → License & Subscription → Import Offline License**.

---

## 6. Offline Usage & Renewal

### During Active Subscription

- **No internet required.** The app verifies the locally stored signed license.
- All modules work normally: POS, sales, inventory, barcode scanning, reports, purchases.
- The app checks the local expiry date on each launch.

### Before Expiry — Renewal Reminders

| Days Before Expiry | Action |
|---------------------|--------|
| 7 days | Warning notification |
| 3 days | Urgent reminder |
| 1 day | Final warning |

### Renewal Process

1. Customer clicks **Renew Subscription** in the Subscription page.
2. App sends a renewal request to the licensing server (requires internet).
3. Admin approves the renewal in the Admin Dashboard.
4. Customer clicks **Check Renewal Status** in the app.
5. App downloads the new signed license and stores it locally.
6. Subscription extended — internet can be disconnected again.

### Manual / Offline Renewal

If the POS machine cannot connect to the internet:
1. Customer contacts admin with their Device ID.
2. Admin issues a new signed license from the dashboard.
3. Customer imports the license file via USB.

---

## 7. Read-Only Mode (Expired License)

When a trial or subscription expires, the app enters **read-only mode**:

### ✅ Still Accessible (Read-Only)

- View existing medicines, inventory, and stock levels
- View sales history and transaction records
- View purchase history
- View all reports (profit, sales, expiry)
- Export data (CSV, PDF)
- Database backup
- Settings (view and license management)

### 🔒 Locked (Requires Active License)

- POS checkout (F2 / Complete Sale disabled)
- Creating new purchases
- Adding new medicine entries

### UI Indicators

- **Header badge:** Shows "Expired" in red pill
- **POS page:** Red warning banner + checkout button disabled
- **Purchases page:** "New Purchase" button disabled with message
- **Subscription page:** Prominent renewal call-to-action

---

## 8. Anti-Tampering & Clock Rollback Protection

### UTC High-Water Mark

The app maintains a `time_checkpoints` table storing the highest-ever-seen UTC timestamp.

On each app launch:
1. Read the current system UTC time.
2. Compare against the stored high-water mark.
3. If current time is **earlier** than the stored checkpoint by more than 2 minutes (grace period), flag a clock rollback.
4. On rollback detection: the trial or license validation fails, and the user is alerted.

### Salt-Hash Verification (Trial)

Trial start/end dates are stored alongside a SHA-256 hash computed with a device-specific salt. If the dates are manually edited in the SQLite database, the hash verification fails and the trial is marked expired.

---

## 9. Device ID System

### Format

```
PHD-XXXX-XXXX-XXXX-XXXX
```

Example: `PHD-A3F2-9B1C-4D7E-8F06`

### Generation

The Device ID is derived from hardware identifiers:
- CPU model and core count
- Total system memory
- OS hostname
- Platform and architecture

These values are hashed (SHA-256) to produce a deterministic, stable ID that survives app reinstalls but changes if the hardware changes significantly.

### Persistence

The Device ID is stored in `%APPDATA%/PharmaDesk/device_identity.json` so it remains consistent across app restarts.

### Device Transfer

If a customer replaces their computer:
1. Admin opens the customer record in the Admin Dashboard.
2. Admin unbinds the old Device ID.
3. Customer installs PharmaDesk on the new machine.
4. Customer provides the new Device ID to the admin.
5. Admin issues a new license for the new Device ID.

---

## 10. Licensing Server Setup

### Prerequisites

- Node.js 18+ installed
- (Optional) MongoDB Atlas URI for persistent cloud storage

### Installation

```bash
cd licensing-server
npm install
```

### Configuration

Create a `.env` file (use `.env.example` as template):

```env
PORT=3456
JWT_SECRET=your-random-jwt-secret-here
ED25519_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n<YOUR_PRIVATE_KEY_BASE64>\n-----END PRIVATE KEY-----"
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/pharmadesk_licensing
ADMIN_USERNAME=admin@pharmadesk.pk
ADMIN_PASSWORD=your-secure-password
```

> If `MONGODB_URI` is not set, the server falls back to a persistent JSON file database (`licensing-server/data/`). This is suitable for small deployments.

### Seed Default Admin

```bash
# From the licensing-server directory:
node scripts/seedAdmin.js

# Or from the project root:
npm run licensing:seed
```

Default admin credentials:
- **Email:** Defined in your `.env` (`ADMIN_USERNAME`)
- **Password:** Defined in your `.env` (`ADMIN_PASSWORD`)

### Start the Server

```bash
# From the licensing-server directory:
node src/server.js

# Or from the project root:
npm run licensing:server
```

The server runs on `http://localhost:3456` by default.

### Production Deployment

For production, deploy the licensing server to:
- A VPS (DigitalOcean, Linode, etc.)
- A cloud service (Railway, Render, etc.)
- Your own infrastructure

Use a reverse proxy (Nginx/Caddy) with HTTPS. Example Nginx config:

```nginx
server {
    listen 443 ssl;
    server_name license.pharmadesk.pk;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3456;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Update the server URL in the desktop app: **Settings → License & Subscription → Server URL**.

---

## 11. Admin Dashboard

The Admin Dashboard is a self-contained SPA served at the licensing server root (`http://localhost:3456/`).

### Features

| Section | Capabilities |
|---------|-------------|
| **KPI Cards** | Total customers, active licenses, pending renewals, revenue |
| **Customer Directory** | View all customers, their device IDs, license status, expiry dates |
| **License Issuance** | Create new licenses: select customer, plan, device ID |
| **Renewal Approval** | View pending renewal requests, approve/reject |
| **Device Management** | Unbind devices from a customer's license |
| **Plan Management** | Create/edit/disable subscription plans |

### Access

1. Navigate to the server URL in a browser.
2. Log in with admin credentials.
3. The dashboard is fully responsive and works on desktop and mobile browsers.

---

## 12. Database Schema (Client-Side)

These tables are added by Migration v3 in `electron/services/database.js`:

### `license_state`

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Always 1 (singleton row) |
| license_key | TEXT | Activation key |
| license_data | TEXT | JSON: signed license payload |
| signature | TEXT | Ed25519 signature (base64) |
| status | TEXT | `ACTIVE`, `EXPIRED`, `REVOKED` |
| plan_name | TEXT | Subscription plan name |
| activated_at | TEXT | ISO 8601 activation timestamp |
| expires_at | TEXT | ISO 8601 expiry timestamp (null for lifetime) |
| device_id | TEXT | Bound device ID |
| server_url | TEXT | Licensing server URL |
| updated_at | TEXT | Last update timestamp |

### `trial_state`

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Always 1 (singleton row) |
| started_at | TEXT | Trial start date (ISO 8601) |
| expires_at | TEXT | Trial end date (ISO 8601) |
| is_active | INTEGER | 1 = active, 0 = expired |
| hash | TEXT | SHA-256 verification hash |
| updated_at | TEXT | Last update timestamp |

### `time_checkpoints`

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| checkpoint_utc | TEXT | Highest-seen UTC timestamp |
| context | TEXT | `trial` or `license` |
| created_at | TEXT | When checkpoint was recorded |

### `license_history`

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| action | TEXT | `ACTIVATED`, `RENEWED`, `EXPIRED`, `DEACTIVATED` |
| details | TEXT | JSON metadata |
| created_at | TEXT | Timestamp |

### `renewal_requests`

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| device_id | TEXT | Requesting device |
| current_plan | TEXT | Current plan name |
| requested_plan | TEXT | Desired plan |
| status | TEXT | `PENDING`, `APPROVED`, `REJECTED` |
| server_response | TEXT | JSON response from server |
| created_at | TEXT | Request timestamp |
| updated_at | TEXT | Last status change |

---

## 13. IPC API Reference

All IPC calls are exposed via `window.api.license` in the renderer process.

| Method | Description | Returns |
|--------|-------------|---------|
| `getStatus()` | Get current license/trial status | `{ status, plan, expiresAt, daysRemaining, isReadOnly, isTrial, deviceId }` |
| `getDeviceInfo()` | Get device ID and hardware info | `{ deviceId, platform, hostname }` |
| `getPlans()` | Fetch available plans from server | `[{ id, name, duration, price, deviceLimit }]` |
| `activate(activationKey)` | Activate a license with key | `{ success, message, license }` |
| `requestRenewal(planId)` | Submit renewal request to server | `{ success, requestId }` |
| `checkRenewalStatus()` | Check if renewal was approved | `{ success, status, license }` |
| `importOfflineLicense(licenseJson)` | Import a signed license file | `{ success, message }` |
| `deactivate()` | Deactivate current license | `{ success }` |
| `setServerUrl(url)` | Set the licensing server URL | `{ success }` |
| `getServerUrl()` | Get the current server URL | `{ url }` |

---

## 14. Deployment Checklist

### Before First Release

- [ ] Generate **production** Ed25519 key pair (`node scripts/generateKeys.js`).
- [ ] Replace the development public key in `electron/services/licenseService.js`.
- [ ] Set the production private key in the server `.env`.
- [ ] Change the default admin password.
- [ ] Set a strong `JWT_SECRET` in the server `.env`.
- [ ] Deploy the licensing server with HTTPS.
- [ ] Set the production server URL as the default in the desktop app.
- [ ] Configure subscription plan names, durations, and prices in the Admin Dashboard.
- [ ] Test the full activation → offline usage → renewal cycle.
- [ ] Build the installer: `npm run dist`.

### For Each Update

- [ ] Increment `version` in `package.json`.
- [ ] Ensure database migrations are backward-compatible.
- [ ] Test that existing licenses remain valid after the update.
- [ ] Verify that user data (`%APPDATA%/PharmaDesk`) is preserved.
- [ ] Build and distribute the new installer.

---

## 15. Troubleshooting

### "License verification failed"

- **Cause:** The embedded public key doesn't match the private key that signed the license.
- **Fix:** Ensure the public key in `licenseService.js` matches the private key in the server `.env`. Regenerate keys if needed.

### "Clock rollback detected"

- **Cause:** The system clock was set backward (intentionally or due to time sync issues).
- **Fix:** Correct the system clock to the current date/time and restart the app.

### Trial expired immediately after install

- **Cause:** A previous installation's trial data exists in `%APPDATA%/PharmaDesk`.
- **Fix:** This is by design (anti-reset protection). Purchase a subscription to continue.

### Device ID changed after hardware upgrade

- **Cause:** Significant hardware changes (CPU/RAM) cause a new Device ID.
- **Fix:** Contact admin to unbind the old device and issue a new license for the new Device ID.

### Cannot connect to licensing server

- **Cause:** Server URL incorrect, server down, or no internet.
- **Fix:** Verify the server URL in Settings → License & Subscription. Check internet connectivity. Contact admin.

### Offline license import fails

- **Cause:** The license file is corrupted, expired, or signed with a different key.
- **Fix:** Request a fresh license file from the admin. Ensure the file is valid JSON.

---

## 16. Security Notes & Limitations

### What IS Secure

- **License forgery protection:** Without the Ed25519 private key, valid licenses cannot be created. The private key never leaves the server.
- **License tampering protection:** Any modification to a signed license payload invalidates the signature.
- **Device binding:** Licenses are tied to specific hardware-derived Device IDs.

### What is NOT Fully Secure (Honest Disclosure)

- **Offline trial manipulation:** A technically sophisticated user could reset the trial by deleting `%APPDATA%/PharmaDesk` and spoofing hardware identifiers. This is an inherent limitation of any offline trial.
- **Clock manipulation:** While the high-water mark provides reasonable protection, a determined user could clear both the checkpoint data and adjust the clock. No purely local time source can be fully trusted without internet.
- **Binary reverse engineering:** A sufficiently skilled attacker could modify the Electron binary to bypass license checks. This is true of any client-side application. Code obfuscation (not implemented) provides only marginal additional protection.

### Recommendations for High-Security Deployments

1. Use **short-duration** licenses (monthly) so customers must reconnect regularly.
2. Implement server-side **usage telemetry** when the app is online.
3. Consider **code signing** the Electron binary with a certificate.
4. Use **Electron's asar** packing (already enabled by electron-builder).
5. Monitor the Admin Dashboard for suspicious activation patterns.

---

## File Reference

| File | Purpose |
|------|---------|
| `electron/services/trialService.js` | Free trial engine |
| `electron/services/licenseService.js` | License verification (Ed25519 public key) |
| `electron/services/deviceService.js` | Hardware-derived Device ID generation |
| `electron/services/database.js` | SQLite schema + Migration v3 |
| `electron/ipc/license.js` | IPC handlers for all license operations |
| `electron/preload.js` | `window.api.license` bridge |
| `electron/main.js` | IPC registration |
| `src/pages/Subscription.jsx` | License management UI |
| `src/pages/POS.jsx` | Read-only checkout lock |
| `src/pages/Purchases.jsx` | Read-only purchase lock |
| `src/App.jsx` | License status badge + routing |
| `licensing-server/src/server.js` | Express server entrypoint |
| `licensing-server/src/services/cryptoService.js` | Ed25519 signing |
| `licensing-server/src/controllers/` | API controllers |
| `licensing-server/public/index.html` | Admin Dashboard SPA |
| `licensing-server/scripts/generateKeys.js` | Key pair generator |
| `licensing-server/scripts/seedAdmin.js` | Database seeder |

---

*PharmaDesk Licensing System v1.0 — Documentation generated November 2026*

