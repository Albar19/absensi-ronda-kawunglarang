import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';

// GET /api/jadwal — ambil semua jadwal (7 hari)
export async function GET() {
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

// PUT /api/jadwal — simpan semua jadwal (upsert 7 baris)
export async function PUT(request: Request) {
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
        // Fallback: pakai insert biasa
        const { error: fbError } = await supabase
          .from('jadwal_ronda')
          .update({ petugas: item.petugas })
          .eq('hari', item.hari);

        if (fbError && fbError.code === 'PGRST204') {
          // Tabel belum ada — lewati
          continue;
        }

        if (fbError) {
          return NextResponse.json({ error: `Gagal menyimpan ${item.hari}` }, { status: 500 });
        }
      }
    }

    // Ambil data terbaru
    const { data } = await supabase
      .from('jadwal_ronda')
      .select('id, hari, petugas')
      .order('hari', { ascending: true });

    return NextResponse.json({ success: true, jadwal: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}