import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/absen/daftar-nama
// Mengembalikan daftar nama unik yang SUDAH TERDAFTAR (terdaftar=true, aktif=true)
// untuk autocomplete. Nama ketik manual (belum terdaftar) tidak muncul di sini.
export async function GET() {
  const { data, error } = await supabase
    .from('warga')
    .select('nama')
    .eq('terdaftar', true)
    .eq('aktif', true)
    .order('nama', { ascending: true });

  if (error && (error.code === 'PGRST204' || error.message?.includes('warga'))) {
    // Fallback: tabel warga belum dibuat — pakai nama dari record absensi
    const fb = await supabase
      .from('absen_records')
      .select('nama_warga')
      .order('created_at', { ascending: false });
    if (fb.error) {
      // Kolom legacy 'nama'
      const legacy = await supabase
        .from('absen_records')
        .select('nama')
        .order('created_at', { ascending: false });
      if (legacy.error) {
        return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
      }
      const legacyNames = [...new Set<string>((legacy.data ?? []).map(r => (r as Record<string, unknown>).nama as string).filter(Boolean))];
      return NextResponse.json({ names: legacyNames });
    }
    const uniqueNames = [...new Set<string>((fb.data ?? []).map(r => (r as Record<string, unknown>).nama_warga as string).filter(Boolean))];
    return NextResponse.json({ names: uniqueNames });
  }

  if (error) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }

  const uniqueNames = [...new Set<string>((data ?? []).map(r => r.nama).filter(Boolean))];
  return NextResponse.json({ names: uniqueNames });
}
