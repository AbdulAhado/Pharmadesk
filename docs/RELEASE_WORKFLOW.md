# PharmaDesk – Release Workflow & Auto-Update Guide

This guide details the release, packaging, and automatic update system for **PharmaDesk – Medical Store POS**.

---

## 1. System Architecture Overview

```
                      [Developer / GitHub Repo]
                                 │
              Tagged commit (e.g., git tag v1.0.1)
                                 ▼
                     [GitHub Actions Workflow]
           (npm ci → npm test → npm run build → electron-builder)
                                 │
                                 ▼
                    [GitHub Releases Published]
        ├── PharmaDesk Setup.exe (NSIS Installer)
        ├── latest.yml (Release metadata + SHA512 hash)
        └── PharmaDesk Setup.exe.blockmap (Differential download map)
                                 │
                                 ▼
           [Installed Client Instances (PharmaDesk Desktop)]
     1. Client detects new release via background or manual check
     2. User clicks "Download Update" (progress bar displayed)
     3. Pre-update safety snapshot of SQLite database saved to:
        %APPDATA%/PharmaDesk/backups/pre-update/
     4. App restarts cleanly & executes NSIS update installer
     5. 100% of user records, inventory, batches, and sales remain intact
```

---

## 2. Database Protection & Zero Data Loss Guarantee

PharmaDesk is a medical store management system where business records are critical.

- **Offline SQLite Location:** The production database is always stored in Electron's `app.getPath('userData')`:
  `%APPDATA%\PharmaDesk\pharmadesk.db`
- **Installation Directory Independence:** The database is **never** placed inside `C:\Program Files\PharmaDesk\`.
- **NSIS Configuration:** `deleteAppDataOnUninstall: false` ensures that uninstalling or re-installing PharmaDesk will **never** delete user data.
- **Pre-Update Safety Backup:** Before executing any update restart, `updaterService.createPreUpdateBackup()` writes an online SQLite snapshot to:
  `%APPDATA%\PharmaDesk\backups\pre-update\pharmadesk_pre_update_v<version>_<timestamp>.db`
- **Schema Migrations:** Migrations are tracked sequentially in SQLite table `schema_migrations` inside atomic transactions. Existing columns, tables, and settings are preserved.

---

## 3. How to Release a New Version

### Step 1: Bump Semantic Version
Update the version field in `package.json`:
- Patch release (bug fixes): `1.0.0` → `1.0.1`
- Minor release (new features): `1.0.0` → `1.1.0`
- Major release (major changes): `1.0.0` → `2.0.0`

### Step 2: Run Tests & Build Verification
```bash
# 1. Run unit tests
npm test

# 2. Compile React frontend
npm run build

# 3. Test unpacked executable locally without installer
npm run dist:dir
```

### Step 3: Local Installer Generation (Optional)
To build `PharmaDesk Setup.exe` on your local machine:
```bash
npm run dist
```
The installer is generated in `dist/`:
- `dist/PharmaDesk Setup.exe`
- `dist/latest.yml`
- `dist/PharmaDesk Setup.exe.blockmap`

### Step 4: Tag & Publish via GitHub Actions
Push a git tag matching the version:
```bash
git add package.json
git commit -m "chore: release v1.0.1"
git tag v1.0.1
git push origin main --tags
```
GitHub Actions (`.github/workflows/build-and-release.yml`) will automatically:
1. Check out code and install dependencies.
2. Rebuild native modules (`better-sqlite3`).
3. Run tests and frontend compilation.
4. Execute `electron-builder --win --publish always`.
5. Create a GitHub Release containing `PharmaDesk Setup.exe`, `latest.yml`, and blockmaps.

---

## 4. End-User Pharmacy Experience

1. **First-Time Installation:**
   - Pharmacy owner runs `PharmaDesk Setup.exe`.
   - Setup wizard allows selecting custom installation folder (e.g. `C:\Program Files\PharmaDesk`).
   - Setup automatically creates Desktop and Start Menu shortcuts with the official PharmaDesk icon.
   - App launches immediately with full offline capabilities.

2. **Automatic Update Detection:**
   - On app launch, PharmaDesk silently checks GitHub Releases after 6 seconds.
   - If an update is detected, an update notification card appears at the bottom-right.
   - The user can also navigate to **Settings → Updates & About** and click **Check for Updates Now**.

3. **Safe Download & Installation:**
   - Clicking **Download Update** streams the update package with real-time progress and download rate display.
   - Once downloaded, the user can click **Install & Restart** whenever convenient.
   - If a sales transaction is active, the app blocks the restart until the transaction is completed or held.
   - The database snapshot is taken, the update is applied, and PharmaDesk restarts with all data intact.

