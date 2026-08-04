import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { isAdminRequest } from '@/lib/api-auth';

export async function GET(request: Request) {
  // ── Auth check: download QR hanya untuk admin yang sudah login ──
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;

    const pngBuffer = await QRCode.toBuffer(baseUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#1e3a8a',
        light: '#ffffff',
      },
    });

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pngBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="QR_Absensi_Ronda_Kawunglarang.png"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Gagal generate QR Code' },
      { status: 500 }
    );
  }
}
