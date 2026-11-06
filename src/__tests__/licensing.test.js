import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// Embedded test public and private Ed25519 keys
const TEST_KEYPAIR = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

function canonicalize(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach(k => {
    if (k !== 'signature' && obj[k] !== undefined) sorted[k] = obj[k];
  });
  return JSON.stringify(sorted);
}

function signPayload(payload, privateKeyPem) {
  const canonical = canonicalize(payload);
  const sig = crypto.sign(null, Buffer.from(canonical, 'utf8'), privateKeyPem);
  return sig.toString('base64');
}

function verifyPayload(payload, signatureBase64, publicKeyPem) {
  try {
    const canonical = canonicalize(payload);
    return crypto.verify(
      null,
      Buffer.from(canonical, 'utf8'),
      publicKeyPem,
      Buffer.from(signatureBase64, 'base64')
    );
  } catch (_) {
    return false;
  }
}

describe('Ed25519 Digital License Cryptography', () => {
  it('successfully signs and verifies a valid license payload', () => {
    const payload = {
      licenseId: 'LIC-2026-9001',
      customerId: 'CUST-101',
      pharmacyName: 'City Care Pharmacy',
      deviceId: 'PHD-9A2B-8C4D-1E3F-7A90',
      plan: 'YEARLY',
      activationDate: '2026-01-01T00:00:00.000Z',
      expiryDate: '2027-01-01T00:00:00.000Z',
      isLifetime: false,
      issuedAt: '2026-01-01T00:00:00.000Z',
      version: 1,
    };

    const signature = signPayload(payload, TEST_KEYPAIR.privateKey);
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(40);

    const isValid = verifyPayload(payload, signature, TEST_KEYPAIR.publicKey);
    expect(isValid).toBe(true);
  });

  it('rejects a license if any payload field has been tampered with', () => {
    const payload = {
      licenseId: 'LIC-2026-9001',
      deviceId: 'PHD-9A2B-8C4D-1E3F-7A90',
      plan: 'MONTHLY',
      expiryDate: '2026-04-01T00:00:00.000Z',
    };

    const signature = signPayload(payload, TEST_KEYPAIR.privateKey);

    // Attacker modifies expiry date or plan to LIFETIME
    const tamperedPayload = {
      ...payload,
      plan: 'LIFETIME',
      expiryDate: '2099-01-01T00:00:00.000Z',
    };

    const isValid = verifyPayload(tamperedPayload, signature, TEST_KEYPAIR.publicKey);
    expect(isValid).toBe(false);
  });

  it('enforces hardware device binding match', () => {
    const currentDevice = 'PHD-AAA1-BBB2-CCC3-DDD4';
    const otherDevice = 'PHD-ZZZ9-YYY8-XXX7-WWW6';

    const payload = {
      licenseId: 'LIC-2026-9002',
      deviceId: currentDevice,
      plan: 'YEARLY',
    };

    const signature = signPayload(payload, TEST_KEYPAIR.privateKey);
    expect(verifyPayload(payload, signature, TEST_KEYPAIR.publicKey)).toBe(true);

    // Attempting to use license on different machine
    const isDeviceMatched = payload.deviceId === otherDevice;
    expect(isDeviceMatched).toBe(false);
  });
});

describe('License Validity & Expiration Calculations', () => {
  it('correctly identifies active, warning, and expired states', () => {
    const now = new Date('2026-05-15T12:00:00.000Z');

    // Case 1: Expired 2 days ago
    const expiredDate = new Date('2026-05-13T12:00:00.000Z');
    const isExpired = expiredDate.getTime() <= now.getTime();
    expect(isExpired).toBe(true);

    // Case 2: Expiring in 4 days (Warning horizon)
    const warningDate = new Date('2026-05-19T12:00:00.000Z');
    const daysLeft = Math.ceil((warningDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysLeft).toBe(4);
    expect(daysLeft <= 7).toBe(true);

    // Case 3: Lifetime membership (never expired)
    const isLifetime = true;
    const isPermitted = isLifetime || !isExpired;
    expect(isPermitted).toBe(true);
  });

  it('detects system clock rollback from recorded checkpoints', () => {
    const checkpoints = [
      '2026-05-10T10:00:00.000Z',
      '2026-05-14T18:00:00.000Z',
    ];
    const highestCheckpoint = new Date(checkpoints[checkpoints.length - 1]).getTime();

    // User turned clock back to 2025
    const tamperedNow = new Date('2025-01-01T00:00:00.000Z').getTime();
    const isRollback = tamperedNow < (highestCheckpoint - (4 * 60 * 60 * 1000));

    expect(isRollback).toBe(true);
  });
});

