/**
 * GET  /api/plans — List all plans
 * POST /api/plans — Create a new plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const plans = await getCollection(COLLECTIONS.PLANS);
    const list = await plans.find().toArray();

    // If no plans exist yet, seed defaults
    if (list.length === 0) {
      const defaults = [
        { id: 'TRIAL', name: 'Free Trial', durationDays: 14, pricePKR: 0, maxDevices: 1, isEnabled: true, description: '14-Day Free Evaluation' },
        { id: 'MONTHLY', name: 'Monthly Plan', durationDays: 30, pricePKR: 2500, maxDevices: 1, isEnabled: true, description: 'Standard Monthly License' },
        { id: 'YEARLY', name: 'Yearly Plan', durationDays: 365, pricePKR: 24000, maxDevices: 2, isEnabled: true, description: 'Annual License' },
        { id: 'LIFETIME', name: 'Lifetime', durationDays: null, pricePKR: 75000, maxDevices: 3, isEnabled: true, description: 'One-Time Payment' },
      ];
      await plans.insertMany(defaults);
      return NextResponse.json({ success: true, plans: defaults });
    }

    return NextResponse.json({ success: true, plans: list });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const { id, name, durationDays, pricePKR, maxDevices, description } = await req.json();

    if (!id || !name) {
      return NextResponse.json(
        { success: false, message: 'Plan ID and Name are required.' },
        { status: 400 }
      );
    }

    const plans = await getCollection(COLLECTIONS.PLANS);
    const existing = await plans.findOne({ id: id.toUpperCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Plan ID already exists.' },
        { status: 400 }
      );
    }

    const newPlan = {
      id: id.toUpperCase(),
      name,
      durationDays: durationDays !== undefined ? parseInt(durationDays, 10) : 30,
      pricePKR: parseFloat(pricePKR) || 0,
      maxDevices: parseInt(maxDevices, 10) || 1,
      isEnabled: true,
      description: description || '',
      createdAt: new Date().toISOString(),
    };

    await plans.insertOne(newPlan);
    return NextResponse.json({ success: true, plan: newPlan });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED')
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

