import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Hari WIB (UTC+7) — index 0 = Minggu, mengikuti jadwal_ronda.hari
const HARI_WIB = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'] as const;

const NO_STORE = { 'Cache-Control': 'no-store' };

// GET /api/jadwal/hari-ini — petugas ronda hari ini (publik, tanpa auth).
// Dipakai form absen warga untuk default dusun sesuai jadwal admin.
export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (!(await rateLimit(`jadwal-hari:${ip}`, 60, 15 * 60 * 1000))) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan. Coba lagi beberapa saat.' },
      { status: 429, headers: NO_STORE }
    );
  }

  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const hari = HARI_WIB[wib.getUTCDay()];
  const fallback = CONFIG.petugasList[CONFIG.hariList.indexOf(hari) % CONFIG.petugasList.length];

  const { data, error } = await supabase
    .from('jadwal_ronda')
    .select('petugas')
    .eq('hari', hari)
    .maybeSingle();

  if (error) {
    // Tabel jadwal_ronda belum ada → fallback ke CONFIG agar fitur tetap jalan
    if (error.code === 'PGRST204' || error.message?.includes('jadwal_ronda')) {
      return NextResponse.json({ success: true, hari, petugas: fallback }, { headers: NO_STORE });
    }
    return NextResponse.json({ error: 'Gagal mengambil jadwal' }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json(
    { success: true, hari, petugas: data?.petugas || fallback },
    { headers: NO_STORE }
  );
}
