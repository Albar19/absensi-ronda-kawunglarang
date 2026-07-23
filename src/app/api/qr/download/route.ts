import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import QRCode from 'qrcode';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = request.headers.get('origin') || request.headers.get('host') || 'http://localhost:3000';
  const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`;
  const url = `${baseUrl}/`;

  const pngBuffer = await QRCode.toBuffer(url, {
    width: 600,
    margin: 3,
    color: { dark: '#1e3a8a', light: '#ffffff' },
  });

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': 'attachment; filename="qr-bale-desa.png"',
      'Cache-Control': 'no-cache',
    },
  });
}