/**
 * JWT Auth Utilities for PharmaDesk Admin Dashboard
 */

import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'PHARMADESK_ADMIN_JWT_SECRET_SUPER_SECURE_2026_XYZ';

export interface AdminToken {
  id: string;
  username: string;
  role: string;
}

export function signToken(payload: AdminToken): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AdminToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminToken;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
}

export function requireAuth(req: NextRequest): AdminToken {
  const token = getTokenFromRequest(req);
  if (!token) throw new Error('UNAUTHORIZED');
  const decoded = verifyToken(token);
  if (!decoded) throw new Error('UNAUTHORIZED');
  return decoded;
}

