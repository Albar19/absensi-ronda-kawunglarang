'use client';

import { useState } from 'react';
import { Download, X, Loader } from 'lucide-react';
import { formatTanggalIndo, BULAN_INDONESIA } from '@/lib/data';
import { AbsenRecord } from '@/lib/types';
import { hitungKehadiran } from '@/lib/kehadiran';
import { useToast } from '@/components/ui/Toast';
import type { Cell } from 'exceljs';

const WARNA_NAVY = '1E3A8A';
const WARNA_ABU = 'E5E7EB';

export default function ExportButton() {
  const { push } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(false);

  async function openModal() {
    const res = await fetch('/api/absen/bulan');
    if (!res.ok) {
      push('error', 'Gagal mengambil data. Pastikan Anda masih login.');
      return;
    }
    const data = await res.json();
    const sorted: string[] = data.months ?? [];

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

    const absenRes = await fetch(selectedMonth
      ? `/api/absen/semua?bulan=${encodeURIComponent(selectedMonth)}`
      : '/api/absen/semua');
    if (!absenRes.ok) { push('error', 'Gagal mengambil data absensi.'); setLoading(false); return; }

    const semuaAbsen: AbsenRecord[] = await absenRes.json();

    let filteredAbsen = semuaAbsen;
    let labelFile = 'Semua_Bulan';
    let labelPeriode = 'Semua Periode';

    if (selectedMonth) {
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

    // ── Kehadiran per ORANG unik (nama+dusun+tanggal). Lengkap = masuk + pulang. ──
    const kehadiran = hitungKehadiran(filteredAbsen);

    // Hanya dusun yang benar-benar punya data yang dicetak, terbanyak di atas
    const dusunSummary = Array.from(kehadiran.perDusun.entries())
      .map(([dusun, s]) => ({ dusun, ...s }))
      .sort((a, b) => b.lengkap - a.lengkap || b.masuk - a.masuk || a.dusun.localeCompare(b.dusun));

    const totalMasuk = kehadiran.totalMasuk;

    // ── Detail per warga (nama+dusun) per tanggal: HADIR = masuk + pulang malam sama ──
    const perWarga = new Map<string, { nama: string; dusun: string; perTanggal: Map<string, { masuk: boolean; pulang: boolean }> }>();
    for (const r of filteredAbsen) {
      const key = `${r.nama}|${r.dusun}`;
      let w = perWarga.get(key);
      if (!w) {
        w = { nama: r.nama, dusun: r.dusun, perTanggal: new Map() };
        perWarga.set(key, w);
      }
      let d = w.perTanggal.get(r.tanggal);
      if (!d) {
        d = { masuk: false, pulang: false };
        w.perTanggal.set(r.tanggal, d);
      }
      if (r.jenisAbsen === 'masuk') d.masuk = true;
      else if (r.jenisAbsen === 'pulang') d.pulang = true;
    }
    // Urut: paling banyak hadir di atas, lalu abjad nama
    const wargaSorted = Array.from(perWarga.values())
      .map(w => ({
        ...w,
        hadir: Array.from(w.perTanggal.values()).filter(d => d.masuk && d.pulang).length,
      }))
      .sort((a, b) => b.hadir - a.hadir || a.nama.localeCompare(b.nama) || a.dusun.localeCompare(b.dusun));

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

    wsRekap.mergeCells('A1:C1');
    const judulRekap = wsRekap.getCell('A1');
    judulRekap.value = 'REKAPITULASI KEHADIRAN RONDA PER DUSUN';
    judulRekap.font = { bold: true, size: 14, color: { argb: WARNA_NAVY } };
    judulRekap.alignment = { horizontal: 'center', vertical: 'middle' };
    wsRekap.getRow(1).height = 32;

    wsRekap.mergeCells('A2:C2');
    const periodeRekap = wsRekap.getCell('A2');
    periodeRekap.value = `Periode: ${labelPeriode}`;
    periodeRekap.font = { italic: true, size: 11, color: { argb: '666666' } };
    periodeRekap.alignment = { horizontal: 'center', vertical: 'middle' };
    wsRekap.getRow(2).height = 20;

    const headerRekap = wsRekap.getRow(4);
    ['Dusun', 'Kehadiran', '% Kehadiran'].forEach((h, i) => {
      headerRekap.getCell(i + 1).value = h;
      styleHeader(headerRekap.getCell(i + 1));
    });
    headerRekap.height = 24;

    dusunSummary.forEach((d, i) => {
      const row = wsRekap.getRow(5 + i);
      row.getCell(1).value = d.dusun;
      row.getCell(2).value = d.lengkap;
      row.getCell(3).value = d.masuk > 0 ? d.lengkap / d.masuk : 0;

      styleData(row.getCell(1), 'left');
      [2, 3].forEach(col => styleData(row.getCell(col), 'center'));
      row.getCell(2).numFmt = '#,##0';
      row.getCell(3).numFmt = '0%';
      row.height = 22;
    });

    const barisTotal = 5 + dusunSummary.length;
    const totalRowRekap = wsRekap.getRow(barisTotal);
    totalRowRekap.getCell(1).value = 'TOTAL';
    totalRowRekap.getCell(2).value = kehadiran.totalLengkap;
    totalRowRekap.getCell(3).value = totalMasuk > 0 ? kehadiran.totalLengkap / totalMasuk : 0;

    [1, 2, 3].forEach(col => {
      const cell = totalRowRekap.getCell(col);
      styleTotal(cell, col === 1 ? 'left' : 'center');
      if (col === 2) cell.numFmt = '#,##0';
      if (col === 3) cell.numFmt = '0%';
    });
    totalRowRekap.height = 24;

    wsRekap.getColumn(1).width = 28;
    wsRekap.getColumn(2).width = 14;
    wsRekap.getColumn(3).width = 14;

    const barisKetRekap = barisTotal + 2;
    wsRekap.mergeCells(`A${barisKetRekap}:C${barisKetRekap}`);
    const ketRekap = wsRekap.getCell(`A${barisKetRekap}`);
    ketRekap.value = '* Kehadiran = warga yang absen MASUK + PULANG di malam yang sama. % Kehadiran = Kehadiran ÷ jumlah warga absen masuk.';
    ketRekap.font = { italic: true, size: 10, color: { argb: '999999' } };

    // ══════════════════════════════════════════════
    // Sheet 2: REKAP PER WARGA (detail per tanggal)
    // ══════════════════════════════════════════════
    const wsWarga = wb.addWorksheet('Rekap per Warga');

    wsWarga.mergeCells('A1:D1');
    const judulWarga = wsWarga.getCell('A1');
    judulWarga.value = 'REKAP KEHADIRAN RONDA PER WARGA';
    judulWarga.font = { bold: true, size: 14, color: { argb: WARNA_NAVY } };
    judulWarga.alignment = { horizontal: 'center', vertical: 'middle' };
    wsWarga.getRow(1).height = 32;

    wsWarga.mergeCells('A2:D2');
    const periodeWarga = wsWarga.getCell('A2');
    periodeWarga.value = `Periode: ${labelPeriode}`;
    periodeWarga.font = { italic: true, size: 11, color: { argb: '666666' } };
    periodeWarga.alignment = { horizontal: 'center', vertical: 'middle' };
    wsWarga.getRow(2).height = 20;

    const headerWarga = wsWarga.getRow(4);
    ['Nama', 'Dusun', 'Tanggal', 'Status'].forEach((h, i) => {
      headerWarga.getCell(i + 1).value = h;
      styleHeader(headerWarga.getCell(i + 1));
    });
    headerWarga.height = 24;

    let rowIdx = 5;
    for (const w of wargaSorted) {
      const dates = Array.from(w.perTanggal.keys()).sort((a, b) => b.localeCompare(a));
      let hadir = 0;

      for (const t of dates) {
        const d = w.perTanggal.get(t)!;
        const isHadir = d.masuk && d.pulang;
        if (isHadir) hadir++;

        const row = wsWarga.getRow(rowIdx);
        row.getCell(1).value = w.nama;
        row.getCell(2).value = w.dusun;
        row.getCell(3).value = formatTanggalIndo(t);
        row.getCell(4).value = isHadir ? 'HADIR' : 'TIDAK';
        styleData(row.getCell(1), 'left');
        styleData(row.getCell(2), 'left');
        styleData(row.getCell(3), 'left');
        styleData(row.getCell(4), 'center');
        row.getCell(4).font = { bold: true, size: 11, color: { argb: isHadir ? '15803D' : 'DC2626' } };
        row.height = 20;
        rowIdx++;
      }

      // Subtotal per warga
      const sRow = wsWarga.getRow(rowIdx);
      sRow.getCell(1).value = `TOTAL ${w.nama}`;
      sRow.getCell(4).value = `${hadir} dari ${dates.length} malam`;
      [1, 2, 3, 4].forEach(col => styleTotal(sRow.getCell(col), col === 1 ? 'left' : col === 4 ? 'center' : 'left'));
      sRow.height = 20;
      rowIdx++;
    }

    wsWarga.getColumn(1).width = 26;
    wsWarga.getColumn(2).width = 20;
    wsWarga.getColumn(3).width = 16;
    wsWarga.getColumn(4).width = 20;

    const barisKetWarga = rowIdx + 1;
    wsWarga.mergeCells(`A${barisKetWarga}:D${barisKetWarga}`);
    const ketWarga = wsWarga.getCell(`A${barisKetWarga}`);
    ketWarga.value = '* HADIR = warga yang absen MASUK + PULANG di malam yang sama.';
    ketWarga.font = { italic: true, size: 10, color: { argb: '999999' } };

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
