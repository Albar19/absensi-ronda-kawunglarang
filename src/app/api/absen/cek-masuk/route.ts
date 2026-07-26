import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('device_id');
  const tanggal = searchParams.get('tanggal');

  if (!deviceId || !tanggal) {
    return NextResponse.json(
      { error: 'Param device_id dan tanggal wajib' },
      { status: 400 }
    );
  }

  // Cek apakah ada absen masuk untuk device ini hari ini
  const { data, error } = await supabase
    .from('absen_records')
    .select('id')
    .eq('device_id', deviceId)
    .eq('tanggal_ronda', tanggal)
    .eq('jenis_absen', 'masuk')
    .maybeSingle();

  if (error) {
    // Fallback ke kolom 'tanggal' jika 'tanggal_ronda' belum ada
    if (error.code === 'PGRST204' || error.message?.includes('tanggal_ronda') || error.message?.includes('jenis_absen')) {
      const fb = await supabase
        .from('absen_records')
        .select('id')
        .eq('warga_id', deviceId)
        .eq('tanggal', tanggal)
        .eq('jenis_absen', 'masuk')
        .maybeSingle();
      if (fb.error) {
        return NextResponse.json({ error: 'Gagal memeriksa absen masuk' }, { status: 500 });
      }
      if (!fb.data) {
        return NextResponse.json({ error: 'Anda belum absen masuk malam ini.' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Gagal memeriksa absen masuk' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Anda belum absen masuk malam ini.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}