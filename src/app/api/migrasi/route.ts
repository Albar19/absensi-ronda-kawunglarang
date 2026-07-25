import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

async function cekStatusMigrasi(): Promise<{ done: boolean; pesan: string }> {
  try {
    const { data } = await supabase.from('dusun_list').select('id').limit(1);
    if (data && data.length > 0) {
      return { done: true, pesan: 'Migrasi sudah dilakukan.' };
    }
    // dusun_list ada tapi kosong — seed aja
    await supabase.from('dusun_list').insert([
      { nama: 'Dusun Cibangkong' }, { nama: 'Dusun Cibuluh' }, { nama: 'Dusun Bungbulang' },
      { nama: 'Dusun Gudang' }, { nama: 'Dusun Chargelis' }, { nama: 'Dusun Desa Carta' },
    ]);
    return { done: true, pesan: 'Data Dusun berhasil diisi.' };
  } catch {
    // dusun_list belum ada — perlu migrasi
    return { done: false, pesan: 'Tabel dusun_list belum ada. Jalankan migrasi.' };
  }
}

async function jalankanMigrasi(): Promise<{ ok: boolean; pesan: string }> {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL;
  if (!databaseUrl) {
    return { ok: false, pesan: 'SUPABASE_DATABASE_URL tidak tersedia di environment.' };
  }

  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: databaseUrl });

    await pool.query(`ALTER TABLE IF EXISTS rt_list RENAME TO dusun_list`);
    await pool.query(`ALTER TABLE IF EXISTS warga RENAME COLUMN rt TO dusun`);
    await pool.query(`ALTER TABLE IF EXISTS absen_records RENAME COLUMN rt TO dusun`);

    await pool.query(`INSERT INTO dusun_list (nama) SELECT 'Dusun Cibangkong' WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun Cibangkong')`);
    await pool.query(`INSERT INTO dusun_list (nama) SELECT 'Dusun Cibuluh' WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun Cibuluh')`);
    await pool.query(`INSERT INTO dusun_list (nama) SELECT 'Dusun Bungbulang' WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun Bungbulang')`);
    await pool.query(`INSERT INTO dusun_list (nama) SELECT 'Dusun Gudang' WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun Gudang')`);
    await pool.query(`INSERT INTO dusun_list (nama) SELECT 'Dusun Chargelis' WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun Chargelis')`);
    await pool.query(`INSERT INTO dusun_list (nama) SELECT 'Dusun Desa Carta' WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun Desa Carta')`);

    await pool.end();
    return { ok: true, pesan: 'Migrasi berhasil! Tabel & kolom telah diubah ke Dusun.' };
  } catch {
    return { ok: false, pesan: 'Gagal menjalankan migrasi. Detail error ada di server log.' };
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