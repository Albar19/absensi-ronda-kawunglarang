import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import { hitungJarak } from '@/lib/data';

function isDevColError(e: unknown): boolean {
  return (e as { code?: string })?.code === 'PGRST204' ||
    (e as { message?: string })?.message?.includes('device_id') ||
    false;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, nama, dusun, tanggal, jamAbsen, jenisAbsen, latitude, longitude, jarakMeter, deviceId } = body;

    if (!nama || !dusun || !tanggal || !jamAbsen || !deviceId || !jenisAbsen) {
      return NextResponse.json(
        { error: 'Data absen tidak lengkap' },
        { status: 400 }
      );
    }

    if (
      typeof nama !== 'string' || nama.trim().length === 0 || nama.length > 100 ||
      typeof dusun !== 'string' || dusun.trim().length === 0 || dusun.length > 50 ||
      typeof tanggal !== 'string' || tanggal.length > 20 ||
      typeof jamAbsen !== 'string' || jamAbsen.length > 20 ||
      typeof deviceId !== 'string' || deviceId.length > 100 ||
      (jenisAbsen !== 'masuk' && jenisAbsen !== 'pulang')
    ) {
      return NextResponse.json(
        { error: 'Data tidak valid' },
        { status: 400 }
      );
    }

    // Validasi jarak server-side (Haversine)
    if (latitude != null && longitude != null) {
      const latNum = Number(latitude);
      const lngNum = Number(longitude);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        const jarakServer = hitungJarak(
          latNum, lngNum,
          CONFIG.baleDesaLat, CONFIG.baleDesaLng
        );
        if (jarakServer > CONFIG.radiusMeter) {
          return NextResponse.json(
            { error: `Lokasi Anda terlalu jauh dari Bale Desa (${jarakServer}m, maks ${CONFIG.radiusMeter}m)` },
            { status: 403 }
          );
        }
      }
    }

    // ── UPSERT: jika device_id + tanggal_ronda + jenis_absen sudah ada, UPDATE ──
    const { data: existing } = await supabase
      .from('absen_records')
      .select('id')
      .eq('device_id', deviceId)
      .eq('tanggal_ronda', tanggal)
      .eq('jenis_absen', jenisAbsen)
      .maybeSingle();

    if (existing) {
      const updateData: Record<string, unknown> = {
        nama_warga: nama.trim(),
        dusun: dusun.trim(),
        jam_absen: jamAbsen,
        jarak_meter: Math.round(Number(jarakMeter) || 0),
        latitude: Number(latitude) || 0,
        longitude: Number(longitude) || 0,
      };

      let { error } = await supabase
        .from('absen_records')
        .update(updateData)
        .eq('id', existing.id);

      if (isDevColError(error)) {
        const fbData: Record<string, unknown> = {
          nama: nama.trim(),
          dusun: dusun.trim(),
          jam_absen: jamAbsen,
          jarak_meter: Math.round(Number(jarakMeter) || 0),
          koordinat_lat: Number(latitude) || 0,
          koordinat_lng: Number(longitude) || 0,
        };
        const fb = await supabase
          .from('absen_records')
          .update(fbData)
          .eq('id', existing.id);
        error = fb.error;
      }

      if (error) {
        return NextResponse.json(
          { error: 'Gagal mengupdate absen' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, updated: true });
    }

    // ── INSERT baru ──
    const insertData: Record<string, unknown> = {
      id,
      nama_warga: nama.trim(),
      dusun: dusun.trim(),
      tanggal,
      tanggal_ronda: tanggal,
      jam_absen: jamAbsen,
      jenis_absen: jenisAbsen,
      jarak_meter: Math.round(Number(jarakMeter) || 0),
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      device_id: deviceId,
    };

    let { error } = await supabase.from('absen_records').insert(insertData);

    if (isDevColError(error)) {
      const fbData: Record<string, unknown> = {
        id,
        warga_id: deviceId,
        nama: nama.trim(),
        dusun: dusun.trim(),
        tanggal,
        jam_absen: jamAbsen,
        jenis_absen: jenisAbsen,
        jarak_meter: Math.round(Number(jarakMeter) || 0),
        koordinat_lat: Number(latitude) || 0,
        koordinat_lng: Number(longitude) || 0,
        status: 'hadir',
      };
      const fb = await supabase.from('absen_records').insert(fbData);
      error = fb.error;
    }

    if (error) {
      return NextResponse.json(
        { error: 'Gagal menyimpan absen' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, updated: false });
  } catch {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}