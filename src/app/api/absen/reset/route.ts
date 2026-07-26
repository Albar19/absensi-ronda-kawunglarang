import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function getTanggalHariIni(): string {
  return new Date().toISOString().split('T')[0];
}

export async function DELETE() {
  const today = getTanggalHariIni();

  // Coba hapus pakai 'tanggal_ronda', fallback ke 'tanggal'
  let { error } = await supabase
    .from('absen_records')
    .delete()
    .eq('tanggal_ronda', today);

  if (error && (error.code === 'PGRST204' || error.message?.includes('tanggal_ronda'))) {
    const fb = await supabase
      .from('absen_records')
      .delete()
      .eq('tanggal', today);
    error = fb.error;
  }

  if (error) {
    return NextResponse.json({ error: 'Gagal mereset data' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
