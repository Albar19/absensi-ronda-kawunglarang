import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

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

async function ensureKolomHari() {
  const { error } = await supabase.from('jadwal_ronda').select('hari').limit(1);
  if (error && (error.code === 'PGRST204' || error.message?.includes('hari'))) {
    await jalankanMigrasiTanggalKeHari();
  }
}

export async function GET() {
  await ensureKolomHari();

  const { data, error } = await supabase
    .from('jadwal_ronda')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureKolomHari();

  try {
    const { hari, warga_id, keterangan } = await request.json();
    if (!hari || !warga_id) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const { error } = await supabase
      .from('jadwal_ronda')
      .insert({ hari, warga_id, shift: 'malam', keterangan });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Gagal menambah jadwal' }, { status: 500 });
  }
}