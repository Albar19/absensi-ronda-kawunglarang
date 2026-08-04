import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import { isAdminRequest } from '@/lib/api-auth';

// GET /api/jadwal — ambil semua jadwal (7 hari, admin-only)
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('jadwal_ronda')
    .select('id, hari, petugas')
    .order('hari', { ascending: true });

  if (error) {
    // Fallback: tabel mungkin belum dibuat
    if (error.code === 'PGRST204' || error.message?.includes('jadwal_ronda')) {
      // Return default
      const defaultJadwal = CONFIG.hariList.map((hari, i) => ({
        id: '',
        hari,
        petugas: CONFIG.petugasList[i % CONFIG.petugasList.length],
      }));
      return NextResponse.json(defaultJadwal);
    }
    return NextResponse.json({ error: 'Gagal mengambil jadwal' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    // Return default jika belum ada data
    const defaultJadwal = CONFIG.hariList.map((hari, i) => ({
      id: '',
      hari,
      petugas: CONFIG.petugasList[i % CONFIG.petugasList.length],
    }));
    return NextResponse.json(defaultJadwal);
  }

  return NextResponse.json(data);
}

// PUT /api/jadwal — simpan semua jadwal (upsert 7 baris, admin-only)
export async function PUT(request: Request) {
  // ── Auth check ──
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const jadwal: { hari: string; petugas: string }[] = body.jadwal;

    if (!Array.isArray(jadwal) || jadwal.length !== 7) {
      return NextResponse.json({ error: 'Harus ada 7 baris jadwal' }, { status: 400 });
    }

    // Validasi
    const validHari = CONFIG.hariList;
    const validPetugas = CONFIG.petugasList;
    for (const item of jadwal) {
      if (!validHari.includes(item.hari as typeof validHari[number])) {
        return NextResponse.json({ error: `Hari tidak valid: ${item.hari}` }, { status: 400 });
      }
      if (!validPetugas.includes(item.petugas as typeof validPetugas[number])) {
        return NextResponse.json({ error: `Petugas tidak valid: ${item.petugas}` }, { status: 400 });
      }
    }

    // Upsert semua baris dalam loop
    for (const item of jadwal) {
      const { error } = await supabase
        .from('jadwal_ronda')
        .upsert(
          { hari: item.hari, petugas: item.petugas },
          { onConflict: 'hari' }
        );

      if (error) {
        console.error(`[PUT /api/jadwal] upsert gagal untuk ${item.hari}:`, error.message);

        // Fallback: insert biasa kalau upsert gagal (misal karena row belum ada)
        const { error: fbError } = await supabase
          .from('jadwal_ronda')
          .insert({ hari: item.hari, petugas: item.petugas });

        if (fbError && fbError.code === 'PGRST204') {
          // Tabel belum ada — skip, nanti dikasih tahu user
          console.error(`[PUT /api/jadwal] tabel jadwal_ronda tidak ditemukan`);
          return NextResponse.json({
            error: 'Tabel jadwal_ronda belum ada. Jalankan migration SQL di Supabase Dashboard terlebih dahulu.',
          }, { status: 500 });
        }

        if (fbError) {
          console.error(`[PUT /api/jadwal] insert fallback gagal untuk ${item.hari}:`, fbError.message);
          return NextResponse.json({ error: `Gagal menyimpan ${item.hari}: ${fbError.message}` }, { status: 500 });
        }
      }
    }

    // Ambil data terbaru
    const { data, error: selectError } = await supabase
      .from('jadwal_ronda')
      .select('id, hari, petugas')
      .order('hari', { ascending: true });

    if (selectError) {
      console.error(`[PUT /api/jadwal] select setelah simpan gagal:`, selectError.message);
      // Tetap return success karena data sudah tersimpan
      return NextResponse.json({ success: true, jadwal: [] });
    }

    return NextResponse.json({ success: true, jadwal: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    console.error(`[PUT /api/jadwal] unexpected error:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}