import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import { hitungJarak } from '@/lib/data';
import { rateLimit } from '@/lib/rate-limit';

// Batas pengiriman absen per IP (persisten di Supabase, aman untuk serverless)
// 1 nama = 1 POST; satu HP bisa dipakai banyak warga, jadi batas dibuat longgar.
const ABSEN_MAX = 150;
const ABSEN_WINDOW_MS = 15 * 60 * 1000;

// ── Waktu server dalam WIB (UTC+7) ──
const WIB_OFFSET = 7 * 60 * 60 * 1000;

const MASUK_MULAI = CONFIG.jamBukaMasuk * 60 + CONFIG.menitBukaMasuk;      // 1200 (20:00)
const MASUK_SELESAI = CONFIG.jamTutupMasuk * 60 + CONFIG.menitTutupMasuk;  // 1320 (22:00)
const PULANG_MULAI = CONFIG.jamBukaPulang * 60 + CONFIG.menitBukaPulang;    // 1380 (23:00)
const PULANG_SELESAI = CONFIG.jamTutupPulang * 60 + CONFIG.menitTutupPulang; // 1439 (23:59)

// Toleransi batas sesi (menit) — mencegah penolakan saat proses GPS/form melewati jam tutup
const GRACE_MENIT = 5;

function getWibNow() {
  const wib = new Date(Date.now() + WIB_OFFSET);
  const menit = wib.getUTCHours() * 60 + wib.getUTCMinutes();
  const jamAbsenServer = `${String(wib.getUTCHours()).padStart(2, '0')}:${String(wib.getUTCMinutes()).padStart(2, '0')}:${String(wib.getUTCSeconds()).padStart(2, '0')}`;
  const tanggalWib = wib.toISOString().split('T')[0];
  return { wib, menit, jamAbsenServer, tanggalWib };
}

export async function POST(request: Request) {
  try {
    // ── Rate limiting by IP ──
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!(await rateLimit(`absen:${ip}`, ABSEN_MAX, ABSEN_WINDOW_MS))) {
      return NextResponse.json(
        { error: 'Terlalu banyak pengiriman absen. Coba lagi beberapa saat.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { nama, dusun, jenisAbsen, latitude, longitude, deviceId } = body;

    if (!nama || !dusun || !deviceId || !jenisAbsen) {
      return NextResponse.json(
        { error: 'Data absen tidak lengkap' },
        { status: 400 }
      );
    }

    const namaTrimmed = String(nama).trim();
    const dusunTrimmed = String(dusun).trim();

    if (
      typeof nama !== 'string' || namaTrimmed.length === 0 || nama.length > 100 ||
      typeof dusun !== 'string' || dusunTrimmed.length === 0 || dusun.length > 50 ||
      typeof deviceId !== 'string' || deviceId.length < 8 || deviceId.length > 100 ||
      (jenisAbsen !== 'masuk' && jenisAbsen !== 'pulang')
    ) {
      return NextResponse.json(
        { error: 'Data tidak valid' },
        { status: 400 }
      );
    }

    // Validasi dusun harus dari daftar resmi
    if (!CONFIG.dusunList.includes(dusunTrimmed as typeof CONFIG.dusunList[number])) {
      return NextResponse.json(
        { error: 'Dusun tidak valid' },
        { status: 400 }
      );
    }

    // ── VALIDASI JAM SERVER-SIDE (waktu server WIB, bukan client) ──
    const { menit: wibMenit, jamAbsenServer, tanggalWib } = getWibNow();

    let tanggalRonda: string;
    if (jenisAbsen === 'masuk') {
      if (wibMenit < MASUK_MULAI || wibMenit >= MASUK_SELESAI + GRACE_MENIT) {
        return NextResponse.json(
          { error: 'Absen masuk hanya tersedia pukul 20:00 - 22:00 WIB.' },
          { status: 403 }
        );
      }
      tanggalRonda = tanggalWib;
    } else {
      if (wibMenit < PULANG_MULAI || wibMenit > PULANG_SELESAI + GRACE_MENIT) {
        return NextResponse.json(
          { error: 'Absen pulang hanya tersedia pukul 23:00 - 23:59 WIB.' },
          { status: 403 }
        );
      }
      tanggalRonda = tanggalWib;
    }

    // ── VALIDASI GPS WAJIB (server-side Haversine) ──
    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    if (
      latitude == null || longitude == null ||
      isNaN(latNum) || isNaN(lngNum) ||
      latNum < -90 || latNum > 90 ||
      lngNum < -180 || lngNum > 180
    ) {
      return NextResponse.json(
        { error: 'Data lokasi GPS tidak valid. Aktifkan GPS lalu coba lagi.' },
        { status: 400 }
      );
    }

    const jarakFinal = hitungJarak(
      latNum, lngNum,
      CONFIG.baleDesaLat, CONFIG.baleDesaLng
    );

    if (jarakFinal > CONFIG.radiusMeter) {
      return NextResponse.json(
        {
          error: `Lokasi Anda terlalu jauh dari Bale Desa (${jarakFinal}m, maks ${CONFIG.radiusMeter}m)`,
          jarakServer: jarakFinal,
          jarakClient: Number(body.jarakMeter) || 0,
        },
        { status: 403 }
      );
    }

    // ── Absen pulang wajib sudah absen masuk di malam yang sama ──
    if (jenisAbsen === 'pulang') {
      const { data: sudahMasuk } = await supabase
        .from('absen_records')
        .select('id')
        .eq('nama_warga', namaTrimmed)
        .eq('dusun', dusunTrimmed)
        .eq('tanggal_ronda', tanggalRonda)
        .eq('jenis_absen', 'masuk')
        .maybeSingle();

      if (!sudahMasuk) {
        return NextResponse.json(
          { error: 'Anda belum absen masuk malam ini.' },
          { status: 403 }
        );
      }
    }

    // ── UPSERT: jika nama_warga + dusun + tanggal_ronda + jenis_absen sudah ada, UPDATE ──
    const { data: existing } = await supabase
      .from('absen_records')
      .select('id')
      .eq('nama_warga', namaTrimmed)
      .eq('dusun', dusunTrimmed)
      .eq('tanggal_ronda', tanggalRonda)
      .eq('jenis_absen', jenisAbsen)
      .maybeSingle();

    if (existing) {
      const updateData: Record<string, unknown> = {
        nama_warga: namaTrimmed,
        dusun: dusunTrimmed,
        jam_absen: jamAbsenServer,        // cap waktu dari server, bukan client
        jarak_meter: jarakFinal,          // hitungan server agar sinkron
        latitude: latNum,
        longitude: lngNum,
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

    // ── INSERT baru (id auto-generate dari DB via DEFAULT gen_random_uuid()) ──
    const insertData: Record<string, unknown> = {
      nama_warga: namaTrimmed,
      dusun: dusunTrimmed,
      tanggal: tanggalRonda,              // bukti tanggal untuk user (dari server)
      tanggal_ronda: tanggalRonda,
      jam_absen: jamAbsenServer,          // cap waktu dari server, bukan client
      jenis_absen: jenisAbsen,
      jarak_meter: jarakFinal,
      latitude: latNum,
      longitude: lngNum,
      device_id: deviceId,
    };

    const { error } = await supabase.from('absen_records').insert(insertData);

    if (error) {
      return NextResponse.json(
        { error: 'Gagal menyimpan absen' },
        { status: 500 }
      );
    }

    // Auto-register nama ke master warga (non-blocking). Nama baru masuk
    // antrean verifikasi admin (terdaftar=false) sampai disetujui.
    await supabase
      .from('warga')
      .upsert(
        { nama: namaTrimmed, dusun: dusunTrimmed },
        { onConflict: 'nama,dusun', ignoreDuplicates: true }
      );

    return NextResponse.json({ success: true, updated: false });
  } catch {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
