import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Helper: deteksi apakah kolom pakai 'dusun' atau masih 'rt'
function isColumnError(e: unknown): boolean {
  return (e as { code?: string })?.code === 'PGRST204' || (e as { message?: string })?.message?.includes('dusun') || false;
}

export async function GET() {
  let { data, error } = await supabase
    .from('warga')
    .select('*')
    .order('dusun')
    .order('nama');

  if (isColumnError(error)) {
    const fb = await supabase.from('warga').select('*').order('rt').order('nama');
    if (!fb.error) {
      data = fb.data.map((w: Record<string, unknown>) => ({ ...w, dusun: w.rt }));
    }
    error = fb?.error ?? error;
  }

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

  try {
    const { id, nama, dusun } = await request.json();
    if (!id || !nama || !dusun) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }
    if (typeof id !== 'string' || id.length > 50 ||
        typeof nama !== 'string' || nama.length > 100 ||
        typeof dusun !== 'string' || dusun.length > 100) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    let { error } = await supabase.from('warga').insert({ id, nama, dusun });
    if (isColumnError(error)) {
      const fb = await supabase.from('warga').insert({ id, nama, rt: dusun });
      error = fb.error;
    }
    if (error) {
      return NextResponse.json({ error: 'Gagal menambah warga' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Gagal menambah warga' }, { status: 500 });
  }
}
