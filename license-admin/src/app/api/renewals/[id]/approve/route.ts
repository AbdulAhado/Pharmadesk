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
    const body = await req.json().catch(() => ({}));
    const adminNotes = body.adminNotes || 'Approved by admin';

    const renewalRequests = await getCollection(COLLECTIONS.RENEWAL_REQUESTS);
    const subscriptions = await getCollection(COLLECTIONS.SUBSCRIPTIONS);
    const devices = await getCollection(COLLECTIONS.DEVICES);
    const plans = await getCollection(COLLECTIONS.PLANS);
    const auditLogs = await getCollection(COLLECTIONS.AUDIT_LOGS);

    const request = await renewalRequests.findOne({ id });
    if (!request) {
      return NextResponse.json({ success: false, message: 'Renewal request not found' }, { status: 404 });
    }

    if (request.status === 'APPROVED') {
      return NextResponse.json({ success: false, message: 'Request already approved' }, { status: 400 });
    }

    const planDoc = await plans.findOne({ id: request.requestedPlan });
    const isLifetime = request.requestedPlan === 'LIFETIME' || planDoc?.durationDays === null;
    const durationDays = planDoc ? (planDoc.durationDays as number) : (request.requestedPlan === 'YEARLY' ? 365 : 30);

    let dev = await devices.findOne({ deviceId: request.deviceId, isActive: true });
    let sub = null;
    if (dev?.subscriptionId) {
      sub = await subscriptions.findOne({ id: dev.subscriptionId });
    }

    const licenseKey = sub ? (sub.licenseKey as string) : `PHD-${request.requestedPlan}-${Date.now().toString().slice(-6)}`;

    const envelope = issueSignedLicense({
      licenseId: licenseKey,
      customerId: request.customerPhone,
      pharmacyName: request.customerName,
      deviceId: request.deviceId,
      plan: request.requestedPlan,
      durationDays,
      isLifetime,
    });

    if (sub) {
      await subscriptions.updateOne({ id: sub.id }, {
        $set: {
          plan: request.requestedPlan,
          durationDays,
          isLifetime,
          status: 'ACTIVE',
          expiryDate: envelope.payload.expiryDate,
          lastIssuedEnvelope: envelope,
          updatedAt: new Date().toISOString(),
        }
      });
    } else {
      const newSubId = crypto.randomUUID();
      await subscriptions.insertOne({
        id: newSubId,
        licenseKey,
        customerId: request.customerPhone,
        pharmacyName: request.customerName,
        plan: request.requestedPlan,
        durationDays,
        isLifetime,
        status: 'ACTIVE',
        maxDevices: (planDoc?.maxDevices as number) || 2,
        activeDeviceId: request.deviceId,
        expiryDate: envelope.payload.expiryDate,
        lastIssuedEnvelope: envelope,
        createdAt: new Date().toISOString(),
      });

      if (!dev) {
        await devices.insertOne({
          id: crypto.randomUUID(),
          subscriptionId: newSubId,
          licenseKey,
          deviceId: request.deviceId,
          pharmacyName: request.customerName,
          boundAt: new Date().toISOString(),
          isActive: true,
        });
      }
    }

    await renewalRequests.updateOne({ id }, {
      $set: {
        status: 'APPROVED',
        adminNotes,
        approvedAt: new Date().toISOString(),
        issuedLicenseKey: licenseKey,
      }
    });

    await auditLogs.insertOne({
      id: crypto.randomUUID(),
      eventType: 'RENEWAL_APPROVED',
      licenseKey,
      deviceId: request.deviceId,
      plan: request.requestedPlan,
      details: `Renewal approved for ${request.customerName} (${request.requestNumber})`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Renewal approved and signed Ed25519 license generated!',
      licenseEnvelope: envelope,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

