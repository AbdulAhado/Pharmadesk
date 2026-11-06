/**
 * PharmaDesk Licensing IPC Handlers
 * Handles communication between React UI and License/Trial services.
 */

const { getLicenseStatus, saveSignedLicense, deactivateLocalLicense, recordTimeCheckpoint } = require('../services/licenseService');
const { getDeviceId, getDeviceInfo } = require('../services/deviceService');
const { getDb } = require('../services/database');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

// Configurable Licensing Server URL (default localhost:5000 in dev, configurable via settings)
function getLicensingServerUrl() {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'licensing_server_url'").get();
    if (row && row.value) return row.value.trim().replace(/\/+$/, '');
  } catch (_) {}
  return process.env.PHARMADESK_LICENSING_SERVER || 'http://localhost:5000';
}

/**
 * Lightweight HTTP/HTTPS JSON fetch helper (no extra dependencies).
 */
function requestJson(url, options = {}, payload = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PharmaDesk-Desktop/1.0',
        ...(options.headers || {}),
      },
      timeout: 10000,
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            const err = new Error(json.message || `Request failed with status ${res.statusCode}`);
            err.statusCode = res.statusCode;
            err.data = json;
            reject(err);
          }
        } catch (e) {
          reject(new Error(`Failed to parse server response (${res.statusCode})`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Licensing server unavailable: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection to licensing server timed out. Please check your internet connection.'));
    });

    if (payload) {
      req.write(JSON.stringify(payload));
    }
    req.end();
  });
}

// Default standard plans
const DEFAULT_PLANS = [
  { id: 'TRIAL', name: 'Free Trial', durationDays: 14, pricePKR: 0, description: '14-Day Free Evaluation' },
  { id: 'MONTHLY', name: 'Monthly Plan', durationDays: 30, pricePKR: 2500, description: 'Standard Monthly Pharmacy License' },
  { id: 'YEARLY', name: 'Yearly Plan (Best Value)', durationDays: 365, pricePKR: 24000, description: 'Annual License with Priority Support' },
  { id: 'LIFETIME', name: 'Lifetime Membership', durationDays: null, pricePKR: 75000, description: 'One-Time Payment, Lifetime Access' },
];

module.exports = function(ipcMain) {

  // 1. Get current consolidated status
  ipcMain.handle('license:getStatus', async () => {
    return getLicenseStatus();
  });

  // 2. Get hardware device information
  ipcMain.handle('license:getDeviceInfo', async () => {
    return getDeviceInfo();
  });

  // 3. Get plans list (tries online server, falls back to local config)
  ipcMain.handle('license:getPlans', async () => {
    try {
      const serverUrl = getLicensingServerUrl();
      const res = await requestJson(`${serverUrl}/api/v1/plans`);
      if (res && res.plans && Array.isArray(res.plans)) {
        return res.plans;
      }
    } catch (_) {}
    return DEFAULT_PLANS;
  });

  // 4. Activate License online
  ipcMain.handle('license:activate', async (_, { licenseKey, pharmacyName, customerEmail, customerPhone }) => {
    if (!licenseKey || !licenseKey.trim()) {
      throw new Error('Please enter a valid License Activation Key.');
    }

    const deviceId = getDeviceId();
    const serverUrl = getLicensingServerUrl();

    // Call licensing backend
    const response = await requestJson(`${serverUrl}/api/v1/licenses/activate`, { method: 'POST' }, {
      licenseKey: licenseKey.trim().toUpperCase(),
      deviceId,
      pharmacyName: pharmacyName || undefined,
      customerEmail: customerEmail || undefined,
      customerPhone: customerPhone || undefined,
    });

    if (!response.licenseEnvelope) {
      throw new Error('Server returned incomplete activation data.');
    }

    // Save and cryptographically verify locally
    const status = saveSignedLicense(response.licenseEnvelope);
    return { success: true, status, message: response.message || 'PharmaDesk activated successfully!' };
  });

  // 5. Submit a renewal request (manual payment or online)
  ipcMain.handle('license:requestRenewal', async (_, { requestedPlan, customerName, customerPhone, paymentReference, notes }) => {
    const deviceId = getDeviceId();
    const serverUrl = getLicensingServerUrl();
    const db = getDb();
    const requestId = crypto.randomUUID();
    const requestNumber = `RNW-${Date.now().toString().slice(-6)}`;

    // Record locally in SQLite
    db.prepare(`
      INSERT INTO renewal_requests (id, request_number, customer_id, pharmacy_name, device_id, requested_plan, payment_reference, status, admin_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `).run(
      requestId,
      requestNumber,
      customerPhone || null,
      customerName || 'My Pharmacy',
      deviceId,
      requestedPlan,
      paymentReference || null,
      notes || null
    );

    // Send to licensing backend if connected
    let serverAccepted = false;
    try {
      await requestJson(`${serverUrl}/api/v1/renewal-requests`, { method: 'POST' }, {
        requestNumber,
        deviceId,
        requestedPlan,
        customerName,
        customerPhone,
        paymentReference,
        notes,
      });
      serverAccepted = true;
    } catch (err) {
      console.warn('[LicenseIPC] Remote renewal submission offline:', err.message);
    }

    return {
      success: true,
      requestNumber,
      serverAccepted,
      message: serverAccepted
        ? 'Renewal request submitted to licensing server! Admin will approve upon payment verification.'
        : 'Renewal request recorded locally. Connect to internet or contact support with Request Number: ' + requestNumber,
    };
  });

  // 6. Check renewal status online & download new signed license
  ipcMain.handle('license:checkRenewalStatus', async () => {
    const deviceId = getDeviceId();
    const serverUrl = getLicensingServerUrl();

    const response = await requestJson(`${serverUrl}/api/v1/licenses/status?deviceId=${encodeURIComponent(deviceId)}`);

    if (response && response.licenseEnvelope) {
      // Server has issued a valid signed license
      const status = saveSignedLicense(response.licenseEnvelope);
      return {
        isRenewed: true,
        status,
        message: 'New subscription license verified and renewed successfully!',
      };
    }

    return {
      isRenewed: false,
      pendingRequests: response.pendingRequests || 0,
      message: response.message || 'No approved renewal license ready yet. Please wait for admin approval.',
    };
  });

  // 7. Manual Offline License File/String import
  ipcMain.handle('license:importOfflineLicense', async (_, licenseEnvelopeRaw) => {
    let envelope = licenseEnvelopeRaw;
    if (typeof envelope === 'string') {
      try {
        envelope = JSON.parse(envelope.trim());
      } catch (e) {
        throw new Error('Invalid license format. Must be a valid PharmaDesk license JSON.');
      }
    }

    const status = saveSignedLicense(envelope);
    return { success: true, status, message: 'Offline license verified and activated successfully!' };
  });

  // 8. Deactivate license
  ipcMain.handle('license:deactivate', async () => {
    const status = deactivateLocalLicense();
    return { success: true, status };
  });

  // 9. Update Licensing Server URL setting
  ipcMain.handle('license:setServerUrl', async (_, url) => {
    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('licensing_server_url', ?)").run(url);
    return { success: true, url };
  });

  ipcMain.handle('license:getServerUrl', async () => {
    return getLicensingServerUrl();
  });
};

