import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function slugifyDusun(nama: string): string {
  return nama.toLowerCase().replace(/\s+/g, '-');
}

export async function GET(request: NextRequest) {
  const dusun = request.nextUrl.searchParams.get('dusun');
  if (!dusun) {
    return NextResponse.json({ error: 'Parameter dusun diperlukan' }, { status: 400 });
  }

  const prefix = slugifyDusun(dusun) + '-';

  const { data, error } = await supabase
    .from('warga')
    .select('id')
    .like('id', `${prefix}%`)
    .order('id', { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: 'Gagal generate ID' }, { status: 500 });
  }

  let nextSeq = 1;
  if (data && data.length > 0) {
    const lastId = data[0].id;
    const parts = lastId.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  const newId = `${prefix}${String(nextSeq).padStart(3, '0')}`;
  return NextResponse.json({ id: newId });
}
