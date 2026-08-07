import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/absen/cek-masuk?tanggal=YYYY-MM-DD
// Mengembalikan daftar semua warga yang sudah absen masuk malam ini
// (nama + dusun, unik). Dipakai saat sesi pulang untuk menampilkan checklist.
// Tanpa filter perangkat: 1 HP bisa dipakai banyak orang.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tanggal = searchParams.get('tanggal');

  if (!tanggal) {
    return NextResponse.json(
      { error: 'Param tanggal wajib' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('absen_records')
    .select('nama_warga, dusun')
    .eq('tanggal_ronda', tanggal)
    .eq('jenis_absen', 'masuk');

  if (error) {
    // Fallback ke kolom 'tanggal' jika 'tanggal_ronda' belum ada
    if (error.code === 'PGRST204' || error.message?.includes('tanggal_ronda') || error.message?.includes('jenis_absen')) {
      const fb = await supabase
        .from('absen_records')
        .select('nama, dusun')
        .eq('tanggal', tanggal)
        .eq('jenis_absen', 'masuk');
      if (fb.error) {
        return NextResponse.json({ error: 'Gagal memeriksa absen masuk' }, { status: 500 });
      }
      const people = dedupPeople((fb.data ?? []).map((r: Record<string, unknown>) => ({
        nama: String(r.nama ?? '').trim(),
        dusun: String(r.dusun ?? '').trim(),
      })));
      if (people.length === 0) {
        return NextResponse.json(
          { error: 'Belum ada absen masuk malam ini.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, people });
    }
    return NextResponse.json({ error: 'Gagal memeriksa absen masuk' }, { status: 500 });
  }

  const people = dedupPeople((data ?? []).map(r => ({
    nama: String(r.nama_warga ?? '').trim(),
    dusun: String(r.dusun ?? '').trim(),
  })));

  if (people.length === 0) {
    return NextResponse.json(
      { error: 'Belum ada absen masuk malam ini.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, people });
}

// Dedup berdasarkan kombinasi nama + dusun (identitas = nama + dusun)
function dedupPeople(rows: { nama: string; dusun: string }[]) {
  const seen = new Map<string, { nama: string; dusun: string }>();
  rows.forEach(r => {
    if (!r.nama || !r.dusun) return;
    const key = `${r.nama.toLowerCase()}|${r.dusun.toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, r);
  });
  return Array.from(seen.values());
}
