import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/absen/daftar-nama[?dusun=...]
// Nama yang SUDAH TERDAFTAR (terdaftar=true, aktif=true) untuk dropdown absen.
// Dengan ?dusun= hanya nama di dusun tsb; tanpa dusun → semua (fallback lama).
export async function GET(request: Request) {
  const dusun = new URL(request.url).searchParams.get('dusun')?.trim() || '';

  let query = supabase
    .from('warga')
    .select('nama')
    .eq('terdaftar', true)
    .eq('aktif', true);

  if (dusun) query = query.eq('dusun', dusun);

  const { data, error } = await query.order('nama', { ascending: true });

  if (error && (error.code === 'PGRST204' || error.message?.includes('warga'))) {
    // Fallback: tabel warga belum dibuat — pakai nama dari record absensi
    const fb = await supabase
      .from('absen_records')
      .select('nama_warga, dusun')
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
    const filtered = (fb.data ?? []).filter(r =>
      !dusun || (r as Record<string, unknown>).dusun === dusun
    );
    const uniqueNames = [...new Set<string>((filtered as { nama_warga: string }[]).map(r => r.nama_warga).filter(Boolean))];
    return NextResponse.json({ names: uniqueNames });
  }

  if (error) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }

  const uniqueNames = [...new Set<string>((data ?? []).map(r => r.nama).filter(Boolean))];
  return NextResponse.json({ names: uniqueNames });
}
