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

const WARNA_NAVY = '1E3A8A';

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

    // ── Build Excel (exceljs — sudah dipakai ExportButton, tanpa xlsx) ──
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Jadwal Ronda');

    ws.mergeCells('A1:C1');
    const judul = ws.getCell('A1');
    judul.value = `JADWAL RONDA MINGGUAN — ${CONFIG.namaDesa}`;
    judul.font = { bold: true, size: 14, color: { argb: WARNA_NAVY } };
    judul.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 28;

    const headerRow = ws.getRow(3);
    headerRow.values = ['No', 'Hari', 'Petugas Ronda'];
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARNA_NAVY } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 22;

    sorted.forEach((j, i) => {
      const row = ws.getRow(4 + i);
      row.getCell(1).value = i + 1;
      row.getCell(2).value = HARI_LABEL[j.hari] || j.hari;
      row.getCell(3).value = j.petugas;
      row.eachCell(cell => {
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
      row.height = 20;
    });

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 14;
    ws.getColumn(3).width = 22;

    const buffer = await wb.xlsx.writeBuffer();
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