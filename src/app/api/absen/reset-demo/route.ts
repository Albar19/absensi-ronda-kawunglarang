import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/data';

// POST /api/absen/reset-demo
// Hanya aktif saat demo mode. Menghapus semua data test berprefix [DEMO]
// dari absen_records dan warga, agar test berikutnya mulai bersih.
export async function POST() {
  if (!isDemoMode()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { count: absen } = await supabase
    .from('absen_records')
    .delete()
    .like('nama_warga', '[DEMO]%')
    .select('id');

  const { count: warga } = await supabase
    .from('warga')
    .delete()
    .like('nama', '[DEMO]%')
    .select('id');

  return NextResponse.json({
    success: true,
    deleted: { absen: absen ?? 0, warga: warga ?? 0 },
  });
}
