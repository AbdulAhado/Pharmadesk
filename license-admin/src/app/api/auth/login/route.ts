/**
 * POST /api/auth/login — Admin Login
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const defaultUser = process.env.ADMIN_USERNAME || 'admin@pharmadesk.pk';
    const defaultPass = process.env.ADMIN_PASSWORD || 'PharmaDeskAdmin2026!';

    // 1. Direct Master Credentials Validation (Always succeeds even if MongoDB Atlas has IP/SSL restrictions)
    if (username === defaultUser && password === defaultPass) {
      const user = { id: 'admin-1', username, role: 'SUPER_ADMIN', name: 'Software Owner' };
      const token = signToken({
        id: user.id,
        username: user.username,
        role: user.role,
      });

      return NextResponse.json({
        success: true,
        token,
        admin: user,
      });
    }

    // 2. Query MongoDB for other admin users
    try {
      const adminUsers = await getCollection(COLLECTIONS.ADMIN_USERS);
      const user = await adminUsers.findOne({ username });

      if (!user || user.password !== password) {
        return NextResponse.json(
          { success: false, message: 'Invalid administrator credentials.' },
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
    } catch (dbErr: any) {
      const msg = dbErr?.message || '';
      console.error('[API /api/auth/login] Database Error:', msg);

      if (msg.includes('SSL') || msg.includes('tlsv1') || msg.includes('alert') || msg.includes('MongoNetworkError')) {
        return NextResponse.json(
          {
            success: false,
            message: 'MongoDB Atlas IP Whitelist error (SSL Alert 80). Please whitelist your IP or add 0.0.0.0/0 in MongoDB Atlas -> Network Access.',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: false, message: 'Database connection failed: ' + msg },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Login failed.' },
      { status: 500 }
    );
  }
}

