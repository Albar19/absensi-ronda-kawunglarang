import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase.from('rt_list').select('*').order('id');
  if (error) {
    return NextResponse.json({ error: 'Gagal mengambil data RT' }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { nama } = body;

  if (!nama || !nama.trim()) {
    return NextResponse.json({ error: 'Nama RT tidak boleh kosong' }, { status: 400 });
  }

  const { data, error } = await supabase.from('rt_list').insert({ nama: nama.trim() }).select().single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'RT sudah ada' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menambah RT' }, { status: 500 });
  }

  return NextResponse.json(data);
}