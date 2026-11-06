import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAuth(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Payment could not be verified';

    const renewalRequests = await getCollection(COLLECTIONS.RENEWAL_REQUESTS);
    const auditLogs = await getCollection(COLLECTIONS.AUDIT_LOGS);

    await renewalRequests.updateOne({ id }, {
      $set: {
        status: 'REJECTED',
        rejectionReason: reason,
        rejectedAt: new Date().toISOString(),
      }
    });

    await auditLogs.insertOne({
      id: crypto.randomUUID(),
      eventType: 'RENEWAL_REJECTED',
      details: `Renewal request ${id} rejected: ${reason}`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: 'Renewal request rejected' });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

