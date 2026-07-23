'use client';

import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { formatTanggalIndo } from '@/lib/data';
import { AbsenRecord } from '@/lib/types';

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

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
    const { utils, writeFile } = await import('xlsx');

    const res = await fetch('/api/absen/semua');
    if (!res.ok) {
      alert('Gagal mengambil data.');
      setLoading(false);
      return;
    }

    const semuaAbsen: AbsenRecord[] = await res.json();

    let filteredAbsen = semuaAbsen;
    let labelFile = 'Semua_Bulan';

    if (selectedMonth) {
      filteredAbsen = semuaAbsen.filter(r => r.tanggal.startsWith(selectedMonth));
      const [tahun, bulan] = selectedMonth.split('-');
      labelFile = `${BULAN_INDONESIA[parseInt(bulan) - 1]}_${tahun}`;
    }

    if (filteredAbsen.length === 0) {
      alert('Tidak ada data untuk periode ini.');
      setLoading(false);
      return;
    }

    const sortedAbsen = [...filteredAbsen].sort((a: AbsenRecord, b: AbsenRecord) => {
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
    writeFile(wb, `Laporan_Absen_Ronda_Kawunglarang_${labelFile}.xlsx`);
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
        <Download size={18} strokeWidth={2.5} />
        Export Excel
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
                <option value="">Semua Bulan</option>
                {months.map(m => {
                  const [tahun, bulan] = m.split('-');
                  return <option key={m} value={m}>{BULAN_INDONESIA[parseInt(bulan) - 1]} {tahun}</option>;
                })}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} disabled={loading}
                className="flex-1 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-base"
                style={{ minHeight: '48px' }}>Batal</button>
              <button onClick={handleExport} disabled={loading}
                className="flex-1 py-3 rounded-xl bg-green-700 text-white font-bold text-base disabled:opacity-60 transition-all"
                style={{ minHeight: '48px' }}>
                {loading ? '⏳ Memproses...' : '📥 Export'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}