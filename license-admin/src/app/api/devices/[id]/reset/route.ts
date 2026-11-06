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

    const devices = await getCollection(COLLECTIONS.DEVICES);
    const auditLogs = await getCollection(COLLECTIONS.AUDIT_LOGS);

    const dev = await devices.findOne({ id });
    if (!dev) {
      return NextResponse.json({ success: false, message: 'Device binding not found' }, { status: 404 });
    }

    await devices.updateOne({ id }, { $set: { isActive: false, unbindReason: 'Admin Reset' } });

    await auditLogs.insertOne({
      id: crypto.randomUUID(),
      eventType: 'DEVICE_RESET',
      deviceId: dev.deviceId,
      licenseKey: dev.licenseKey,
      details: `Admin reset device binding for ${dev.deviceId}`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Device unbind completed. License can now be activated on another PC.',
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

