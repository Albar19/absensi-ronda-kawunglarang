import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function getTanggalHariIni(): string {
  return new Date().toISOString().split('T')[0];
}

function mapRecord(r: Record<string, unknown>) {
  return {
    id: r.id,
    nama: r.nama_warga ?? r.nama ?? '',
    dusun: r.dusun ?? '',
    tanggal: r.tanggal ?? r.tanggal_ronda ?? '',
    jamAbsen: r.jam_absen ?? '',
    latitude: Number(r.latitude ?? r.koordinat_lat ?? 0),
    longitude: Number(r.longitude ?? r.koordinat_lng ?? 0),
    jarakMeter: Number(r.jarak_meter ?? 0),
    deviceId: r.device_id ?? r.warga_id ?? '',
  };
}

export async function GET() {
  const today = getTanggalHariIni();
  let data: Record<string, unknown>[] | null = null;
  let error: unknown = null;

  // Coba query pakai kolom baru 'tanggal_ronda', fallback ke 'tanggal'
  const result = await supabase
    .from('absen_records')
    .select('*')
    .eq('tanggal_ronda', today)
    .order('created_at', { ascending: false });

  if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('tanggal_ronda'))) {
    // Kolom baru tidak ada, fallback ke 'tanggal'
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
