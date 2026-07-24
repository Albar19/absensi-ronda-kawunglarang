import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase.from('dusun_list').select('*').order('id');
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

  const { data, error } = await supabase.from('dusun_list').insert({ nama: nama.trim() }).select().single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Dusun sudah ada' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menambah Dusun' }, { status: 500 });
  }

  return NextResponse.json(data);
}