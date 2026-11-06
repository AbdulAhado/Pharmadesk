/**
 * PharmaDesk Licensing Ed25519 Cryptographic Service
 * Handles server-side signing of licenses using the private key.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Retrieves the Ed25519 private key from environment or key file.
 * NEVER hardcode the private key in source code.
 */
function getPrivateKey() {
  // 1. Environment variable (preferred — set in .env)
  if (process.env.ED25519_PRIVATE_KEY) {
    return process.env.ED25519_PRIVATE_KEY.replace(/\\n/g, '\n');
  }

  // 2. Key file on disk (alternative for non-containerized deployments)
  const keyFilePath = path.join(__dirname, '../../keys/ed25519_private.pem');
  if (fs.existsSync(keyFilePath)) {
    return fs.readFileSync(keyFilePath, 'utf8');
  }

  throw new Error(
    'ED25519_PRIVATE_KEY is not configured. ' +
    'Set it in your .env file or place a PEM file at keys/ed25519_private.pem'
  );
}

/**
 * Deterministic JSON stringifier to guarantee identical byte sequences.
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
 * Sign payload using Ed25519 private key.
 */
function signLicensePayload(payload) {
  const privateKey = getPrivateKey();
  const canonicalStr = canonicalizePayload(payload);
  const dataBuffer = Buffer.from(canonicalStr, 'utf8');

  const signature = crypto.sign(null, dataBuffer, privateKey);
  return signature.toString('base64');
}

/**
 * Issue a complete signed license envelope.
 */
function issueSignedLicense({
  licenseId,
  customerId,
  pharmacyName,
  deviceId,
  plan,
  durationDays,
  isLifetime = false,
  customExpiryDate = null,
}) {
  const now = new Date();
  const activationDate = now.toISOString();

  let expiryDate = null;
  if (!isLifetime) {
    if (customExpiryDate) {
      expiryDate = new Date(customExpiryDate).toISOString();
    } else {
      const days = durationDays || 30;
      const exp = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
      expiryDate = exp.toISOString();
    }
  }

  const payload = {
    licenseId: licenseId || `PHD-${plan}-${Date.now().toString().slice(-6)}`,
    customerId: customerId || 'CUST-WALKIN',
    pharmacyName: pharmacyName || 'PharmaDesk Client',
    deviceId,
    plan,
    activationDate,
    expiryDate,
    isLifetime: Boolean(isLifetime),
    issuedAt: now.toISOString(),
    version: 1,
  };

  const signature = signLicensePayload(payload);

  return {
    payload,
    signature,
  };
}

module.exports = {
  getPrivateKey,
  canonicalizePayload,
  signLicensePayload,
  issueSignedLicense,
};
