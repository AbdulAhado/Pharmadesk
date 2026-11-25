/**
 * POST /api/licenses/activate — Public endpoint for desktop app
 * Activates a license key for a device and returns an Ed25519-signed licenseEnvelope.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/db';
import { issueSignedLicense } from '@/lib/crypto';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { licenseKey, deviceId, pharmacyName, customerPhone } = await req.json();

    if (!licenseKey || !deviceId) {
      return NextResponse.json(
        { success: false, message: 'License key and Device ID are required.' },
        { status: 400 }
      );
    }

    const normalizedKey = String(licenseKey).trim().toUpperCase();
    const subscriptions = await getCollection(COLLECTIONS.SUBSCRIPTIONS);
    const devices = await getCollection(COLLECTIONS.DEVICES);
    const auditLogs = await getCollection(COLLECTIONS.AUDIT_LOGS);

    const sub = await subscriptions.findOne({ licenseKey: normalizedKey });
    if (!sub) {
      return NextResponse.json(
        { success: false, message: 'Invalid license key. Please check and try again.' },
        { status: 404 }
      );
    }

    if (sub.status === 'REVOKED' || sub.status === 'SUSPENDED') {
      return NextResponse.json(
        { success: false, message: `This license is ${String(sub.status).toLowerCase()}. Contact support.` },
        { status: 403 }
      );
    }

    const activeDevices = await devices.find({ subscriptionId: sub.id, isActive: true }).toArray();
    const alreadyBound = activeDevices.some((d) => d.deviceId === deviceId);
    const maxDevices = Number(sub.maxDevices || 2);

    if (!alreadyBound && activeDevices.length >= maxDevices) {
      return NextResponse.json(
        { success: false, message: `Device limit reached (${maxDevices}). Ask admin to reset a device.` },
        { status: 403 }
      );
    }

    const envelope = issueSignedLicense({
      licenseId: normalizedKey,
      customerId: String(sub.customerId || customerPhone || 'CUST-ACTIVE'),
      pharmacyName: String(pharmacyName || sub.pharmacyName || 'PharmaDesk Pharmacy'),
      deviceId,
      plan: String(sub.plan || 'YEARLY'),
      durationDays: sub.isLifetime ? null : Number(sub.durationDays || 365),
      isLifetime: Boolean(sub.isLifetime),
    });

    if (!alreadyBound) {
      await devices.insertOne({
        id: crypto.randomUUID(),
        subscriptionId: sub.id,
        licenseKey: normalizedKey,
        deviceId,
        pharmacyName: pharmacyName || sub.pharmacyName || 'PharmaDesk Pharmacy',
        boundAt: new Date().toISOString(),
        isActive: true,
      });
    }

    await subscriptions.updateOne(
      { id: sub.id },
      {
        $set: {
          status: 'ACTIVE',
          activeDeviceId: deviceId,
          expiryDate: envelope.payload.expiryDate,
          lastIssuedEnvelope: envelope,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    await auditLogs.insertOne({
      id: crypto.randomUUID(),
      eventType: 'LICENSE_ACTIVATED',
      licenseKey: normalizedKey,
      deviceId,
      plan: sub.plan,
      details: `Desktop activated ${normalizedKey} on ${deviceId}`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'PharmaDesk license activated successfully!',
      licenseEnvelope: envelope,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
