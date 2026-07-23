import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { supabase } from './supabase';

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface JwtPayload {
  role: 'admin';
  username: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const { username } = payload as unknown as JwtPayload;

    const { data } = await supabase
      .from('admin_users')
      .select('active_session')
      .eq('username', username)
      .single();

    if (!data || data.active_session !== hashToken(token)) {
      return null;
    }

    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}