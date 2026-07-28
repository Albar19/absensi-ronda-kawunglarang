import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import { hitungJarak } from '@/lib/data';

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

    // ── HITUNG JARAK SERVER-SIDE (Haversine) & VALIDASI ──
    let jarakFinal = 0;
    if (latitude != null && longitude != null) {
      const latNum = Number(latitude);
      const lngNum = Number(longitude);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        jarakFinal = hitungJarak(
          latNum, lngNum,
          CONFIG.baleDesaLat, CONFIG.baleDesaLng
        );
        if (jarakFinal > CONFIG.radiusMeter) {
          return NextResponse.json(
            {
              error: `Lokasi Anda terlalu jauh dari Bale Desa (${jarakFinal}m, maks ${CONFIG.radiusMeter}m)`,
              jarakServer: jarakFinal,
              jarakClient: Number(jarakMeter) || 0,
            },
            { status: 403 }
          );
        }
      }
    }

    // ── VALIDASI: 1 device hanya boleh 1 nama (cegah titip absen) ──
    const namaTrimmed = nama.trim();
    const { data: namaLain } = await supabase
      .from('absen_records')
      .select('nama_warga')
      .eq('device_id', deviceId)
      .neq('nama_warga', namaTrimmed)
      .limit(1);

    if (namaLain && namaLain.length > 0) {
      return NextResponse.json(
        {
          error: `Perangkat ini sudah terdaftar atas nama "${namaLain[0].nama_warga}". Tidak bisa absen atas nama berbeda. Hubungi Admin jika ingin mengganti nama.`,
          code: 'DEVICE_NAME_CONFLICT',
          registeredName: namaLain[0].nama_warga,
        },
        { status: 409 }
      );
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
        jarak_meter: jarakFinal,
        latitude: Number(latitude) || 0,
        longitude: Number(longitude) || 0,
      };

      const { error } = await supabase
        .from('absen_records')
        .update(updateData)
        .eq('id', existing.id);

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
      tanggal,                        // bukti tanggal untuk user
      tanggal_ronda: tanggal,
      jam_absen: jamAbsen,
      jenis_absen: jenisAbsen,
      jarak_meter: jarakFinal,        // pakai hitungan server agar sinkron
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      device_id: deviceId,
    };

    const { error } = await supabase.from('absen_records').insert(insertData);

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