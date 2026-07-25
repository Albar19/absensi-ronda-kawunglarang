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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureKolomHari();

  const { id } = await params;
  try {
    const { hari, warga_id, shift, keterangan } = await request.json();
    const { error } = await supabase
      .from('jadwal_ronda')
      .update({ hari, warga_id, shift, keterangan })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Gagal mengupdate jadwal' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Gagal mengupdate jadwal' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await supabase.from('jadwal_ronda').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Gagal menghapus jadwal' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
