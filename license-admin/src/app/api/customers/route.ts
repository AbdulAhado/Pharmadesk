/**
 * GET /api/customers — List all customers
 * POST /api/customers — Create a new customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const customers = await getCollection(COLLECTIONS.CUSTOMERS);
    const list = await customers.find().sort({ registeredAt: -1 }).toArray();
    return NextResponse.json({ success: true, customers: list });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED')
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const { name, pharmacyName, phone, email, address, notes } = await req.json();

    if (!name || !pharmacyName) {
      return NextResponse.json(
        { success: false, message: 'Customer name and Pharmacy name required.' },
        { status: 400 }
      );
    }

    const customers = await getCollection(COLLECTIONS.CUSTOMERS);
    const newCust = {
      id: crypto.randomUUID(),
      name,
      pharmacyName,
      phone: phone || '',
      email: email || '',
      address: address || '',
      notes: notes || '',
      registeredAt: new Date().toISOString(),
      activeLicenses: [],
    };

    await customers.insertOne(newCust);
    return NextResponse.json({ success: true, customer: newCust });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED')
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

