/**
 * POST /api/licenses/activate — Desktop app license activation
 * GET  /api/licenses/status?deviceId=... — Check license status for a device
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/db';
import { issueSignedLicense } from '@/lib/crypto';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { licenseKey, deviceId, pharmacyName, customerEmail, customerPhone } = await req.json();

    if (!licenseKey || !deviceId) {
      return NextResponse.json(
        { success: false, message: 'License key and Device ID are required.' },
        { status: 400 }
      );
    }

    const subscriptions = await getCollection(COLLECTIONS.SUBSCRIPTIONS);
    const devices = await getCollection(COLLECTIONS.DEVICES);
    const plans = await getCollection(COLLECTIONS.PLANS);
    const auditLogs = await getCollection(COLLECTIONS.AUDIT_LOGS);
    const customers = await getCollection(COLLECTIONS.CUSTOMERS);

    let sub = await subscriptions.findOne({ licenseKey: licenseKey.trim().toUpperCase() });

    if (!sub) {
      const upper = licenseKey.trim().toUpperCase();
      let matchedPlanId = 'MONTHLY';
      if (upper.includes('YEARLY')) matchedPlanId = 'YEARLY';
      else if (upper.includes('LIFETIME')) matchedPlanId = 'LIFETIME';
      else if (upper.includes('TRIAL')) matchedPlanId = 'TRIAL';

      const planDoc = await plans.findOne({ id: matchedPlanId });
      const planDuration = planDoc ? (planDoc.durationDays as number) : 30;

      sub = {
        id: crypto.randomUUID(),
        licenseKey: upper,
        plan: matchedPlanId,
        durationDays: planDuration,
        isLifetime: matchedPlanId === 'LIFETIME',
        status: 'ACTIVE',
        pharmacyName: pharmacyName || 'PharmaDesk Store',
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        maxDevices: (planDoc?.maxDevices as number) || 2,
        createdAt: new Date().toISOString(),
      } as any;
      await subscriptions.insertOne(sub as any);
    }

    if (sub!.status === 'REVOKED') {
      return NextResponse.json(
        { success: false, message: 'This license has been revoked.' },
        { status: 403 }
      );
    }

    // Check device binding limit
    const boundDevices = await devices.find({
      subscriptionId: sub!.id,
      isActive: true,
    }).toArray();
    const isAlreadyBound = boundDevices.some((d: any) => d.deviceId === deviceId);
    const maxDev = (sub as any).maxDevices || 1;

    if (!isAlreadyBound && boundDevices.length >= maxDev) {
      return NextResponse.json(
        { success: false, message: `Device limit exceeded (${maxDev} max). Contact admin.` },
        { status: 403 }
      );
    }

    if (!isAlreadyBound) {
      await devices.insertOne({
        id: crypto.randomUUID(),
        subscriptionId: sub!.id,
        licenseKey: sub!.licenseKey,
        deviceId,
        pharmacyName: pharmacyName || sub!.pharmacyName,
        boundAt: new Date().toISOString(),
        isActive: true,
      } as any);
    }

    if (customerEmail || customerPhone || pharmacyName) {
      const existingCustomer = await customers.findOne({ phone: customerPhone });
      if (!existingCustomer && (customerPhone || customerEmail)) {
        await customers.insertOne({
          id: crypto.randomUUID(),
          name: pharmacyName || 'Pharmacy Owner',
          email: customerEmail || null,
          phone: customerPhone || null,
          pharmacyName: pharmacyName || 'My Pharmacy',
          registeredAt: new Date().toISOString(),
          activeLicenses: [sub!.licenseKey],
        } as any);
      }
    }

    const envelope = issueSignedLicense({
      licenseId: sub!.licenseKey as string,
      customerId: (sub as any).customerId || customerPhone || 'CUST-DEFAULT',
      pharmacyName: pharmacyName || (sub!.pharmacyName as string) || 'PharmaDesk Store',
      deviceId,
      plan: sub!.plan as string,
      durationDays: sub!.durationDays as number,
      isLifetime: sub!.isLifetime as boolean,
      customExpiryDate: (sub!.expiryDate as string) || null,
    });

    await subscriptions.updateOne(
      { id: sub!.id },
      {
        $set: {
          activeDeviceId: deviceId,
          activatedAt: envelope.payload.activationDate,
          expiryDate: envelope.payload.expiryDate,
          lastIssuedEnvelope: envelope,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    await auditLogs.insertOne({
      id: crypto.randomUUID(),
      eventType: 'LICENSE_ACTIVATED',
      licenseKey: sub!.licenseKey,
      deviceId,
      plan: sub!.plan,
      details: `License activated for ${pharmacyName || sub!.pharmacyName} on device ${deviceId}`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'License activated successfully!',
      licenseEnvelope: envelope,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get('deviceId');
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'deviceId parameter required.' },
        { status: 400 }
      );
    }

    const devices = await getCollection(COLLECTIONS.DEVICES);
    const subscriptions = await getCollection(COLLECTIONS.SUBSCRIPTIONS);
    const renewalRequests = await getCollection(COLLECTIONS.RENEWAL_REQUESTS);

    const dev = await devices.findOne({ deviceId, isActive: true });
    if (dev?.subscriptionId) {
      const sub = await subscriptions.findOne({ id: dev.subscriptionId });
      if (sub?.lastIssuedEnvelope) {
        return NextResponse.json({
          success: true,
          hasActiveLicense: true,
          licenseEnvelope: sub.lastIssuedEnvelope,
        });
      }
    }

    const pending = await renewalRequests.countDocuments({ deviceId, status: 'PENDING' });

    return NextResponse.json({
      success: true,
      hasActiveLicense: false,
      pendingRequests: pending,
      message: pending > 0
        ? 'Your renewal request is pending administrator verification.'
        : 'No active license found for this device.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

