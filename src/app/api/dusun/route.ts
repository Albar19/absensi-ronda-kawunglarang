import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const DUSUN_SEED = [
  'Dusun Cibangkong',
  'Dusun Cibuluh',
  'Dusun Bungbulang',
  'Dusun Gudang',
  'Dusun Chargelis',
  'Dusun Desa Carta',
];

/** Jalankan migrasi RT → Dusun (rename tabel & kolom, hapus data RT, seed ulang) */
async function jalankanMigrasiRtKeDusun(): Promise<{ ok: boolean; pesan: string }> {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL;
  if (!databaseUrl) {
    return { ok: false, pesan: 'SUPABASE_DATABASE_URL tidak tersedia — jalankan SQL migration manual.' };
  }

  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: databaseUrl });

    // 1. Rename tabel rt_list → dusun_list
    await pool.query(`ALTER TABLE IF EXISTS rt_list RENAME TO dusun_list`);

    // 2. Rename kolom rt → dusun di warga & absen_records
    await pool.query(`ALTER TABLE IF EXISTS warga RENAME COLUMN rt TO dusun`);
    await pool.query(`ALTER TABLE IF EXISTS absen_records RENAME COLUMN rt TO dusun`);

    // 3. Hapus data lama yang masih pake format RT
    await pool.query(`DELETE FROM warga WHERE id ILIKE 'rt%' OR dusun ILIKE 'RT %'`);
    await pool.query(`DELETE FROM absen_records WHERE warga_id ILIKE 'rt%' OR dusun ILIKE 'RT %'`);

    // 4. Bersihkan & seed ulang dusun_list
    await pool.query(`DELETE FROM dusun_list`);
    for (const nama of DUSUN_SEED) {
      await pool.query(`INSERT INTO dusun_list (nama) VALUES ($1)`, [nama]);
    }

    await pool.end();
    return { ok: true, pesan: 'Migrasi RT→Dusun berhasil.' };
  } catch {
    return { ok: false, pesan: 'Gagal migrasi. Detail error ada di server log.' };
  }
}

export async function GET() {
  // Coba query dusun_list dulu
  const { data, error } = await supabase.from('dusun_list').select('*').order('id');

  // Kalau tabel belum ada, jalankan auto-migrasi
  if (error?.code === 'PGRST205') {
    const hasil = await jalankanMigrasiRtKeDusun();
    if (!hasil.ok) {
      // Fallback: coba rt_list (kalau masih ada waktu sebelum migrasi)
      const rt = await supabase.from('rt_list').select('*').order('id');
      if (!rt.error) {
        // Seed ulang data RT dengan dusun asli
        await supabase.from('rt_list').delete().neq('id', 0);
        const { data: seeded } = await supabase
          .from('rt_list')
          .insert(DUSUN_SEED.map((n) => ({ nama: n })))
          .select()
          .order('id');
        if (seeded) return NextResponse.json(seeded);
      }
      return NextResponse.json({ error: hasil.pesan }, { status: 500 });
    }
    // Migrasi sukses, query ulang
    const { data: dataBaru, error: errorBaru } = await supabase.from('dusun_list').select('*').order('id');
    if (errorBaru) {
      return NextResponse.json({ error: 'Gagal mengambil data Dusun' }, { status: 500 });
    }
    return NextResponse.json(dataBaru);
  }

  if (error) {
    return NextResponse.json({ error: 'Gagal mengambil data Dusun' }, { status: 500 });
  }

  // Kalau tabel ada tapi kosong, seed langsung
  if (!data || data.length === 0) {
    const { data: seeded } = await supabase
      .from('dusun_list')
      .insert(DUSUN_SEED.map((n) => ({ nama: n })))
      .select()
      .order('id');
    if (seeded) return NextResponse.json(seeded);
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { nama } = body;

  if (!nama || !nama.trim()) {
    return NextResponse.json({ error: 'Nama Dusun tidak boleh kosong' }, { status: 400 });
  }
  if (typeof nama !== 'string' || nama.trim().length > 100) {
    return NextResponse.json({ error: 'Nama Dusun terlalu panjang' }, { status: 400 });
  }

  const { data, error } = await supabase.from('dusun_list').insert({ nama: nama.trim() }).select().single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Dusun sudah ada' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menambah Dusun' }, { status: 500 });
  }

  return NextResponse.json(data);
}
