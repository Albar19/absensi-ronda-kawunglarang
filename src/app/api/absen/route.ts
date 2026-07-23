import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import { hitungJarak } from '@/lib/data';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, wargaId, nama, rt, tanggal, jamAbsen, jarakMeter, koordinatLat, koordinatLng } = body;

    if (!wargaId || !nama || !tanggal || !jamAbsen) {
      return NextResponse.json(
        { error: 'Data absen tidak lengkap' },
        { status: 400 }
      );
    }

    // Validasi jarak server-side
    if (koordinatLat != null && koordinatLng != null) {
      const jarakServer = hitungJarak(
        koordinatLat, koordinatLng,
        CONFIG.baleDesaLat, CONFIG.baleDesaLng
      );
      if (jarakServer > CONFIG.radiusMeter) {
        return NextResponse.json(
          { error: `Lokasi Anda terlalu jauh dari Bale Desa (${jarakServer}m, maks ${CONFIG.radiusMeter}m)` },
          { status: 403 }
        );
      }
    }

    const { error } = await supabase.from('absen_records').insert({
      id,
      warga_id: wargaId,
      nama,
      rt,
      tanggal,
      jam_absen: jamAbsen,
      jarak_meter: jarakMeter,
      koordinat_lat: koordinatLat,
      koordinat_lng: koordinatLng,
      status: 'hadir',
    });

    if (error) {
      return NextResponse.json(
        { error: 'Gagal menyimpan absen' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}