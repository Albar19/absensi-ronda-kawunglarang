import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/api-auth';
import { getTanggalHariIni } from '@/lib/data';

const NO_STORE = { 'Cache-Control': 'no-store' };

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

export async function GET() {
  // ── Auth check: data lengkap hanya untuk admin ──
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  const today = getTanggalHariIni();
  const COLS = 'id, nama_warga, dusun, tanggal, tanggal_ronda, jam_absen, jenis_absen, latitude, longitude, jarak_meter';
  let data: Record<string, unknown>[] | null = null;

  const result = await supabase
    .from('absen_records')
    .select(COLS)
    .eq('tanggal_ronda', today)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('tanggal_ronda'))) {
    const fb = await supabase
      .from('absen_records')
      .select('*')
      .eq('tanggal', today)
      .order('created_at', { ascending: false })
      .limit(5000);
    if (fb.error) {
      return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500, headers: NO_STORE });
    }
    data = fb.data;
  } else if (result.error) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500, headers: NO_STORE });
  } else {
    data = result.data;
  }

  const mapped = (data ?? []).map(mapRecord);
  return NextResponse.json(mapped, { headers: NO_STORE });
}