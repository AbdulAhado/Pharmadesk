import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const devices = await getCollection(COLLECTIONS.DEVICES);
    const list = await devices.find().sort({ boundAt: -1 }).toArray();
    return NextResponse.json({ success: true, devices: list });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

