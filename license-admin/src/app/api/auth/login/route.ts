/**
 * POST /api/auth/login — Admin Login
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const adminUsers = await getCollection(COLLECTIONS.ADMIN_USERS);
    const defaultUser = process.env.ADMIN_USERNAME;
    const defaultPass = process.env.ADMIN_PASSWORD;

    if (!defaultUser || !defaultPass) {
      return NextResponse.json(
        { success: false, message: 'Server admin credentials not configured.' },
        { status: 500 }
      );
    }

    let user = await adminUsers.findOne({ username });

    if (!user && username === defaultUser && password === defaultPass) {
      user = { id: 'admin-1', username, role: 'SUPER_ADMIN', name: 'Software Owner' } as any;
    } else if (!user || user.password !== password) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials.' },
        { status: 401 }
      );
    }

    const token = signToken({
      id: (user as any).id || 'admin-1',
      username: (user as any).username,
      role: (user as any).role || 'ADMIN',
    });

    return NextResponse.json({
      success: true,
      token,
      admin: {
        id: (user as any).id,
        username: (user as any).username,
        name: (user as any).name || 'Admin',
        role: (user as any).role,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Login failed.' },
      { status: 500 }
    );
  }
}

