/**
 * PharmaDesk Automatic Update Service
 * Powered by electron-updater with GitHub Releases distribution.
 * Protects SQLite database with pre-update safety backup.
 */

const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

class UpdaterService {
  constructor() {
    this.mainWindow = null;
    this.isChecking = false;
    this.isDownloading = false;
    this.updateInfo = null;
    this.downloadProgress = null;
    this.updateDownloaded = false;
    this.lastError = null;

    // Configure electron-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;

    // Logging
    autoUpdater.logger = {
      info: (msg) => console.log('[Updater:info]', msg),
      warn: (msg) => console.warn('[Updater:warn]', msg),
      error: (msg) => console.error('[Updater:error]', msg),
    };

    this.setupListeners();
  }

  init(window) {
    this.mainWindow = window;
    this.initializeAutoCheck();
  }

  broadcast(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    });
  }

  setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      this.isChecking = true;
      this.lastError = null;
      console.log('[Updater] Checking for updates...');
      this.broadcast('updater:status', {
        status: 'checking',
        message: 'Checking for updates on GitHub Releases...',
      });
    });

    autoUpdater.on('update-available', (info) => {
      this.isChecking = false;
      this.updateInfo = info;
      this.lastError = null;
      console.log(`[Updater] Update available: v${info.version}`);
      
      this.saveLastCheckStatus(`Update v${info.version} available`);

      this.broadcast('updater:status', {
        status: 'available',
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes || 'Bug fixes, performance improvements, and feature updates.',
        currentVersion: app.getVersion(),
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      this.isChecking = false;
      this.updateInfo = null;
      this.lastError = null;
      console.log('[Updater] App is up to date.');
      
      this.saveLastCheckStatus('Up to date');

      this.broadcast('updater:status', {
        status: 'not-available',
        version: info?.version || app.getVersion(),
        currentVersion: app.getVersion(),
        message: 'You are using the latest version of PharmaDesk.',
      });
    });

    autoUpdater.on('error', (err) => {
      this.isChecking = false;
      this.isDownloading = false;
      const cleanMessage = err?.message || 'Update check failed.';
      this.lastError = cleanMessage;
      console.error('[Updater] Error:', cleanMessage);

      this.saveLastCheckStatus(`Check failed: ${cleanMessage.slice(0, 60)}`);

      this.broadcast('updater:status', {
        status: 'error',
        message: cleanMessage,
        currentVersion: app.getVersion(),
      });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.isDownloading = true;
      this.downloadProgress = progressObj;
      const percent = Math.round(progressObj.percent || 0);

      this.broadcast('updater:status', {
        status: 'downloading',
        percent,
        bytesPerSecond: progressObj.bytesPerSecond || 0,
        transferred: progressObj.transferred || 0,
        total: progressObj.total || 0,
        version: this.updateInfo?.version || '',
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.isDownloading = false;
      this.updateDownloaded = true;
      console.log('[Updater] Update package downloaded successfully.');

      this.broadcast('updater:status', {
        status: 'downloaded',
        version: info.version,
        releaseNotes: info.releaseNotes || this.updateInfo?.releaseNotes || '',
        message: `PharmaDesk v${info.version} is ready to install.`,
      });
    });
  }

  saveLastCheckStatus(statusText) {
    try {
      const { getDb } = require('./database');
      const db = getDb();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('last_update_check', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(now);

      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('last_update_status', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(statusText);
    } catch (e) {
      // Non-critical
    }
  }

  async checkForUpdates(isManual = false) {
    if (this.isChecking || this.isDownloading) {
      return { status: 'busy', message: 'An update operation is already in progress.' };
    }
    try {
      console.log(`[Updater] Triggering update check (manual: ${isManual})...`);
      const result = await autoUpdater.checkForUpdates();
      return { success: true, result };
    } catch (err) {
      const msg = err?.message || 'Failed to check for updates.';
      this.lastError = msg;
      return { success: false, error: msg };
    }
  }

  async downloadUpdate() {
    if (this.isDownloading) {
      return { status: 'already_downloading' };
    }
    try {
      this.isDownloading = true;
      console.log('[Updater] Starting update package download...');
      this.broadcast('updater:status', {
        status: 'downloading',
        percent: 0,
        transferred: 0,
        total: 0,
        version: this.updateInfo?.version || '',
      });
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      this.isDownloading = false;
      const msg = err?.message || 'Download failed.';
      this.lastError = msg;
      return { success: false, error: msg };
    }
  }

  async createPreUpdateBackup() {
    try {
      const { getDb } = require('./database');
      const db = getDb();
      const backupDir = path.join(app.getPath('userData'), 'backups', 'pre-update');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(
        backupDir,
        `pharmadesk_pre_update_v${app.getVersion()}_${timestamp}.db`
      );
      await db.backup(backupFile);
      console.log('[Updater] Pre-update safety backup successfully created at:', backupFile);
      return backupFile;
    } catch (e) {
      console.warn('[Updater] Pre-update database safety backup warning:', e.message);
      return null;
    }
  }

  async installUpdate(isTransactionInProgress = false) {
    if (isTransactionInProgress) {
      throw new Error(
        'A sale or cart checkout is currently active! Please complete or hold the sale before restarting PharmaDesk.'
      );
    }

    if (!this.updateDownloaded) {
      throw new Error('Update is not yet downloaded. Please download the update first.');
    }

    console.log('[Updater] Initiating pre-update safety backup...');
    await this.createPreUpdateBackup();

    console.log('[Updater] Restarting application and executing update...');
    // autoUpdater.quitAndInstall(isSilent = false, isForceRunAfter = true)
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  }

  initializeAutoCheck() {
    // Non-blocking delayed check on launch
    setTimeout(async () => {
      try {
        const { getDb } = require('./database');
        const db = getDb();
        const autoCheckSetting = db.prepare(
          "SELECT value FROM settings WHERE key='auto_update_check'"
        ).get()?.value;

        // Enabled by default unless explicitly turned off
        if (autoCheckSetting !== '0') {
          console.log('[Updater] Running silent background update check...');
          this.checkForUpdates(false).catch((err) => {
            console.log('[Updater] Silent startup check skipped/offline:', err.message);
          });
        }
      } catch (err) {
        console.warn('[Updater] Silent startup check skipped:', err.message);
      }
    }, 6000);
  }

  getConfig() {
    let autoUpdate = '1';
    let lastCheck = '';
    let lastStatus = '';
    try {
      const { getDb } = require('./database');
      const db = getDb();
      autoUpdate = db.prepare("SELECT value FROM settings WHERE key='auto_update_check'").get()?.value ?? '1';
      lastCheck = db.prepare("SELECT value FROM settings WHERE key='last_update_check'").get()?.value ?? '';
      lastStatus = db.prepare("SELECT value FROM settings WHERE key='last_update_status'").get()?.value ?? '';
    } catch (_) {}

    return {
      currentVersion: app.getVersion(),
      autoUpdateCheck: autoUpdate === '1',
      lastUpdateCheck: lastCheck,
      lastUpdateStatus: lastStatus,
      isChecking: this.isChecking,
      isDownloading: this.isDownloading,
      updateDownloaded: this.updateDownloaded,
      updateInfo: this.updateInfo,
    };
  }

  setConfig(config) {
    try {
      const { getDb } = require('./database');
      const db = getDb();
      if (config.autoUpdateCheck !== undefined) {
        const val = config.autoUpdateCheck ? '1' : '0';
        db.prepare(`
          INSERT INTO settings (key, value) VALUES ('auto_update_check', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(val);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

const updaterService = new UpdaterService();
module.exports = updaterService;

