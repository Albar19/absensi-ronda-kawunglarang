'use client';

import { Download } from 'lucide-react';
import { formatTanggalIndo } from '@/lib/data';
import { AbsenRecord } from '@/lib/types';

export default function ExportButton() {
  async function handleExport() {
    const { utils, writeFile } = await import('xlsx');

    const res = await fetch('/api/absen/semua');
    if (!res.ok) {
      alert('Gagal mengambil data. Pastikan Anda masih login.');
      return;
    }

    const semuaAbsen = await res.json();

    if (semuaAbsen.length === 0) {
      alert('Belum ada data absensi yang tersimpan untuk diexport.');
      return;
    }

    const sortedAbsen = [...semuaAbsen].sort((a: AbsenRecord, b: AbsenRecord) => {
      const dateCompare = b.tanggal.localeCompare(a.tanggal);
      if (dateCompare !== 0) return dateCompare;
      return b.jamAbsen.localeCompare(a.jamAbsen);
    });

    const rows = sortedAbsen.map((record: AbsenRecord, index: number) => ({
      No: index + 1,
      Nama: record.nama,
      RT: record.rt,
      Tanggal: formatTanggalIndo(record.tanggal),
      'Jam Absen': record.jamAbsen,
      'Jarak (m)': record.jarakMeter,
      Status: 'HADIR',
    }));

    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();

    ws['!cols'] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 8 },
      { wch: 30 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
    ];

    utils.book_append_sheet(wb, ws, 'Laporan Absensi Ronda');

    const now = new Date();
    const namaBulan = now.toLocaleString('id-ID', { month: 'long' });
    const tahun = now.getFullYear();
    writeFile(wb, `Laporan_Absen_Ronda_Kawunglarang_${namaBulan}_${tahun}.xlsx`);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-2 bg-green-700 text-white px-5 py-3 rounded-lg font-bold text-sm border-2 border-green-700 hover:bg-green-800 active:scale-[0.98] transition-all"
      style={{ minHeight: '44px' }}
    >
      <Download size={18} strokeWidth={2.5} />
      Export Excel
    </button>
  );
}