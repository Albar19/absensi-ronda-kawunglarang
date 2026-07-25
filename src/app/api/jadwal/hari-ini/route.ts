import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getHariIniIndonesia } from '@/lib/data';

/** Jalankan migrasi tanggal → hari di tabel jadwal_ronda */
async function jalankanMigrasiTanggalKeHari(): Promise<boolean> {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL;
  if (!databaseUrl) return false;

  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: databaseUrl });

    await pool.query(`ALTER TABLE jadwal_ronda ADD COLUMN IF NOT EXISTS hari text`);
    await pool.query(`
      UPDATE jadwal_ronda SET hari =
        CASE EXTRACT(DOW FROM tanggal)
          WHEN 0 THEN 'Minggu'
          WHEN 1 THEN 'Senin'
          WHEN 2 THEN 'Selasa'
          WHEN 3 THEN 'Rabu'
          WHEN 4 THEN 'Kamis'
          WHEN 5 THEN 'Jumat'
          WHEN 6 THEN 'Sabtu'
        END
    `);
    await pool.query(`ALTER TABLE jadwal_ronda DROP COLUMN IF EXISTS tanggal`);
    await pool.end();
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const hariIni = getHariIniIndonesia();

    const { data, error } = await supabase
      .from('jadwal_ronda')
      .select('warga_id')
      .eq('hari', hariIni);

    // Kalau kolom 'hari' belum ada, jalankan migrasi otomatis
    if (error && (error.code === 'PGRST204' || error.message?.includes('hari'))) {
      const ok = await jalankanMigrasiTanggalKeHari();
      if (!ok) {
        return NextResponse.json(
          { error: 'Kolom hari belum ada. Jalankan supabase/migration_tanggal_to_hari.sql di Supabase SQL Editor.' },
          { status: 500 }
        );
      }
      // Coba lagi setelah migrasi
      const { data: data2, error: error2 } = await supabase
        .from('jadwal_ronda')
        .select('warga_id')
        .eq('hari', hariIni);
      if (error2) throw error2;
      const wargaIds = data2.map(j => j.warga_id);
      return NextResponse.json(wargaIds);
    }

    if (error) throw error;

    const wargaIds = data.map(j => j.warga_id);
    return NextResponse.json(wargaIds);
  } catch {
    return NextResponse.json(
      { error: 'Gagal mengambil jadwal' },
      { status: 500 }
    );
  }
}
