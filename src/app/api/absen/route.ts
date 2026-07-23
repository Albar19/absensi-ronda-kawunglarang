import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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