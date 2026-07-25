import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function getTanggalHariIni(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getTanggalHariIni();
  let { data, error } = await supabase
    .from('absen_records')
    .select('*')
    .eq('tanggal', today)
    .order('jam_absen', { ascending: true });

  if (error && (error.code === 'PGRST204' || error.message?.includes('dusun'))) {
    // Kolom mungkin masih 'rt' (belum migrasi) — query tetap jalan karena 'rt' bukan di select/filter
    // Error ini tidak akan terjadi untuk query select * — hanya error column di order/filter
  }

  if (error && !error.message?.includes('dusun')) {
    return NextResponse.json(
      { error: 'Gagal mengambil data' },
      { status: 500 }
    );
  }

  const mapped = (data ?? []).map((r) => ({
    id: r.id,
    wargaId: r.warga_id,
    nama: r.nama,
    dusun: r.dusun ?? r.rt ?? '',
    tanggal: r.tanggal,
    jamAbsen: r.jam_absen,
    jarakMeter: r.jarak_meter,
    koordinatLat: r.koordinat_lat,
    koordinatLng: r.koordinat_lng,
    status: r.status as 'hadir',
    jenis: r.jenis as 'masuk' | 'pulang',
  }));

  return NextResponse.json(mapped);
}