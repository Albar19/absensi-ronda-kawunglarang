import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
  let data: Record<string, unknown>[] | null = null;

  // Coba query dengan created_at, fallback jika kolom baru belum ada
  const result = await supabase
    .from('absen_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('created_at'))) {
    const fb = await supabase
      .from('absen_records')
      .select('*')
      .order('id', { ascending: false });
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
