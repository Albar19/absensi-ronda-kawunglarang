'use client';

import { useState } from 'react';
import { Download, X, Loader } from 'lucide-react';
import { formatTanggalIndo } from '@/lib/data';
import { AbsenRecord } from '@/lib/types';
import { CONFIG } from '@/lib/config';
import type { Cell } from 'exceljs';

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const WARNA_NAVY = '1E3A8A';

export default function ExportButton() {
  const [showModal, setShowModal] = useState(false);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(false);

  async function openModal() {
    const res = await fetch('/api/absen/semua');
    if (!res.ok) {
      alert('Gagal mengambil data. Pastikan Anda masih login.');
      return;
    }
    const semuaAbsen: AbsenRecord[] = await res.json();

    const uniqueMonths = new Set<string>();
    semuaAbsen.forEach(r => uniqueMonths.add(r.tanggal.slice(0, 7)));
    const sorted = Array.from(uniqueMonths).sort((a, b) => b.localeCompare(a));

    if (sorted.length === 0) {
      alert('Belum ada data absensi.');
      return;
    }

    setMonths(sorted);
    setSelectedMonth('');
    setShowModal(true);
  }

  async function handleExport() {
    setLoading(true);
    const ExcelJS = await import('exceljs');

    const absenRes = await fetch('/api/absen/semua');
    if (!absenRes.ok) { alert('Gagal mengambil data absensi.'); setLoading(false); return; }

    const semuaAbsen: AbsenRecord[] = await absenRes.json();

    let filteredAbsen = semuaAbsen;
    let labelFile = 'Semua_Bulan';
    let labelPeriode = 'Semua Periode';

    if (selectedMonth) {
      filteredAbsen = semuaAbsen.filter(r => r.tanggal.startsWith(selectedMonth));
      const [tahun, bulan] = selectedMonth.split('-');
      labelFile = `${BULAN_INDONESIA[parseInt(bulan) - 1]}_${tahun}`;
      labelPeriode = `${BULAN_INDONESIA[parseInt(bulan) - 1]} ${tahun}`;
    }

    if (filteredAbsen.length === 0) {
      alert('Tidak ada data untuk periode ini.');
      setLoading(false);
      return;
    }

    // ── Hanya absen pulang yang dihitung sebagai hadir lengkap ──
    const absenPulang = filteredAbsen.filter(r => r.jenisAbsen === 'pulang');

    // ── Rekap per dusun ──
    const dusunCounts = new Map<string, number>();
    absenPulang.forEach(r => {
      dusunCounts.set(r.dusun, (dusunCounts.get(r.dusun) || 0) + 1);
    });

    const dusunSummary = CONFIG.dusunList.map(d => {
      const count = dusunCounts.get(d) || 0;
      return { dusun: d, count };
    }).sort((a, b) => b.count - a.count);

    const totalHadir = absenPulang.length;

    // ── Detail terurut ──
    const sortedAbsen = [...filteredAbsen].sort((a, b) => {
      const dc = b.tanggal.localeCompare(a.tanggal);
      if (dc !== 0) return dc;
      return b.jamAbsen.localeCompare(a.jamAbsen);
    });

    // ═══════════════════════════════════════════════
    // BUAT WORKBOOK
    // ═══════════════════════════════════════════════
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Absensi Ronda Kawunglarang';
    wb.created = new Date();

    // ── Utility: border tipis semua sisi ──
    function borderThin() {
      return {
        top: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        left: { style: 'thin' as const },
        right: { style: 'thin' as const },
      };
    }

    // ── Utility: header cell ──
    function styleHeader(cell: Cell) {
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARNA_NAVY } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin();
    }

    // ── Utility: data cell ──
    function styleData(cell: Cell, align: 'left' | 'center' = 'left') {
      cell.alignment = { horizontal: align, vertical: 'middle' };
      cell.border = borderThin();
    }

    // ══════════════════════════════════════════════
    // Sheet 1: REKAP PER DUSUN
    // ══════════════════════════════════════════════
    const wsRekap = wb.addWorksheet('Rekap per Dusun');

    // Baris 1: Judul
    wsRekap.mergeCells('A1:B1');
    const judulRekap = wsRekap.getCell('A1');
    judulRekap.value = 'REKAPITULASI ABSENSI RONDA PER DUSUN';
    judulRekap.font = { bold: true, size: 14, color: { argb: WARNA_NAVY } };
    judulRekap.alignment = { horizontal: 'center', vertical: 'middle' };
    wsRekap.getRow(1).height = 32;

    // Baris 2: Periode
    wsRekap.mergeCells('A2:B2');
    const periodeRekap = wsRekap.getCell('A2');
    periodeRekap.value = `Periode: ${labelPeriode}`;
    periodeRekap.font = { italic: true, size: 11, color: { argb: '666666' } };
    periodeRekap.alignment = { horizontal: 'center', vertical: 'middle' };
    wsRekap.getRow(2).height = 20;

    // Baris 3: kosong
    // Baris 4: Header
    const headerRekap = wsRekap.getRow(4);
    headerRekap.getCell(1).value = 'Dusun';
    headerRekap.getCell(2).value = 'Hadir Lengkap';
    styleHeader(headerRekap.getCell(1));
    styleHeader(headerRekap.getCell(2));
    headerRekap.height = 24;

    // Baris 5+: Data dusun
    dusunSummary.forEach((d, i) => {
      const row = wsRekap.getRow(5 + i);
      row.getCell(1).value = d.dusun;
      row.getCell(2).value = d.count;

      styleData(row.getCell(1), 'left');
      styleData(row.getCell(2), 'center');
      row.getCell(2).numFmt = '#,##0';
      row.height = 22;
    });

    // Baris total
    const barisTotal = 5 + dusunSummary.length;
    const totalRowRekap = wsRekap.getRow(barisTotal);
    totalRowRekap.getCell(1).value = 'TOTAL';
    totalRowRekap.getCell(2).value = totalHadir;

    [1, 2].forEach(col => {
      const cell = totalRowRekap.getCell(col);
      cell.font = { bold: true, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E5E7EB' } };
      cell.alignment = { horizontal: col === 1 ? 'left' : 'center', vertical: 'middle' };
      cell.border = borderThin();
      if (col === 2) cell.numFmt = '#,##0';
    });
    totalRowRekap.height = 24;

    wsRekap.getColumn(1).width = 28;
    wsRekap.getColumn(2).width = 20;

    // Baris keterangan
    const barisKetRekap = barisTotal + 2;
    wsRekap.mergeCells(`A${barisKetRekap}:B${barisKetRekap}`);
    const ketRekap = wsRekap.getCell(`A${barisKetRekap}`);
    ketRekap.value = '* Hadir Lengkap = warga yang melakukan absen MASUK + PULANG di malam yang sama.';
    ketRekap.font = { italic: true, size: 10, color: { argb: '999999' } };

    // ══════════════════════════════════════════════
    // Sheet 2: DETAIL ABSENSI
    // ══════════════════════════════════════════════
    const wsDetail = wb.addWorksheet('Detail Absensi');

    // Baris 1: Judul
    wsDetail.mergeCells('A1:G1');
    const judulDetail = wsDetail.getCell('A1');
    judulDetail.value = 'DETAIL ABSENSI RONDA';
    judulDetail.font = { bold: true, size: 14, color: { argb: WARNA_NAVY } };
    judulDetail.alignment = { horizontal: 'center', vertical: 'middle' };
    wsDetail.getRow(1).height = 32;

    // Baris 2: Periode
    wsDetail.mergeCells('A2:G2');
    const periodeDetail = wsDetail.getCell('A2');
    periodeDetail.value = `Periode: ${labelPeriode}`;
    periodeDetail.font = { italic: true, size: 11, color: { argb: '666666' } };
    periodeDetail.alignment = { horizontal: 'center', vertical: 'middle' };
    wsDetail.getRow(2).height = 20;

    // Baris 4: Header
    const headerDetail = wsDetail.getRow(4);
    const detailHeaders = ['No', 'Nama', 'Dusun', 'Tanggal', 'Jam Absen', 'Jenis', 'Jarak (m)'];
    detailHeaders.forEach((h, i) => {
      headerDetail.getCell(i + 1).value = h;
      styleHeader(headerDetail.getCell(i + 1));
    });
    headerDetail.height = 24;

    // Baris 5+: Data
    sortedAbsen.forEach((r, i) => {
      const row = wsDetail.getRow(5 + i);
      row.getCell(1).value = i + 1;
      row.getCell(2).value = r.nama;
      row.getCell(3).value = r.dusun;
      row.getCell(4).value = formatTanggalIndo(r.tanggal);
      row.getCell(5).value = r.jamAbsen;
      row.getCell(6).value = r.jenisAbsen === 'masuk' ? 'MASUK' : 'PULANG';
      row.getCell(7).value = r.jarakMeter;

      // No, Jam, Jarak → center; lainnya → left
      const aligns: ('center' | 'left')[] = ['center', 'left', 'left', 'left', 'center', 'center', 'center'];
      [1, 2, 3, 4, 5, 6, 7].forEach(col => {
        const cell = row.getCell(col);
        styleData(cell, aligns[col - 1]);
        if (col === 7) cell.numFmt = '#,##0';
      });
      row.height = 20;
    });

    wsDetail.getColumn(1).width = 6;
    wsDetail.getColumn(2).width = 28;
    wsDetail.getColumn(3).width = 20;
    wsDetail.getColumn(4).width = 32;
    wsDetail.getColumn(5).width = 14;
    wsDetail.getColumn(6).width = 10;
    wsDetail.getColumn(7).width = 12;

    // ── Generate & download ──
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Absen_Ronda_Kawunglarang_${labelFile}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

    setLoading(false);
    setShowModal(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 bg-green-700 text-white px-5 py-3 rounded-lg font-bold text-sm border-2 border-green-700 hover:bg-green-800 active:scale-[0.98] transition-all"
        style={{ minHeight: '44px' }}
      >
        <Download size={18} strokeWidth={2} />
        Download Rekap Excel
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Export Excel</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg" style={{ minHeight: '36px', minWidth: '36px' }}>
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Pilih Bulan</label>
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-base font-semibold"
                style={{ minHeight: '48px' }}>
                {months.map(m => {
                  const [tahun, bulan] = m.split('-');
                  return <option key={m} value={m}>{BULAN_INDONESIA[parseInt(bulan) - 1]} {tahun}</option>;
                })}
                <option value="">Semua Bulan</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} disabled={loading}
                className="flex-1 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-base"
                style={{ minHeight: '48px' }}>Batal</button>
              <button onClick={handleExport} disabled={loading}
                className="flex-1 py-3 rounded-xl bg-green-700 text-white font-bold text-base disabled:opacity-60 transition-all"
                style={{ minHeight: '48px' }}>
                {loading ? <><Loader size={18} className="animate-spin" /> Memproses...</> : 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
