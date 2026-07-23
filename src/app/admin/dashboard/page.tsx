'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw, Trash2, Users, CheckCircle, XCircle, QrCode, UsersIcon, Calendar } from 'lucide-react';
import { AbsenRecord, FilterType } from '@/lib/types';
import { DAFTAR_WARGA, formatTanggalIndo, getTanggalHariIni } from '@/lib/data';
import AbsenTable from '@/components/admin/AbsenTable';
import FilterBar from '@/components/admin/FilterBar';
import ExportButton from '@/components/admin/ExportButton';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [absenHariIni, setAbsenHariIni] = useState<AbsenRecord[]>([]);
  const [filter, setFilter] = useState<FilterType>('semua');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lastRefresh, setLastRefresh] = useState('');
  const [wargaList, setWargaList] = useState<{ id: string; nama: string; rt: string }[]>([]);
  const [semuaRiwayat, setSemuaRiwayat] = useState<AbsenRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const [hariIniRes, wargaRes, riwayatRes] = await Promise.all([
        fetch('/api/absen/hari-ini'),
        fetch('/api/warga'),
        fetch('/api/absen/semua'),
      ]);
      if (hariIniRes.status === 401) {
        router.replace('/admin');
        return;
      }
      if (hariIniRes.ok) setAbsenHariIni(await hariIniRes.json());
      if (wargaRes.ok) setWargaList(await wargaRes.json());
      if (riwayatRes.ok) setSemuaRiwayat(await riwayatRes.json());
    } catch {
      // silent
    }
    const now = new Date();
    setLastRefresh(
      `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    );
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin');
  }

  async function handleReset() {
    await fetch('/api/absen/reset', { method: 'DELETE' });
    refreshData();
    setShowResetConfirm(false);
  }

  const wargaData = wargaList.length > 0 ? wargaList : DAFTAR_WARGA;
  const totalWarga = wargaData.length;
  const sudahAbsen = absenHariIni.length;
  const belumAbsen = totalWarga - sudahAbsen;
  const tanggalLabel = formatTanggalIndo(getTanggalHariIni());

  const tanggal7Hari = new Date();
  tanggal7Hari.setDate(tanggal7Hari.getDate() - 7);
  const cutoff = tanggal7Hari.toISOString().split('T')[0];

  const absenCountMap = new Map<string, number>();
  semuaRiwayat.forEach(r => {
    if (r.tanggal >= cutoff) {
      absenCountMap.set(r.wargaId, (absenCountMap.get(r.wargaId) || 0) + 1);
    }
  });

  const attendanceList = wargaData.map(w => ({
    ...w,
    hadir: absenCountMap.get(w.id) || 0,
    hariIni: absenHariIni.some(a => a.wargaId === w.id),
  })).sort((a, b) => b.hadir - a.hadir);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* --- TOP NAVBAR --- */}
      <nav className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Dashboard Admin</p>
            <h1 className="text-base font-black leading-tight">Absensi Ronda Malam</h1>
            <p className="text-xs text-blue-200">Bale Desa Kawunglarang</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/admin/warga')}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-xs font-bold border border-white/20 transition-colors"
            >
              <UsersIcon size={14} />
              Warga
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/jadwal')}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-xs font-bold border border-white/20 transition-colors"
            >
              <Calendar size={14} />
              Jadwal
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-xs font-bold border border-white/20 transition-colors"
            >
              <LogOut size={14} />
              Keluar
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* --- DATE --- */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-900">{tanggalLabel}</h2>
            <p className="text-xs text-slate-500 font-medium">
              Data terakhir diperbarui: {lastRefresh || '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={refreshData}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-3 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 active:scale-[0.97] transition-all"
            style={{ minHeight: '40px' }}
          >
            <RefreshCw size={15} strokeWidth={2.5} />
            Refresh
          </button>
        </div>

        {/* --- STAT CARDS --- */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-center shadow-sm">
            <div className="flex justify-center mb-2">
              <Users size={20} className="text-slate-500" strokeWidth={2} />
            </div>
            <p className="text-3xl font-black text-slate-900 tabular-nums">{totalWarga}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Total Warga</p>
          </div>

          <div className="bg-green-50 border border-green-300 rounded-xl px-4 py-4 text-center shadow-sm">
            <div className="flex justify-center mb-2">
              <CheckCircle size={20} className="text-green-600" strokeWidth={2} />
            </div>
            <p className="text-3xl font-black text-green-700 tabular-nums">{sudahAbsen}</p>
            <p className="text-xs font-bold text-green-700 uppercase tracking-wide mt-1">Hadir</p>
          </div>

          <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-4 text-center shadow-sm">
            <div className="flex justify-center mb-2">
              <XCircle size={20} className="text-red-600" strokeWidth={2} />
            </div>
            <p className="text-3xl font-black text-red-700 tabular-nums">{belumAbsen}</p>
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide mt-1">Belum</p>
          </div>
        </div>

        {/* Per-Person Attendance */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-bold text-slate-700">
              Riwayat Kehadiran 7 Hari ({sudahAbsen}/{totalWarga} hari ini)
            </span>
            <span className="text-slate-400 text-sm font-bold">{showHistory ? '▲' : '▼'}</span>
          </button>

          {showHistory && (
            <div className="border-t border-slate-200 divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {attendanceList.map(w => {
                const pct = Math.round((w.hadir / 7) * 100);
                return (
                  <div key={w.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900 truncate">{w.nama}</p>
                        <span className="text-xs font-black text-slate-500 tabular-nums ml-2">{w.hadir}/7</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{w.rt}</p>
                    </div>
                    <div className="w-24 bg-slate-100 rounded-full h-2.5 overflow-hidden flex-shrink-0">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 70 ? 'bg-green-600' : pct >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {w.hariIni && (
                      <span className="text-[10px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        HADIR
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- TOOLBAR --- */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <FilterBar
            activeFilter={filter}
            onChange={setFilter}
            countSemua={totalWarga}
            countSudah={sudahAbsen}
            countBelum={belumAbsen}
          />
          <div className="flex items-center gap-2">
            <a
              href="/api/qr/download"
              download="qr-bale-desa.png"
              className="inline-flex items-center gap-2 bg-white text-[#1e3a8a] px-4 py-2 rounded-lg font-bold text-sm border-2 border-[#1e3a8a] hover:bg-blue-50 active:scale-[0.97] transition-all"
              style={{ minHeight: '44px' }}
            >
              <QrCode size={16} strokeWidth={2.5} />
              QR Code
            </a>
            <ExportButton />
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-2 bg-white text-red-700 px-4 py-2 rounded-lg font-bold text-sm border-2 border-red-300 hover:bg-red-50 active:scale-[0.97] transition-all"
              style={{ minHeight: '44px' }}
            >
              <Trash2 size={16} strokeWidth={2.5} />
              Reset
            </button>
          </div>
        </div>

        {/* --- TABLE --- */}
        <AbsenTable
          wargaList={wargaData}
          absenHariIni={absenHariIni}
          filter={filter}
        />

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 py-4">
          Sistem Absensi Ronda Malam — Bale Desa Kawunglarang © 2024
        </p>
      </div>

      {/* --- RESET CONFIRM MODAL --- */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-black text-slate-900 mb-3">⚠️ Konfirmasi Reset</h3>
            <p className="text-base text-slate-600 font-medium mb-6">
              Apakah Anda yakin ingin menghapus semua data absen hari ini? Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-base"
                style={{ minHeight: '52px' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-3 rounded-xl bg-red-700 text-white font-bold text-base border-2 border-red-700"
                style={{ minHeight: '52px' }}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}