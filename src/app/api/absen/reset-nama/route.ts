import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// POST /api/absen/reset-nama — Admin-only: rename device owner
export async function POST(request: Request) {
  // ── Auth check ──
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { device_id, nama_baru } = body;

    if (!device_id || typeof device_id !== 'string') {
      return NextResponse.json(
        { error: 'Param device_id wajib' },
        { status: 400 }
      );
    }

    if (!nama_baru || typeof nama_baru !== 'string' || nama_baru.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nama baru wajib diisi' },
        { status: 400 }
      );
    }

    const namaTrimmed = nama_baru.trim();

    // Cek apakah device_id punya record
    const { data: existing, error: cekError } = await supabase
      .from('absen_records')
      .select('id')
      .eq('device_id', device_id)
      .limit(1);

    if (cekError && (cekError.code === 'PGRST204' || cekError.message?.includes('device_id'))) {
      // Fallback ke warga_id
      const fb = await supabase
        .from('absen_records')
        .select('id')
        .eq('warga_id', device_id)
        .limit(1);
      if (fb.error) {
        return NextResponse.json({ error: 'Gagal memeriksa device' }, { status: 500 });
      }
      if (!fb.data || fb.data.length === 0) {
        return NextResponse.json({ message: 'Device tidak ditemukan' });
      }
      // Update via warga_id
      const { error: upError } = await supabase
        .from('absen_records')
        .update({ nama: namaTrimmed })
        .eq('warga_id', device_id);
      if (upError) {
        return NextResponse.json({ error: 'Gagal mengganti nama' }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: `Nama berhasil diganti menjadi "${namaTrimmed}". Data absen tetap tersimpan.`,
      });
    }

    if (cekError) {
      return NextResponse.json({ error: 'Gagal memeriksa device' }, { status: 500 });
    }

    if (!existing || existing.length === 0) {
      return NextResponse.json({ message: 'Device tidak ditemukan' });
    }

    // ── UPDATE semua record device_id dengan nama baru ──
    const { error: upError } = await supabase
      .from('absen_records')
      .update({ nama_warga: namaTrimmed })
      .eq('device_id', device_id);

    if (upError) {
      return NextResponse.json({ error: 'Gagal mengganti nama' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Nama berhasil diganti menjadi "${namaTrimmed}". Data absen tetap tersimpan.`,
    });
  } catch {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
