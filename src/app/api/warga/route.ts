import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import { isAdminRequest } from '@/lib/api-auth';

// ── Helper validasi nama + dusun ──
function validasiInput(nama: unknown, dusun: unknown): { nama: string; dusun: string } | null {
  if (typeof nama !== 'string' || typeof dusun !== 'string') return null;
  const n = nama.trim();
  const d = dusun.trim();
  if (!n || n.length > 100 || !d || d.length > 50) return null;
  if (!CONFIG.dusunList.includes(d as typeof CONFIG.dusunList[number])) return null;
  return { nama: n, dusun: d };
}

// GET /api/warga — daftar warga (admin-only)
// Query: ?status=terdaftar|belum|semua&search=...&dusun=...
export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'semua';
  const search = searchParams.get('search')?.trim().toLowerCase() || '';
  const dusun = searchParams.get('dusun')?.trim() || '';

  let query = supabase.from('warga').select('id, nama, dusun, terdaftar, aktif, created_at');

  if (status === 'terdaftar') query = query.eq('terdaftar', true);
  if (status === 'belum') query = query.eq('terdaftar', false);
  if (dusun) query = query.eq('dusun', dusun);

  const { data, error } = await query.order('nama', { ascending: true });

  if (error && (error.code === 'PGRST204' || error.message?.includes('warga'))) {
    return NextResponse.json({
      error: 'Tabel warga belum ada. Jalankan migration SQL di Supabase Dashboard terlebih dahulu.',
    }, { status: 500 });
  }
  if (error) {
    return NextResponse.json({ error: 'Gagal mengambil data warga' }, { status: 500 });
  }

  let warga = data ?? [];
  if (search) {
    warga = warga.filter(w => w.nama.toLowerCase().includes(search));
  }

  return NextResponse.json(warga);
}

// POST /api/warga — tambah manual (langsung terdaftar=true, admin-only)
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const valid = validasiInput(body.nama, body.dusun);
    if (!valid) {
      return NextResponse.json({ error: 'Nama dan dusun tidak valid' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('warga')
      .upsert(
        { nama: valid.nama, dusun: valid.dusun, terdaftar: true, aktif: true },
        { onConflict: 'nama,dusun', ignoreDuplicates: false }
      )
      .select('id, nama, dusun, terdaftar, aktif, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        // Upsert conflict — update jadi terdaftar
        const { data: upd, error: updErr } = await supabase
          .from('warga')
          .update({ terdaftar: true, aktif: true })
          .eq('nama', valid.nama)
          .eq('dusun', valid.dusun)
          .select('id, nama, dusun, terdaftar, aktif, created_at')
          .single();
        if (updErr) {
          return NextResponse.json({ error: 'Gagal menambahkan warga' }, { status: 500 });
        }
        return NextResponse.json(upd, { status: 201 });
      }
      return NextResponse.json({ error: 'Gagal menambahkan warga' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// PUT /api/warga — update (promote terdaftar, toggle aktif, edit nama/dusun, admin-only)
export async function PUT(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = body.id;

    if (typeof id !== 'string' || !id) {
      return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.terdaftar === 'boolean') updateData.terdaftar = body.terdaftar;
    if (typeof body.aktif === 'boolean') updateData.aktif = body.aktif;
    if (body.nama || body.dusun) {
      const valid = validasiInput(body.nama, body.dusun);
      if (!valid) {
        return NextResponse.json({ error: 'Nama dan dusun tidak valid' }, { status: 400 });
      }
      updateData.nama = valid.nama;
      updateData.dusun = valid.dusun;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('warga')
      .update(updateData)
      .eq('id', id)
      .select('id, nama, dusun, terdaftar, aktif, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `"${updateData.nama ?? ''}" sudah terdaftar di dusun ${updateData.dusun ?? ''}.` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Gagal mengupdate warga' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// DELETE /api/warga?id=...&hapus_absen=1 — hapus permanen (admin-only)
// Tanpa hapus_absen: hapus baris warga saja. Dengan hapus_absen=1: ikut
// menghapus record absen atas nama+dusun tsb (untuk bersihkan data iseng).
export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const hapusAbsen = searchParams.get('hapus_absen') === '1';

    if (!id) {
      return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 });
    }

    // Ambil nama + dusun dulu untuk pencocokan record absen
    const { data: warga, error: getErr } = await supabase
      .from('warga')
      .select('nama, dusun')
      .eq('id', id)
      .maybeSingle();

    if (getErr) {
      return NextResponse.json({ error: 'Gagal mengambil data warga' }, { status: 500 });
    }
    if (!warga) {
      return NextResponse.json({ error: 'Warga tidak ditemukan' }, { status: 404 });
    }

    if (hapusAbsen) {
      const { error: delAbsenErr } = await supabase
        .from('absen_records')
        .delete()
        .eq('nama_warga', warga.nama)
        .eq('dusun', warga.dusun);

      if (delAbsenErr) {
        return NextResponse.json({ error: 'Gagal menghapus data absen' }, { status: 500 });
      }
    }

    const { error } = await supabase.from('warga').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Gagal menghapus warga' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
