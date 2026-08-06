import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/api-auth';

function getTanggalHariIni(): string {
  // WIB (UTC+7) agar sinkron dengan tanggal_ronda di record absen
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
}

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
    deviceId: r.device_id ?? r.warga_id ?? '',
  };
}

export async function GET() {
  // ── Auth check: data lengkap hanya untuk admin ──
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getTanggalHariIni();
  let data: Record<string, unknown>[] | null = null;

  const result = await supabase
    .from('absen_records')
    .select('*')
    .eq('tanggal_ronda', today)
    .order('created_at', { ascending: false });

  if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('tanggal_ronda'))) {
    const fb = await supabase
      .from('absen_records')
      .select('*')
      .eq('tanggal', today)
      .order('created_at', { ascending: false });
    if (fb.error) {
      return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
    data = fb.data;
  } else if (result.error) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  } else {
    data = result.data;
  }

  const mapped = (data ?? []).map(mapRecord);
  return NextResponse.json(mapped);
}