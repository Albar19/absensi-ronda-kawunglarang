import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/absen/cek-device?device_id=xxx
// Mengembalikan nama yang terdaftar untuk device ini (jika ada)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('device_id');

  if (!deviceId) {
    return NextResponse.json(
      { error: 'Param device_id wajib' },
      { status: 400 }
    );
  }

  if (deviceId.length > 100) {
    return NextResponse.json(
      { error: 'Device ID tidak valid' },
      { status: 400 }
    );
  }

  // Cari nama unik yang pernah dipakai device ini
  const { data, error } = await supabase
    .from('absen_records')
    .select('nama_warga')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error && (error.code === 'PGRST204' || error.message?.includes('nama_warga'))) {
    // Fallback ke kolom 'nama'
    const fb = await supabase
      .from('absen_records')
      .select('nama')
      .eq('warga_id', deviceId)
      .order('created_at', { ascending: true })
      .limit(1);
    if (fb.error) {
      return NextResponse.json({ registered: false, nama: null });
    }
    if (fb.data && fb.data.length > 0) {
      return NextResponse.json({ registered: true, nama: fb.data[0].nama });
    }
    return NextResponse.json({ registered: false, nama: null });
  }

  if (error) {
    return NextResponse.json({ registered: false, nama: null });
  }

  if (data && data.length > 0) {
    return NextResponse.json({ registered: true, nama: data[0].nama_warga });
  }

  return NextResponse.json({ registered: false, nama: null });
}
