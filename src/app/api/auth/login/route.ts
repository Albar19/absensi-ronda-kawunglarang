import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/auth';

// ── Rate limiter sederhana (in-memory) ──
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 menit

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login. Coba lagi 15 menit.' },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password wajib diisi' },
        { status: 400 }
      );
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Format data tidak valid' },
        { status: 400 }
      );
    }

    // Validasi dari environment variable
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminHash = process.env.ADMIN_PASSWORD_HASH;

    // Keamanan: WAJIB bcrypt hash. Tanpa hash, login ditolak.
    // Jangan pernah bandingkan password plaintext (cek .env.local / Vercel: ADMIN_PASSWORD_HASH)
    if (!adminHash) {
      console.error('[POST /api/auth/login] ADMIN_PASSWORD_HASH belum dikonfigurasi di environment variable.');
      return NextResponse.json(
        { error: 'Autentikasi belum dikonfigurasi. Hubungi admin.' },
        { status: 500 }
      );
    }

    let passwordValid = false;
    if (username === adminUser) {
      passwordValid = await bcrypt.compare(password, adminHash);
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    const token = await signToken({ role: 'admin', username });

    const cookieStore = await cookies();
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
