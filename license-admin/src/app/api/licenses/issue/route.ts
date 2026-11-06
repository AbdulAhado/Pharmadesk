/**
 * POST /api/licenses/issue — Manually issue a signed license
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { issueSignedLicense } from '@/lib/crypto';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const { pharmacyName, customerPhone, deviceId, plan, durationDays, isLifetime } = await req.json();

    if (!pharmacyName || !deviceId) {
      return NextResponse.json(
        { success: false, message: 'Pharmacy name and Device ID are required.' },
        { status: 400 }
      );
    }

    const subscriptions = await getCollection(COLLECTIONS.SUBSCRIPTIONS);
    const devices = await getCollection(COLLECTIONS.DEVICES);
    const auditLogs = await getCollection(COLLECTIONS.AUDIT_LOGS);

    const licenseKey = `PHD-${plan || 'YEARLY'}-${Date.now().toString().slice(-6)}`;
    const subId = crypto.randomUUID();

    const envelope = issueSignedLicense({
      licenseId: licenseKey,
      customerId: customerPhone || 'CUST-MANUAL',
      pharmacyName,
      deviceId,
      plan: plan || 'YEARLY',
      durationDays: isLifetime ? null : (parseInt(durationDays, 10) || 365),
      isLifetime: Boolean(isLifetime),
    });

    await subscriptions.insertOne({
      id: subId,
      licenseKey,
      customerId: customerPhone,
      pharmacyName,
      deviceId,
      plan: plan || 'YEARLY',
      durationDays: isLifetime ? null : (parseInt(durationDays, 10) || 365),
      isLifetime: Boolean(isLifetime),
      status: 'ACTIVE',
      expiryDate: envelope.payload.expiryDate,
      lastIssuedEnvelope: envelope,
      createdAt: new Date().toISOString(),
    });

    await devices.insertOne({
      id: crypto.randomUUID(),
      subscriptionId: subId,
      licenseKey,
      deviceId,
      pharmacyName,
      boundAt: new Date().toISOString(),
      isActive: true,
    });

    await auditLogs.insertOne({
      id: crypto.randomUUID(),
      eventType: 'MANUAL_LICENSE_ISSUED',
      licenseKey,
      deviceId,
      plan,
      details: `Admin issued manual license for ${pharmacyName} on ${deviceId}`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'License issued successfully!',
      licenseKey,
      licenseEnvelope: envelope,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED')
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

