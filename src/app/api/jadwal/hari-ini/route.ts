import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import { isAdminRequest } from '@/lib/api-auth';

const HARI_INDONESIA = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

function getHariIni(): string {
  return HARI_INDONESIA[new Date().getDay()];
}

// GET /api/jadwal/hari-ini — ambil jadwal untuk hari ini (admin-only)
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hariIni = getHariIni();

  const { data, error } = await supabase
    .from('jadwal_ronda')
    .select('id, hari, petugas')
    .eq('hari', hariIni)
    .maybeSingle();

  if (error) {
    // Fallback: return default rotasi
    if (error.code === 'PGRST204' || error.message?.includes('jadwal_ronda')) {
      const idx = CONFIG.hariList.indexOf(hariIni as typeof CONFIG.hariList[number]);
      const petugas = idx >= 0 ? CONFIG.petugasList[idx % CONFIG.petugasList.length] : CONFIG.petugasList[0];
      return NextResponse.json({ hari: hariIni, petugas });
    }
    return NextResponse.json({ error: 'Gagal mengambil jadwal' }, { status: 500 });
  }

  if (!data) {
    // Return default
    const idx = CONFIG.hariList.indexOf(hariIni as typeof CONFIG.hariList[number]);
    const petugas = idx >= 0 ? CONFIG.petugasList[idx % CONFIG.petugasList.length] : CONFIG.petugasList[0];
    return NextResponse.json({ hari: hariIni, petugas });
  }

  return NextResponse.json(data);
}