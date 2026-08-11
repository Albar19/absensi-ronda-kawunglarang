import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/api-auth';

const NO_STORE = { 'Cache-Control': 'no-store' };

// GET /api/absen/bulan — daftar bulan yang punya data absen (admin-only)
// Dipakai dropdown filter dashboard & export, tanpa fetch seluruh record.
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  const { data, error } = await supabase.rpc('daftar_bulan_absen');

  if (error) {
    return NextResponse.json(
      { error: 'Gagal mengambil daftar bulan' },
      { status: 500, headers: NO_STORE }
    );
  }

  const months = (data ?? []).map((r: { bulan: string }) => r.bulan).filter(Boolean);
  return NextResponse.json({ months }, { headers: NO_STORE });
}