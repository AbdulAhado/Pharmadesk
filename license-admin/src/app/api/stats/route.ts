/**
 * GET /api/stats — Dashboard KPIs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);

    const subscriptions = await getCollection(COLLECTIONS.SUBSCRIPTIONS);
    const customers = await getCollection(COLLECTIONS.CUSTOMERS);
    const devices = await getCollection(COLLECTIONS.DEVICES);
    const renewalRequests = await getCollection(COLLECTIONS.RENEWAL_REQUESTS);
    const auditLogs = await getCollection(COLLECTIONS.AUDIT_LOGS);

    const allSubs = await subscriptions.find().toArray();
    const now = Date.now();

    let activeCount = 0, expiredCount = 0, lifetimeCount = 0, trialCount = 0;
    let totalRevenuePKR = 0;

    for (const sub of allSubs) {
      if (sub.isLifetime) { lifetimeCount++; activeCount++; }
      else if (sub.expiryDate) {
        if (new Date(sub.expiryDate as string).getTime() > now) activeCount++;
        else expiredCount++;
      } else {
        trialCount++;
      }
      if (sub.pricePKR) totalRevenuePKR += Number(sub.pricePKR) || 0;
    }

    const totalCustomers = await customers.countDocuments();
    const totalDevices = await devices.countDocuments();
    const pendingRenewals = await renewalRequests.countDocuments({ status: 'PENDING' });

    const recentLogs = await auditLogs
      .find()
      .sort({ timestamp: -1 })
      .limit(15)
      .toArray();

    return NextResponse.json({
      success: true,
      stats: {
        totalCustomers,
        totalSubscriptions: allSubs.length,
        activeSubscriptions: activeCount,
        expiredSubscriptions: expiredCount,
        lifetimeSubscriptions: lifetimeCount,
        freeTrialUsers: trialCount,
        registeredDevices: totalDevices,
        pendingRenewalsCount: pendingRenewals,
        totalRevenuePKR,
      },
      recentActivity: recentLogs,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED')
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

