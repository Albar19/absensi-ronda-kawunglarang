import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function getTanggalHariIni(): string {
  return new Date().toISOString().split('T')[0];
}

export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getTanggalHariIni();
  const { error } = await supabase
    .from('absen_records')
    .delete()
    .eq('tanggal', today);

  if (error) {
    return NextResponse.json(
      { error: 'Gagal mereset data' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}