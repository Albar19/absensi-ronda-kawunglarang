import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import { isAdminRequest } from '@/lib/api-auth';
import type { JadwalRonda } from '@/lib/types';

const HARI_LABEL: Record<string, string> = {
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
  minggu: 'Minggu',
};

// GET /api/jadwal/download — download jadwal sebagai file Excel (admin-only)
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('jadwal_ronda')
      .select('id, hari, petugas');

    let jadwal: JadwalRonda[] = [];

    if (error && (error.code === 'PGRST204' || error.message?.includes('jadwal_ronda'))) {
      // Tabel belum ada — pakai default
      jadwal = CONFIG.hariList.map((hari, i) => ({
        id: '',
        hari,
        petugas: CONFIG.petugasList[i % CONFIG.petugasList.length],
      }));
    } else if (error) {
      return NextResponse.json({ error: 'Gagal mengambil jadwal' }, { status: 500 });
    } else if (data && data.length > 0) {
      jadwal = data;
    } else {
      // Data kosong — pakai default
      jadwal = CONFIG.hariList.map((hari, i) => ({
        id: '',
        hari,
        petugas: CONFIG.petugasList[i % CONFIG.petugasList.length],
      }));
    }

    // Urutkan sesuai hariList
    const sorted = CONFIG.hariList
      .map(h => jadwal.find(j => j.hari === h))
      .filter(Boolean) as JadwalRonda[];

    // ── Build Excel ──
    const XLSX = await import('xlsx');
    const { utils, write } = XLSX;

    const rows: unknown[][] = [
      [`JADWAL RONDA MINGGUAN — ${CONFIG.namaDesa}`],
      [],
      ['No', 'Hari', 'Petugas Ronda'],
    ];

    sorted.forEach((j, i) => {
      rows.push([i + 1, HARI_LABEL[j.hari] || j.hari, j.petugas]);
    });

    const ws = utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 22 },
    ];

    // Merge header row
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Jadwal Ronda');

    const buffer = write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Jadwal_Ronda_Mingguan_Kawunglarang.xlsx"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal generate file';
    console.error('[GET /api/jadwal/download] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
