/**
 * PharmaDesk Ed25519 Cryptographic Service (Next.js API Route compatible)
 * Server-side license signing using Ed25519 private key.
 */

import crypto from 'crypto';

function getPrivateKey(): string {
  const key = process.env.ED25519_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      'ED25519_PRIVATE_KEY environment variable is not set. ' +
      'Please configure it in .env.local before signing licenses.'
    );
  }
  return key.replace(/\\n/g, '\n');
}

export interface LicensePayload {
  licenseId: string;
  customerId: string;
  pharmacyName: string;
  deviceId: string;
  plan: string;
  activationDate: string;
  expiryDate: string | null;
  isLifetime: boolean;
  issuedAt: string;
  version: number;
}

export interface LicenseEnvelope {
  payload: LicensePayload;
  signature: string;
}

/**
 * Deterministic JSON stringifier — keys sorted alphabetically.
 */
function canonicalizePayload(payload: Record<string, unknown>): string {
  const sortedKeys = Object.keys(payload).sort();
  const sortedObj: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    if (k !== 'signature' && payload[k] !== undefined) {
      sortedObj[k] = payload[k];
    }
  }
  return JSON.stringify(sortedObj);
}

function signLicensePayload(payload: Record<string, unknown>): string {
  const privateKey = getPrivateKey();
  const canonicalStr = canonicalizePayload(payload);
  const dataBuffer = Buffer.from(canonicalStr, 'utf8');
  const signature = crypto.sign(null, dataBuffer, privateKey);
  return signature.toString('base64');
}

export function issueSignedLicense(opts: {
  licenseId?: string;
  customerId?: string;
  pharmacyName?: string;
  deviceId: string;
  plan: string;
  durationDays?: number | null;
  isLifetime?: boolean;
  customExpiryDate?: string | null;
}): LicenseEnvelope {
  const now = new Date();
  const activationDate = now.toISOString();

  let expiryDate: string | null = null;
  if (!opts.isLifetime) {
    if (opts.customExpiryDate) {
      expiryDate = new Date(opts.customExpiryDate).toISOString();
    } else {
      const days = opts.durationDays || 30;
      const exp = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      expiryDate = exp.toISOString();
    }
  }

  const payload: LicensePayload = {
    licenseId: opts.licenseId || `PHD-${opts.plan}-${Date.now().toString().slice(-6)}`,
    customerId: opts.customerId || 'CUST-WALKIN',
    pharmacyName: opts.pharmacyName || 'PharmaDesk Client',
    deviceId: opts.deviceId,
    plan: opts.plan,
    activationDate,
    expiryDate,
    isLifetime: Boolean(opts.isLifetime),
    issuedAt: now.toISOString(),
    version: 1,
  };

  const signature = signLicensePayload(payload as unknown as Record<string, unknown>);

  return { payload, signature };
}

