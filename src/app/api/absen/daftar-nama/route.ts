import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/absen/daftar-nama
// Mengembalikan daftar nama unik dari semua record absensi (untuk autocomplete)
export async function GET() {
  const { data, error } = await supabase
    .from('absen_records')
    .select('nama_warga')
    .order('created_at', { ascending: false });

  if (error && (error.code === 'PGRST204' || error.message?.includes('nama_warga'))) {
    // Fallback ke kolom 'nama'
    const fb = await supabase
      .from('absen_records')
      .select('nama')
      .order('created_at', { ascending: false });
    if (fb.error) {
      return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
    const uniqueNames = [...new Set<string>((fb.data ?? []).map(r => (r as Record<string, unknown>).nama as string).filter(Boolean))];
    return NextResponse.json({ names: uniqueNames });
  }

  if (error) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }

  const uniqueNames = [...new Set<string>((data ?? []).map(r => r.nama_warga).filter(Boolean))];
  return NextResponse.json({ names: uniqueNames });
}
