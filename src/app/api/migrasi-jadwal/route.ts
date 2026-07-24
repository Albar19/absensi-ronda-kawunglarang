import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)?.[1];

const SQL_MIGRASI = `
ALTER TABLE IF EXISTS jadwal_ronda RENAME COLUMN tanggal TO hari;
ALTER TABLE IF EXISTS jadwal_ronda ALTER COLUMN hari TYPE text;
UPDATE jadwal_ronda SET hari = (
  CASE
    WHEN EXTRACT(DOW FROM hari::date) = 0 THEN 'Minggu'
    WHEN EXTRACT(DOW FROM hari::date) = 1 THEN 'Senin'
    WHEN EXTRACT(DOW FROM hari::date) = 2 THEN 'Selasa'
    WHEN EXTRACT(DOW FROM hari::date) = 3 THEN 'Rabu'
    WHEN EXTRACT(DOW FROM hari::date) = 4 THEN 'Kamis'
    WHEN EXTRACT(DOW FROM hari::date) = 5 THEN 'Jumat'
    WHEN EXTRACT(DOW FROM hari::date) = 6 THEN 'Sabtu'
  END
) WHERE hari IS NOT NULL;
`;

type CekResult = { done: boolean; pesan: string };

async function cekStatusMigrasi(): Promise<CekResult> {
  // Coba query kolom 'hari' — kalau error, berarti masih pakai skema lama
  const { error: errHari } = await supabase.from('jadwal_ronda').select('hari').limit(1);
  if (!errHari) {
    // Kolom 'hari' ada, query sukses
    return { done: true, pesan: 'Migrasi jadwal sudah dilakukan.' };
  }

  // Kolom 'hari' belum ada — cek apakah masih pakai 'tanggal'
  const { data: dataLama } = await supabase.from('jadwal_ronda').select('tanggal').limit(1).maybeSingle();
  if (dataLama !== null) {
    return { done: false, pesan: 'Tabel jadwal_ronda masih menggunakan kolom "tanggal". Jalankan migrasi untuk mengubah ke "hari".' };
  }

  // Tabel belum ada sama sekali
  return { done: true, pesan: 'Tabel jadwal_ronda belum ada.' };
}

async function jalankanMigrasi(): Promise<{ ok: boolean; pesan: string }> {
  if (!PROJECT_REF) {
    return { ok: false, pesan: 'Gagal membaca SUPABASE_URL. Pastikan formatnya https://xxxxx.supabase.co' };
  }

  try {
    const res = await fetch(`https://${PROJECT_REF}.supabase.co/pg/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: SQL_MIGRASI }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { ok: false, pesan: `Gagal: ${res.status} — ${errBody}` };
    }

    return { ok: true, pesan: 'Migrasi jadwal berhasil! Kolom "tanggal" telah diubah menjadi "hari".' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Terjadi kesalahan';
    return { ok: false, pesan: `Gagal terhubung ke database: ${msg}` };
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = await cekStatusMigrasi();
  return NextResponse.json(status);
}

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasil = await jalankanMigrasi();
  if (!hasil.ok) {
    return NextResponse.json({ error: hasil.pesan }, { status: 500 });
  }
  return NextResponse.json({ success: true, pesan: hasil.pesan });
}
