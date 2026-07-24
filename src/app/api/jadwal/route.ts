import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('jadwal_ronda')
    .select('*')
    .order('created_at', { ascending: false });

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
    const { hari, warga_id, keterangan } = await request.json();
    if (!hari || !warga_id) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const { error } = await supabase
      .from('jadwal_ronda')
      .insert({ hari, warga_id, shift: 'malam', keterangan });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Gagal menambah jadwal' }, { status: 500 });
  }
}