'use client';

import { useState } from 'react';
import { Download, X, Loader } from 'lucide-react';
import { formatTanggalIndo } from '@/lib/data';
import { AbsenRecord } from '@/lib/types';
import { CONFIG } from '@/lib/config';
import { useToast } from '@/components/ui/Toast';
import type { Cell } from 'exceljs';

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const WARNA_NAVY = '1E3A8A';
const WARNA_ABU = 'E5E7EB';

export default function ExportButton() {
  const { push } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(false);

  async function openModal() {
    const res = await fetch('/api/absen/semua');
    if (!res.ok) {
      push('error', 'Gagal mengambil data. Pastikan Anda masih login.');
      return;
    }
    const semuaAbsen: AbsenRecord[] = await res.json();

    const uniqueMonths = new Set<string>();
    semuaAbsen.forEach(r => {
      if (r.tanggal) uniqueMonths.add(r.tanggal.slice(0, 7));
    });
    const sorted = Array.from(uniqueMonths).sort((a, b) => b.localeCompare(a));

    if (sorted.length === 0) {
      push('info', 'Belum ada data absensi.');
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
    if (!absenRes.ok) { push('error', 'Gagal mengambil data absensi.'); setLoading(false); return; }

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

    // Buang record tanpa tanggal agar tidak memunculkan "undefined/NaN" di laporan
    filteredAbsen = filteredAbsen.filter(r => r.tanggal);

    if (filteredAbsen.length === 0) {
      push('info', 'Tidak ada data untuk periode ini.');
      setLoading(false);
      return;
    }

    // ── Statistik per dusun ──
    const masukCounts = new Map<string, number>();
    const pulangCounts = new Map<string, number>();
    filteredAbsen.forEach(r => {
      const map = r.jenisAbsen === 'masuk' ? masukCounts : pulangCounts;
      map.set(r.dusun, (map.get(r.dusun) || 0) + 1);
    });

    const dusunSummary = CONFIG.dusunList.map(d => {
      const masuk = masukCounts.get(d) || 0;
      const pulang = pulangCounts.get(d) || 0;
      return { dusun: d, masuk, pulang };
    }).sort((a, b) => b.pulang - a.pulang || b.masuk - a.masuk);

    const totalMasuk = filteredAbsen.filter(r => r.jenisAbsen === 'masuk').length;
    const totalPulang = filteredAbsen.filter(r => r.jenisAbsen === 'pulang').length;

    // ── Statistik per tanggal (untuk sheet harian) ──
    const byDate = new Map<string, Map<string, { masuk: number; pulang: number }>>();
    filteredAbsen.forEach(r => {
      let dusunMap = byDate.get(r.tanggal);
      if (!dusunMap) { dusunMap = new Map(); byDate.set(r.tanggal, dusunMap); }
      let s = dusunMap.get(r.dusun);
      if (!s) { s = { masuk: 0, pulang: 0 }; dusunMap.set(r.dusun, s); }
      if (r.jenisAbsen === 'masuk') s.masuk++; else s.pulang++;
    });
    const datesSorted = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

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

    // ── Utility: total cell ──
    function styleTotal(cell: Cell, align: 'left' | 'center' = 'left') {
      cell.font = { bold: true, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARNA_ABU } };
      cell.alignment = { horizontal: align, vertical: 'middle' };
      cell.border = borderThin();
    }

    // ══════════════════════════════════════════════
    // Sheet 1: REKAP PER DUSUN
    // ══════════════════════════════════════════════
    const wsRekap = wb.addWorksheet('Rekap per Dusun');

    wsRekap.mergeCells('A1:D1');
    const judulRekap = wsRekap.getCell('A1');
    judulRekap.value = 'REKAPITULASI ABSENSI RONDA PER DUSUN';
    judulRekap.font = { bold: true, size: 14, color: { argb: WARNA_NAVY } };
    judulRekap.alignment = { horizontal: 'center', vertical: 'middle' };
    wsRekap.getRow(1).height = 32;

    wsRekap.mergeCells('A2:D2');
    const periodeRekap = wsRekap.getCell('A2');
    periodeRekap.value = `Periode: ${labelPeriode}`;
    periodeRekap.font = { italic: true, size: 11, color: { argb: '666666' } };
    periodeRekap.alignment = { horizontal: 'center', vertical: 'middle' };
    wsRekap.getRow(2).height = 20;

    const headerRekap = wsRekap.getRow(4);
    ['Dusun', 'Masuk', 'Pulang', '% Lengkap'].forEach((h, i) => {
      headerRekap.getCell(i + 1).value = h;
      styleHeader(headerRekap.getCell(i + 1));
    });
    headerRekap.height = 24;

    dusunSummary.forEach((d, i) => {
      const row = wsRekap.getRow(5 + i);
      row.getCell(1).value = d.dusun;
      row.getCell(2).value = d.masuk;
      row.getCell(3).value = d.pulang;
      row.getCell(4).value = d.masuk > 0 ? d.pulang / d.masuk : 0;

      styleData(row.getCell(1), 'left');
      [2, 3, 4].forEach(col => styleData(row.getCell(col), 'center'));
      row.getCell(2).numFmt = '#,##0';
      row.getCell(3).numFmt = '#,##0';
      row.getCell(4).numFmt = '0%';
      row.height = 22;
    });

    const barisTotal = 5 + dusunSummary.length;
    const totalRowRekap = wsRekap.getRow(barisTotal);
    totalRowRekap.getCell(1).value = 'TOTAL';
    totalRowRekap.getCell(2).value = totalMasuk;
    totalRowRekap.getCell(3).value = totalPulang;
    totalRowRekap.getCell(4).value = totalMasuk > 0 ? totalPulang / totalMasuk : 0;

    [1, 2, 3, 4].forEach(col => {
      const cell = totalRowRekap.getCell(col);
      styleTotal(cell, col === 1 ? 'left' : 'center');
      if (col === 2 || col === 3) cell.numFmt = '#,##0';
      if (col === 4) cell.numFmt = '0%';
    });
    totalRowRekap.height = 24;

    wsRekap.getColumn(1).width = 28;
    wsRekap.getColumn(2).width = 12;
    wsRekap.getColumn(3).width = 12;
    wsRekap.getColumn(4).width = 14;

    const barisKetRekap = barisTotal + 2;
    wsRekap.mergeCells(`A${barisKetRekap}:D${barisKetRekap}`);
    const ketRekap = wsRekap.getCell(`A${barisKetRekap}`);
    ketRekap.value = '* % Lengkap = jumlah absen PULANG dibagi MASUK (warga yang hadir lengkap pada malam yang sama).';
    ketRekap.font = { italic: true, size: 10, color: { argb: '999999' } };

    // ══════════════════════════════════════════════
    // Sheet 2: REKAP PER TANGGAL
    // ══════════════════════════════════════════════
    const wsHarian = wb.addWorksheet('Rekap per Tanggal');

    wsHarian.mergeCells('A1:D1');
    const judulHarian = wsHarian.getCell('A1');
    judulHarian.value = 'REKAP ABSENSI PER TANGGAL';
    judulHarian.font = { bold: true, size: 14, color: { argb: WARNA_NAVY } };
    judulHarian.alignment = { horizontal: 'center', vertical: 'middle' };
    wsHarian.getRow(1).height = 32;

    wsHarian.mergeCells('A2:D2');
    const periodeHarian = wsHarian.getCell('A2');
    periodeHarian.value = `Periode: ${labelPeriode}`;
    periodeHarian.font = { italic: true, size: 11, color: { argb: '666666' } };
    periodeHarian.alignment = { horizontal: 'center', vertical: 'middle' };
    wsHarian.getRow(2).height = 20;

    const headerHarian = wsHarian.getRow(4);
    ['Tanggal', 'Dusun', 'Masuk', 'Pulang'].forEach((h, i) => {
      headerHarian.getCell(i + 1).value = h;
      styleHeader(headerHarian.getCell(i + 1));
    });
    headerHarian.height = 24;

    let rowIdx = 5;
    for (const t of datesSorted) {
      const dusunMap = byDate.get(t)!;
      for (const d of CONFIG.dusunList) {
        const s = dusunMap.get(d);
        if (!s || (s.masuk === 0 && s.pulang === 0)) continue;
        const row = wsHarian.getRow(rowIdx);
        row.getCell(1).value = formatTanggalIndo(t);
        row.getCell(2).value = d;
        row.getCell(3).value = s.masuk;
        row.getCell(4).value = s.pulang;
        styleData(row.getCell(1), 'left');
        styleData(row.getCell(2), 'left');
        styleData(row.getCell(3), 'center');
        styleData(row.getCell(4), 'center');
        row.getCell(3).numFmt = '#,##0';
        row.getCell(4).numFmt = '#,##0';
        row.height = 20;
        rowIdx++;
      }

      // Total per tanggal
      let sumMasuk = 0, sumPulang = 0;
      dusunMap.forEach(s => { sumMasuk += s.masuk; sumPulang += s.pulang; });
      const tRow = wsHarian.getRow(rowIdx);
      tRow.getCell(1).value = `TOTAL ${formatTanggalIndo(t)}`;
      tRow.getCell(3).value = sumMasuk;
      tRow.getCell(4).value = sumPulang;
      [1, 2, 3, 4].forEach(col => styleTotal(tRow.getCell(col), col === 1 || col === 2 ? 'left' : 'center'));
      tRow.getCell(3).numFmt = '#,##0';
      tRow.getCell(4).numFmt = '#,##0';
      tRow.height = 20;
      rowIdx++;
    }

    wsHarian.getColumn(1).width = 32;
    wsHarian.getColumn(2).width = 28;
    wsHarian.getColumn(3).width = 12;
    wsHarian.getColumn(4).width = 12;

    // ══════════════════════════════════════════════
    // Sheet 3: DETAIL ABSENSI
    // ══════════════════════════════════════════════
    const wsDetail = wb.addWorksheet('Detail Absensi');

    wsDetail.mergeCells('A1:G1');
    const judulDetail = wsDetail.getCell('A1');
    judulDetail.value = 'DETAIL ABSENSI RONDA';
    judulDetail.font = { bold: true, size: 14, color: { argb: WARNA_NAVY } };
    judulDetail.alignment = { horizontal: 'center', vertical: 'middle' };
    wsDetail.getRow(1).height = 32;

    wsDetail.mergeCells('A2:G2');
    const periodeDetail = wsDetail.getCell('A2');
    periodeDetail.value = `Periode: ${labelPeriode}`;
    periodeDetail.font = { italic: true, size: 11, color: { argb: '666666' } };
    periodeDetail.alignment = { horizontal: 'center', vertical: 'middle' };
    wsDetail.getRow(2).height = 20;

    const headerDetail = wsDetail.getRow(4);
    const detailHeaders = ['No', 'Nama', 'Dusun', 'Tanggal', 'Jam Absen', 'Jenis', 'Jarak (m)'];
    detailHeaders.forEach((h, i) => {
      headerDetail.getCell(i + 1).value = h;
      styleHeader(headerDetail.getCell(i + 1));
    });
    headerDetail.height = 24;

    sortedAbsen.forEach((r, i) => {
      const row = wsDetail.getRow(5 + i);
      row.getCell(1).value = i + 1;
      row.getCell(2).value = r.nama;
      row.getCell(3).value = r.dusun;
      row.getCell(4).value = r.tanggal ? formatTanggalIndo(r.tanggal) : '—';
      row.getCell(5).value = r.jamAbsen;
      row.getCell(6).value = r.jenisAbsen === 'masuk' ? 'MASUK' : 'PULANG';
      row.getCell(7).value = r.jarakMeter;

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
