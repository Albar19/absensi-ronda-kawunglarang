import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function getTanggalHariIni(): string {
  return new Date().toISOString().split('T')[0];
}

export async function DELETE() {
  // ── Auth check ──
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('admin_token')?.value;
  if (!tokenCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await verifyToken(tokenCookie);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getTanggalHariIni();

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