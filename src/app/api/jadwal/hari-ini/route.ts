import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('jadwal_ronda')
      .select('warga_id')
      .eq('tanggal', today);

    if (error) {
      return NextResponse.json(
        { error: 'Gagal mengambil jadwal' },
        { status: 500 }
      );
    }

    const wargaIds = data.map(j => j.warga_id);
    return NextResponse.json(wargaIds);
  } catch {
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}