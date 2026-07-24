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

    const [absenRes, jadwalRes, wargaRes] = await Promise.all([
      fetch('/api/absen/semua'),
      fetch('/api/jadwal'),
      fetch('/api/warga'),
    ]);

    if (!absenRes.ok) { alert('Gagal mengambil data absensi.'); setLoading(false); return; }
    if (!jadwalRes.ok) { alert('Gagal mengambil data jadwal.'); setLoading(false); return; }
    if (!wargaRes.ok)  { alert('Gagal mengambil data warga.');  setLoading(false); return; }

    const semuaAbsen: AbsenRecord[] = await absenRes.json();
    const semuaJadwal: { id: string; tanggal: string; warga_id: string }[] = await jadwalRes.json();
    const semuaWarga: { id: string; nama: string; dusun: string }[] = await wargaRes.json();

    let filteredAbsen = semuaAbsen;
    let filteredJadwal = semuaJadwal;
    let labelFile = 'Semua_Bulan';
    let labelPeriode = 'Semua Periode';

    if (selectedMonth) {
      filteredAbsen = semuaAbsen.filter(r => r.tanggal.startsWith(selectedMonth));
      filteredJadwal = semuaJadwal.filter(j => j.tanggal.startsWith(selectedMonth));
      const [tahun, bulan] = selectedMonth.split('-');
      labelFile = `${BULAN_INDONESIA[parseInt(bulan) - 1]}_${tahun}`;
      labelPeriode = `${BULAN_INDONESIA[parseInt(bulan) - 1]} ${tahun}`;
    }

    if (filteredAbsen.length === 0 && filteredJadwal.length === 0) {
      alert('Tidak ada data untuk periode ini.');
      setLoading(false);
      return;
    }

    const totalHadir = filteredAbsen.length;
    const totalScheduled = filteredJadwal.length;
    const persentase = totalScheduled > 0 ? Math.round((totalHadir / totalScheduled) * 100) : 0;

    // ── Hitung rekap per dusun ──
    const dusunHadirMap = new Map<string, number>();
    const dusunWargaSet = new Map<string, Set<string>>();
    const absenTanggal = new Set(filteredAbsen.map(r => r.tanggal));

    semuaWarga.forEach(w => {
      if (!dusunWargaSet.has(w.dusun)) dusunWargaSet.set(w.dusun, new Set());
      dusunWargaSet.get(w.dusun)!.add(w.id);
    });
    filteredAbsen.forEach(r => {
      dusunHadirMap.set(r.dusun, (dusunHadirMap.get(r.dusun) || 0) + 1);
    });

    const jumlahHari = absenTanggal.size || 1;
    const dusunSummary = Array.from(dusunWargaSet.entries())
      .map(([dusun, wargaIds]) => {
        const totalWarga = wargaIds.size;
        const totalKehadiran = dusunHadirMap.get(dusun) || 0;
        const maksKehadiran = totalWarga * jumlahHari;
        const pct = maksKehadiran > 0 ? Math.round((totalKehadiran / maksKehadiran) * 100) : 0;
        const status = pct >= 70 ? 'Aktif' : pct >= 30 ? 'Cukup' : 'Jarang';
        return { dusun, totalWarga, totalKehadiran, maksKehadiran, pct, status };
      })
      .sort((a, b) => b.pct - a.pct);

    // ── Sheet 1: Rekap per Dusun ──
    const rekapData: any[][] = [
      ['REKAPITULASI ABSENSI RONDA PER DUSUN'],
      [`Periode: ${labelPeriode}`],
      [],
      ['Dusun', 'Jumlah Warga', 'Total Kehadiran', 'Maks Kehadiran', 'Rata-rata', 'Status'],
    ];
    dusunSummary.forEach(d => {
      rekapData.push([d.dusun, d.totalWarga, d.totalKehadiran, d.maksKehadiran, `${d.pct}%`, d.status]);
    });
    rekapData.push([]);
    rekapData.push(['TOTAL', semuaWarga.length, totalHadir, totalScheduled, `${persentase}%`, '']);

    const wsRekap = utils.aoa_to_sheet(rekapData);
    wsRekap['!cols'] = [
      { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 12 },
    ];

    // ── Sheet 2: Detail Absensi ──
    const sortedAbsen = [...filteredAbsen].sort((a, b) => {
      const dc = b.tanggal.localeCompare(a.tanggal);
      if (dc !== 0) return dc;
      return b.jamAbsen.localeCompare(a.jamAbsen);
    });

    const detailData: any[][] = [
      ['DETAIL ABSENSI RONDA'],
      [`Periode: ${labelPeriode}`],
      [],
      ['No', 'Nama', 'Dusun', 'Tanggal', 'Jam Absen', 'Jenis', 'Jarak (m)', 'Status'],
    ];
    sortedAbsen.forEach((r, i) => {
      detailData.push([i + 1, r.nama, r.dusun, formatTanggalIndo(r.tanggal), r.jamAbsen, r.jenis === 'pulang' ? 'Pulang' : 'Masuk', r.jarakMeter, 'HADIR']);
    });

    const wsDetail = utils.aoa_to_sheet(detailData);
    wsDetail['!cols'] = [
      { wch: 6 }, { wch: 28 }, { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
    ];

    // ── Gabung workbook ──
    const wb = utils.book_new();
    utils.book_append_sheet(wb, wsRekap, 'Rekap per Dusun');
    utils.book_append_sheet(wb, wsDetail, 'Detail Absensi');
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
                {loading ? '⏳ Memproses...' : '📥 Export'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}