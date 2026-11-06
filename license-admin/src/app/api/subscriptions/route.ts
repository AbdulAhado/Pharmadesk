/**
 * GET /api/subscriptions — List all subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const subs = await getCollection(COLLECTIONS.SUBSCRIPTIONS);
    const list = await subs.find().sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, subscriptions: list });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED')
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

