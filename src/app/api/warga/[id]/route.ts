import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function isColumnError(e: unknown): boolean {
  return (e as { code?: string })?.code === 'PGRST204' || (e as { message?: string })?.message?.includes('dusun') || false;
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

  const { id } = await params;
  try {
    const { nama, dusun } = await request.json();
    if (!nama || !dusun) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }
    if (typeof nama !== 'string' || nama.length > 100 ||
        typeof dusun !== 'string' || dusun.length > 100) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }
    let { error } = await supabase
      .from('warga')
      .update({ nama, dusun })
      .eq('id', id);

    if (isColumnError(error)) {
      const fb = await supabase.from('warga').update({ nama, rt: dusun }).eq('id', id);
      error = fb.error;
    }

    if (error) {
      return NextResponse.json({ error: 'Gagal mengupdate warga' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Gagal mengupdate warga' }, { status: 500 });
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

  // Hapus data terkait dulu biar aman (defense: fallback kalo cascade belum aktif)
  await supabase.from('absen_records').delete().eq('warga_id', id);
  await supabase.from('jadwal_ronda').delete().eq('warga_id', id);

  const { error } = await supabase.from('warga').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Gagal menghapus warga' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
