import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/api-auth';

const NO_STORE = { 'Cache-Control': 'no-store' };

// Batas aman jumlah record per respons — mencegah fetch tak terbatas
const MAX_ROWS = 50000;

function mapRecord(r: Record<string, unknown>) {
  return {
    id: r.id,
    nama: r.nama_warga ?? r.nama ?? '',
    dusun: r.dusun ?? '',
    tanggal: r.tanggal ?? r.tanggal_ronda ?? '',
    jamAbsen: r.jam_absen ?? '',
    jenisAbsen: r.jenis_absen ?? 'masuk',
    latitude: Number(r.latitude ?? r.koordinat_lat ?? 0),
    longitude: Number(r.longitude ?? r.koordinat_lng ?? 0),
    jarakMeter: Number(r.jarak_meter ?? 0),
  };
}

// GET /api/absen/semua[?bulan=YYYY-MM] — data lengkap (admin-only)
// Filter bulan dipindah ke server agar tidak fetch seluruh tabel.
export async function GET(request: Request) {
  // ── Auth check: data lengkap hanya untuk admin ──
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  const bulan = new URL(request.url).searchParams.get('bulan')?.trim() || '';
  const COLS = 'id, nama_warga, dusun, tanggal, tanggal_ronda, jam_absen, jenis_absen, latitude, longitude, jarak_meter';

  let data: Record<string, unknown>[] | null = null;

  let query = supabase.from('absen_records').select(COLS);
  if (bulan) query = query.gte('tanggal_ronda', `${bulan}-01`).lte('tanggal_ronda', `${bulan}-31`);
  const result = await query.order('created_at', { ascending: false }).limit(MAX_ROWS);

  if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('tanggal_ronda') || result.error.message?.includes('created_at'))) {
    // Schema lama: kolom nama/tanggal, tanpa tanggal_ronda/created_at
    let fb = supabase.from('absen_records').select('*');
    if (bulan) fb = fb.gte('tanggal', `${bulan}-01`).lte('tanggal', `${bulan}-31`);
    const fbResult = await fb.order('id', { ascending: false }).limit(MAX_ROWS);
    if (fbResult.error) {
      return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500, headers: NO_STORE });
    }
    data = fbResult.data;
  } else if (result.error) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500, headers: NO_STORE });
  } else {
    data = result.data;
  }

  const mapped = (data ?? []).map(mapRecord);
  return NextResponse.json(mapped, { headers: NO_STORE });
}