/**
 * PharmaDesk Ed25519 Digital License Verification & Management Service
 * Strictly offline-first verification using embedded public key.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const { getDb } = require('./database');
const { getDeviceId } = require('./deviceService');
const { initializeOrGetTrial } = require('./trialService');

// Embedded Official Ed25519 Public Key for PharmaDesk Desktop Applications
const ED25519_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAhtHeu2JyyJEsHX9Vul6XNSZWvXAWKISWo0y1N0xruH8=
-----END PUBLIC KEY-----`;

function getLicenseFilePath() {
  const userData = app.getPath('userData');
  return path.join(userData, 'pharmadesk_license.lic');
}

/**
 * Deterministic JSON stringifier to guarantee identical byte sequences for signing/verification.
 */
function canonicalizePayload(payload) {
  const sortedKeys = Object.keys(payload).sort();
  const sortedObj = {};
  for (const k of sortedKeys) {
    if (k !== 'signature' && payload[k] !== undefined) {
      sortedObj[k] = payload[k];
    }
  }
  return JSON.stringify(sortedObj);
}

/**
 * Verifies Ed25519 digital signature of license payload.
 */
function verifySignature(payload, signatureBase64) {
  try {
    const canonicalStr = canonicalizePayload(payload);
    const dataBuffer = Buffer.from(canonicalStr, 'utf8');
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');

    return crypto.verify(null, dataBuffer, ED25519_PUBLIC_KEY, signatureBuffer);
  } catch (err) {
    console.error('[LicenseService] Signature verification error:', err.message);
    return false;
  }
}

/**
 * Record a high-water mark timestamp checkpoint in SQLite to prevent system clock rollback.
 */
function recordTimeCheckpoint(source = 'SYSTEM_CHECK') {
  try {
    const db = getDb();
    const nowUtc = new Date().toISOString();

    // Check if current time is suspiciously behind existing highest checkpoint
    const highestRow = db.prepare('SELECT MAX(checkpoint_utc) AS max_time FROM time_checkpoints').get();
    if (highestRow && highestRow.max_time) {
      const highestTime = new Date(highestRow.max_time).getTime();
      const currentTime = new Date(nowUtc).getTime();

      // If machine time was set back by more than 4 hours, detect rollback
      if (currentTime < (highestTime - (4 * 60 * 60 * 1000))) {
        return {
          rollbackDetected: true,
          highestTime: highestRow.max_time,
          currentTime: nowUtc,
        };
      }
    }

    db.prepare(`
      INSERT INTO time_checkpoints (checkpoint_utc, source)
      VALUES (?, ?)
    `).run(nowUtc, source);

    return { rollbackDetected: false };
  } catch (err) {
    console.warn('[LicenseService] Checkpoint logging warning:', err.message);
    return { rollbackDetected: false };
  }
}

/**
 * Evaluates current license and trial status.
 */
function getLicenseStatus() {
  const db = getDb();
  const currentDeviceId = getDeviceId();
  const now = new Date();

  // Log checkpoint & check rollback
  const rollbackCheck = recordTimeCheckpoint('STATUS_QUERY');
  const isClockRollback = rollbackCheck.rollbackDetected;

  const licenseFilePath = getLicenseFilePath();
  let localLicense = null;

  // 1. Try reading from signed license file
  if (fs.existsSync(licenseFilePath)) {
    try {
      localLicense = JSON.parse(fs.readFileSync(licenseFilePath, 'utf8'));
    } catch (_) {}
  }

  // 2. Try reading from SQLite if file missing
  if (!localLicense) {
    const row = db.prepare('SELECT * FROM license_state WHERE id = 1 AND license_id IS NOT NULL').get();
    if (row && row.license_id) {
      try {
        localLicense = {
          payload: JSON.parse(row.raw_payload),
          signature: row.signature,
        };
      } catch (_) {}
    }
  }

  // ── CASE A: Paid / Signed License Exists ──
  if (localLicense && localLicense.payload && localLicense.signature) {
    const { payload, signature } = localLicense;

    // Verify cryptographic signature
    const isSignatureValid = verifySignature(payload, signature);
    const isDeviceMatched = payload.deviceId === currentDeviceId;

    if (!isSignatureValid || !isDeviceMatched) {
      console.warn('[LicenseService] Invalid signature or device mismatch!');
      return {
        status: 'EXPIRED',
        isReadOnly: true,
        isTrial: false,
        error: !isSignatureValid ? 'INVALID_SIGNATURE' : 'DEVICE_MISMATCH',
        plan: payload.plan || 'UNKNOWN',
        daysRemaining: 0,
        expiryDate: payload.expiryDate,
        isLifetime: Boolean(payload.isLifetime),
        pharmacyName: payload.pharmacyName || 'Pharmacy',
        deviceId: currentDeviceId,
        licenseId: payload.licenseId,
        message: 'License verification failed: Invalid digital signature or hardware binding mismatch.',
      };
    }

    // Check Lifetime
    if (payload.isLifetime) {
      return {
        status: 'ACTIVE',
        isReadOnly: false,
        isTrial: false,
        isLifetime: true,
        plan: 'LIFETIME',
        daysRemaining: 99999,
        expiryDate: null,
        pharmacyName: payload.pharmacyName || 'Pharmacy',
        deviceId: currentDeviceId,
        licenseId: payload.licenseId,
        activationDate: payload.activationDate,
      };
    }

    // Check Expiration Date
    const expiryDate = new Date(payload.expiryDate);
    const msRemaining = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    const isExpired = msRemaining <= 0 || isClockRollback;

    let status = 'ACTIVE';
    if (isExpired) {
      status = 'EXPIRED';
    } else if (daysRemaining <= 7) {
      status = 'WARNING';
    }

    // Update SQLite license_state
    db.prepare(`
      UPDATE license_state SET
        license_id=?, customer_id=?, pharmacy_name=?, device_id=?,
        plan=?, activation_date=?, expiry_date=?, is_lifetime=?, status=?,
        signature=?, raw_payload=?, last_validated_at=datetime('now'), updated_at=datetime('now')
      WHERE id = 1
    `).run(
      payload.licenseId,
      payload.customerId || null,
      payload.pharmacyName || null,
      currentDeviceId,
      payload.plan,
      payload.activationDate,
      payload.expiryDate,
      0,
      status,
      signature,
      JSON.stringify(payload)
    );

    return {
      status,
      isReadOnly: status === 'EXPIRED',
      isTrial: false,
      isLifetime: false,
      plan: payload.plan,
      daysRemaining,
      expiryDate: payload.expiryDate,
      activationDate: payload.activationDate,
      pharmacyName: payload.pharmacyName || 'Pharmacy',
      deviceId: currentDeviceId,
      licenseId: payload.licenseId,
      clockRollbackDetected: isClockRollback,
      reminders: {
        show7Day: daysRemaining <= 7 && daysRemaining > 3,
        show3Day: daysRemaining <= 3 && daysRemaining > 1,
        show1Day: daysRemaining === 1,
      },
    };
  }

  // ── CASE B: Free Trial Mode ──
  const trial = initializeOrGetTrial();
  const trialExpired = trial.isExpired || isClockRollback;
  const status = trialExpired ? 'EXPIRED' : (trial.daysRemaining <= 7 ? 'WARNING' : 'TRIAL');

  return {
    status,
    isReadOnly: trialExpired,
    isTrial: true,
    isLifetime: false,
    plan: 'FREE_TRIAL',
    daysRemaining: trial.daysRemaining,
    expiryDate: trial.expiresAt,
    activationDate: trial.startedAt,
    pharmacyName: 'Trial Pharmacy Store',
    deviceId: currentDeviceId,
    licenseId: `TRIAL-${currentDeviceId.slice(-8)}`,
    clockRollbackDetected: isClockRollback,
    reminders: {
      show7Day: trial.daysRemaining <= 7 && trial.daysRemaining > 3,
      show3Day: trial.daysRemaining <= 3 && trial.daysRemaining > 1,
      show1Day: trial.daysRemaining === 1,
    },
  };
}

/**
 * Activates a newly issued digitally signed license.
 */
function saveSignedLicense(licenseEnvelope) {
  const { payload, signature } = licenseEnvelope;
  if (!payload || !signature) {
    throw new Error('Malformed license payload or signature missing.');
  }

  const currentDeviceId = getDeviceId();
  if (payload.deviceId && payload.deviceId !== currentDeviceId) {
    throw new Error(`Device mismatch: License issued for ${payload.deviceId}, this device is ${currentDeviceId}`);
  }

  // Cryptographically verify before saving
  const isValid = verifySignature(payload, signature);
  if (!isValid) {
    throw new Error('Digital signature verification failed! The license file is corrupted or untrusted.');
  }

  // Write to userData file
  const filePath = getLicenseFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(licenseEnvelope, null, 2), 'utf8');

  // Write to SQLite
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO license_state (
      id, license_id, customer_id, pharmacy_name, device_id, plan,
      activation_date, expiry_date, is_lifetime, status, signature, raw_payload,
      last_validated_at, updated_at
    ) VALUES (
      1, ?, ?, ?, ?, ?,
      ?, ?, ?, 'ACTIVE', ?, ?,
      datetime('now'), datetime('now')
    )
  `).run(
    payload.licenseId,
    payload.customerId || null,
    payload.pharmacyName || null,
    currentDeviceId,
    payload.plan,
    payload.activationDate || new Date().toISOString(),
    payload.expiryDate || null,
    payload.isLifetime ? 1 : 0,
    signature,
    JSON.stringify(payload)
  );

  // Log in license history
  db.prepare(`
    INSERT INTO license_history (id, license_id, plan, event_type, details)
    VALUES (?, ?, ?, 'ACTIVATED', ?)
  `).run(
    crypto.randomUUID(),
    payload.licenseId,
    payload.plan,
    `Activated ${payload.plan} license for ${payload.pharmacyName || 'Customer'} on ${currentDeviceId}`
  );

  return getLicenseStatus();
}

/**
 * Deactivates or removes local license (for testing or device unbinding).
 */
function deactivateLocalLicense() {
  const filePath = getLicenseFilePath();
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }

  const db = getDb();
  db.prepare(`
    UPDATE license_state SET
      license_id = NULL, status = 'INACTIVE', raw_payload = NULL, signature = NULL, updated_at = datetime('now')
    WHERE id = 1
  `).run();

  return getLicenseStatus();
}

module.exports = {
  getLicenseStatus,
  saveSignedLicense,
  deactivateLocalLicense,
  verifySignature,
  canonicalizePayload,
  recordTimeCheckpoint,
  ED25519_PUBLIC_KEY,
};

