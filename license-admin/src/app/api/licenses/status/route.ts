/**
 * GET /api/licenses/status?deviceId=... — Public endpoint for desktop app
 * Checks if an approved signed license envelope is ready for this device.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get('deviceId')?.trim();
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'Device ID is required.' },
        { status: 400 }
      );
    }

    const devices = await getCollection(COLLECTIONS.DEVICES);
    const subscriptions = await getCollection(COLLECTIONS.SUBSCRIPTIONS);
    const renewalRequests = await getCollection(COLLECTIONS.RENEWAL_REQUESTS);

    const pendingRequests = await renewalRequests.countDocuments({
      deviceId,
      status: 'PENDING',
    });

    // Check active device binding first
    const dev = await devices.findOne({ deviceId, isActive: true });
    let sub = null;
    if (dev?.subscriptionId) {
      sub = await subscriptions.findOne({ id: dev.subscriptionId, status: 'ACTIVE' });
    }
    if (!sub) {
      sub = await subscriptions.findOne({
        $or: [{ deviceId }, { activeDeviceId: deviceId }],
        status: 'ACTIVE',
      });
    }

    if (sub && sub.lastIssuedEnvelope) {
      return NextResponse.json({
        success: true,
        isRenewed: true,
        pendingRequests,
        licenseEnvelope: sub.lastIssuedEnvelope,
      });
    }

    return NextResponse.json({
      success: true,
      isRenewed: false,
      pendingRequests,
      message: pendingRequests > 0
        ? 'Your renewal request is pending admin approval.'
        : 'No active license found for this device yet.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
