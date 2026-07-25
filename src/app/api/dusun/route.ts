import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DUSUN_SEED = [
  'Dusun Cibangkong',
  'Dusun Cibuluh',
  'Dusun Bungbulang',
  'Dusun Gudang',
  'Dusun Chargelis',
  'Dusun Desa Carta',
];

/** Cek apakah data dari rt_list masih pake format RT lama */
function isOldRtFormat(data: { nama: string }[]): boolean {
  return data.length > 0 && data.every((r) => /^RT\s/i.test(r.nama));
}

async function queryDusun() {
  // Coba pakai tabel dusun_list dulu
  const { data, error } = await supabase.from('dusun_list').select('*').order('id');

  // Kalau tabel dusun_list belum ada, fallback ke rt_list (migrasi lama)
  if (error?.code === 'PGRST205') {
    const rt = await supabase.from('rt_list').select('*').order('id');
    if (!rt.error) {
      // Auto-seed: kalau rt_list masih kosong atau masih RT lama, seed ulang
      if (!rt.data || rt.data.length === 0 || isOldRtFormat(rt.data)) {
        // Hapus data RT lama & seed dengan dusun asli
        await supabase.from('rt_list').delete().neq('id', 0);
        const { data: seeded } = await supabase
          .from('rt_list')
          .insert(DUSUN_SEED.map((nama) => ({ nama })))
          .select()
          .order('id');
        if (seeded) return { data: seeded, error: null };
      }
      return rt;
    }
  }

  return { data, error };
}

async function insertDusun(nama: string) {
  // Coba insert ke dusun_list dulu
  const { data, error } = await supabase.from('dusun_list').insert({ nama }).select().single();

  // Kalau tabel dusun_list belum ada, fallback ke rt_list
  if (error?.code === 'PGRST205') {
    const fallback = await supabase.from('rt_list').insert({ nama }).select().single();
    return { data: fallback.data, error: fallback.error };
  }

  return { data, error };
}

export async function GET() {
  const { data, error } = await queryDusun();
  if (error) {
    return NextResponse.json({ error: 'Gagal mengambil data Dusun' }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { nama } = body;

  if (!nama || !nama.trim()) {
    return NextResponse.json({ error: 'Nama Dusun tidak boleh kosong' }, { status: 400 });
  }

  const { data, error } = await insertDusun(nama.trim());

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Dusun sudah ada' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menambah Dusun' }, { status: 500 });
  }

  return NextResponse.json(data);
}