/**
 * GET  /api/renewals — List renewal requests
 * POST /api/renewals — Submit a renewal request (from desktop app)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const status = req.nextUrl.searchParams.get('status');
    const renewalRequests = await getCollection(COLLECTIONS.RENEWAL_REQUESTS);
    const filter = status ? { status } : {};
    const list = await renewalRequests.find(filter).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, requests: list });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED')
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { requestNumber, deviceId, requestedPlan, customerName, customerPhone, paymentReference, notes } = await req.json();

    if (!deviceId || !requestedPlan) {
      return NextResponse.json(
        { success: false, message: 'Device ID and requested plan are required.' },
        { status: 400 }
      );
    }

    const renewalRequests = await getCollection(COLLECTIONS.RENEWAL_REQUESTS);
    const plans = await getCollection(COLLECTIONS.PLANS);
    const planDoc = await plans.findOne({ id: requestedPlan });

    const newRequest = {
      id: crypto.randomUUID(),
      requestNumber: requestNumber || `RNW-${Date.now().toString().slice(-6)}`,
      deviceId,
      requestedPlan,
      planName: (planDoc?.name as string) || requestedPlan,
      pricePKR: (planDoc?.pricePKR as number) || 0,
      customerName: customerName || 'Pharmacy Owner',
      customerPhone: customerPhone || 'N/A',
      paymentReference: paymentReference || 'N/A',
      notes: notes || '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    await renewalRequests.insertOne(newRequest);

    return NextResponse.json({
      success: true,
      message: 'Renewal request recorded. Awaiting administrator approval.',
      request: newRequest,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

