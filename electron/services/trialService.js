/**
 * PharmaDesk Free Trial Service
 * Manages 14-day local free trial lifecycle with multi-layer tamper checks.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const { getDb } = require('./database');
const { getDeviceId } = require('./deviceService');

const TRIAL_DURATION_DAYS = 14;
const TRIAL_SALT = 'PHARMADESK_TRIAL_SECURITY_V1_2026';

function getTrialFilePath() {
  const userData = app.getPath('userData');
  return path.join(userData, 'trial_identity.json');
}

function calculateSaltHash(deviceId, startedAt, expiresAt) {
  return crypto.createHash('sha256')
    .update(`${deviceId}|${startedAt}|${expiresAt}|${TRIAL_SALT}`)
    .digest('hex');
}

/**
 * Initializes or loads the 14-day trial state.
 */
function initializeOrGetTrial() {
  const db = getDb();
  const deviceId = getDeviceId();
  const now = new Date();
  const trialFilePath = getTrialFilePath();

  // 1. Try reading from SQLite trial_state
  let row = db.prepare('SELECT * FROM trial_state WHERE id = 1').get();

  // 2. Try reading from userData JSON
  let fileData = null;
  if (fs.existsSync(trialFilePath)) {
    try {
      fileData = JSON.parse(fs.readFileSync(trialFilePath, 'utf8'));
    } catch (_) {}
  }

  // If already exists in either place, synchronize and return
  if (row || fileData) {
    const startedAt = row?.started_at || fileData?.startedAt;
    const expiresAt = row?.expires_at || fileData?.expiresAt;
    const savedHash = row?.salt_hash || fileData?.saltHash;

    const expectedHash = calculateSaltHash(deviceId, startedAt, expiresAt);
    const isTampered = savedHash !== expectedHash;

    // Check expiration
    const expiryDate = new Date(expiresAt);
    const msLeft = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    const isExpired = msLeft <= 0 || isTampered;

    const status = isExpired ? 'EXPIRED' : 'ACTIVE';

    // Synchronize to SQLite if missing
    if (!row) {
      db.prepare(`
        INSERT OR REPLACE INTO trial_state (id, device_id, started_at, expires_at, duration_days, status, salt_hash)
        VALUES (1, ?, ?, ?, ?, ?, ?)
      `).run(deviceId, startedAt, expiresAt, TRIAL_DURATION_DAYS, status, expectedHash);
    }

    // Synchronize to file if missing or updated
    if (!fileData || fileData.status !== status) {
      try {
        fs.writeFileSync(trialFilePath, JSON.stringify({
          deviceId,
          startedAt,
          expiresAt,
          durationDays: TRIAL_DURATION_DAYS,
          status,
          saltHash: expectedHash,
          updatedAt: now.toISOString(),
        }, null, 2), 'utf8');
      } catch (_) {}
    }

    return {
      startedAt,
      expiresAt,
      daysRemaining,
      durationDays: TRIAL_DURATION_DAYS,
      status,
      isExpired,
      isTampered,
    };
  }

  // First time launch: Initialize 14-Day Free Trial
  const startedAt = now.toISOString();
  const expiryDate = new Date(now.getTime() + (TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000));
  const expiresAt = expiryDate.toISOString();
  const saltHash = calculateSaltHash(deviceId, startedAt, expiresAt);

  // Save to SQLite
  db.prepare(`
    INSERT OR REPLACE INTO trial_state (id, device_id, started_at, expires_at, duration_days, status, salt_hash)
    VALUES (1, ?, ?, ?, ?, 'ACTIVE', ?)
  `).run(deviceId, startedAt, expiresAt, TRIAL_DURATION_DAYS, saltHash);

  // Save audit log
  db.prepare(`
    INSERT INTO license_history (id, plan, event_type, details)
    VALUES (?, 'FREE_TRIAL', 'TRIAL_STARTED', ?)
  `).run(crypto.randomUUID(), `Started 14-day free trial on device ${deviceId}`);

  // Save to file
  try {
    fs.writeFileSync(trialFilePath, JSON.stringify({
      deviceId,
      startedAt,
      expiresAt,
      durationDays: TRIAL_DURATION_DAYS,
      status: 'ACTIVE',
      saltHash,
      createdAt: startedAt,
    }, null, 2), 'utf8');
  } catch (err) {
    console.warn('[TrialService] Could not write trial JSON:', err.message);
  }

  return {
    startedAt,
    expiresAt,
    daysRemaining: TRIAL_DURATION_DAYS,
    durationDays: TRIAL_DURATION_DAYS,
    status: 'ACTIVE',
    isExpired: false,
    isTampered: false,
  };
}

module.exports = {
  initializeOrGetTrial,
  TRIAL_DURATION_DAYS,
};

