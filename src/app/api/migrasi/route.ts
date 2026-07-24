import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)?.[1];

const SQL_MIGRASI = `
ALTER TABLE IF EXISTS rt_list RENAME TO dusun_list;
ALTER TABLE IF EXISTS warga RENAME COLUMN rt TO dusun;
ALTER TABLE IF EXISTS absen_records RENAME COLUMN rt TO dusun;

INSERT INTO dusun_list (nama) SELECT 'Dusun 1' WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun 1');
INSERT INTO dusun_list (nama) SELECT 'Dusun 2' WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun 2');
INSERT INTO dusun_list (nama) SELECT 'Dusun 3' WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun 3');
INSERT INTO dusun_list (nama) SELECT 'Dusun 4' WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun 4');
INSERT INTO dusun_list (nama) SELECT 'Dusun 5' WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun 5');
INSERT INTO dusun_list (nama) SELECT 'Dusun 6' WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun 6');
`;

async function cekStatusMigrasi(): Promise<{ done: boolean; pesan: string }> {
  try {
    const { data } = await supabase.from('dusun_list').select('id').limit(1);
    if (data && data.length > 0) {
      return { done: true, pesan: 'Migrasi sudah dilakukan.' };
    }
    // dusun_list ada tapi kosong — seed aja
    await supabase.from('dusun_list').insert([
      { nama: 'Dusun 1' }, { nama: 'Dusun 2' }, { nama: 'Dusun 3' },
      { nama: 'Dusun 4' }, { nama: 'Dusun 5' }, { nama: 'Dusun 6' },
    ]);
    return { done: true, pesan: 'Data Dusun berhasil diisi.' };
  } catch {
    // dusun_list belum ada — perlu migrasi
    return { done: false, pesan: 'Tabel dusun_list belum ada. Jalankan migrasi.' };
  }
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

    return { ok: true, pesan: 'Migrasi berhasil! Tabel & kolom telah diubah ke Dusun.' };
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