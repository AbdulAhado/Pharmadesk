/**
 * POST /api/subscriptions/[id]/extend — Extend a subscription by X days
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { issueSignedLicense } from '@/lib/crypto';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAuth(req);
    const { id } = await params;
    const { additionalDays } = await req.json();
    const days = parseInt(additionalDays, 10) || 30;

    const subscriptions = await getCollection(COLLECTIONS.SUBSCRIPTIONS);
    const auditLogs = await getCollection(COLLECTIONS.AUDIT_LOGS);

    const sub = await subscriptions.findOne({ id });
    if (!sub) {
      return NextResponse.json({ success: false, message: 'Subscription not found.' }, { status: 404 });
    }

    const currentExpiry = sub.expiryDate ? new Date(sub.expiryDate as string) : new Date();
    const baseTime = currentExpiry.getTime() > Date.now() ? currentExpiry.getTime() : Date.now();
    const newExpiry = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();

    const envelope = issueSignedLicense({
      licenseId: sub.licenseKey as string,
      customerId: sub.customerId as string,
      pharmacyName: sub.pharmacyName as string,
      deviceId: (sub.deviceId || sub.activeDeviceId) as string,
      plan: sub.plan as string,
      isLifetime: false,
      customExpiryDate: newExpiry,
    });

    await subscriptions.updateOne(
      { id },
      {
        $set: {
          expiryDate: newExpiry,
          status: 'ACTIVE',
          lastIssuedEnvelope: envelope,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    await auditLogs.insertOne({
      id: crypto.randomUUID(),
      eventType: 'SUBSCRIPTION_EXTENDED',
      licenseKey: sub.licenseKey,
      details: `Extended by ${days} days until ${newExpiry.slice(0, 10)}`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Subscription extended by ${days} days!`,
      newExpiryDate: newExpiry,
      licenseEnvelope: envelope,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED')
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

