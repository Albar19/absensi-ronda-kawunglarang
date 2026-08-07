'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw, Users, Calendar, Save, QrCode, Loader, FileDown, Search, ChevronDown, Plus, Trash2, UserCheck, UserX, Pencil, ClipboardList } from 'lucide-react';
import { AbsenRecord, JadwalRonda, Warga } from '@/lib/types';
import { CONFIG } from '@/lib/config';
import { formatTanggalIndo, getTanggalHariIni } from '@/lib/data';
import ExportButton from '@/components/admin/ExportButton';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

type Tab = 'log' | 'jadwal' | 'warga';

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const HARI_LABEL: Record<string, string> = {
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
  minggu: 'Minggu',
};

export default function AdminDashboardPage() {
  return (
    <ToastProvider>
      <DashboardInner />
    </ToastProvider>
  );
}

function DashboardInner() {
  const { push } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('log');
  const [authChecked, setAuthChecked] = useState(false);

  // ── Log absen ──
  const [absenHariIni, setAbsenHariIni] = useState<AbsenRecord[]>([]);
  const [lastRefresh, setLastRefresh] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Jadwal ──
  const [jadwal, setJadwal] = useState<JadwalRonda[]>([]);
  const [jadwalLoading, setJadwalLoading] = useState(false);
  const [jadwalSaving, setJadwalSaving] = useState(false);
  const [jadwalDirty, setJadwalDirty] = useState(false);

  // ── Bulan filter ──
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [periodFilter, setPeriodFilter] = useState<'today' | string>('today');
  const [monthlyData, setMonthlyData] = useState<AbsenRecord[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // ── Daftar Warga ──
  const [wargaSearch, setWargaSearch] = useState('');
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [wargaLoading, setWargaLoading] = useState(false);
  const [wargaFilter, setWargaFilter] = useState<'belum' | 'terdaftar' | 'semua'>('belum');
  const [wargaDusun, setWargaDusun] = useState('');
  const [namaBaru, setNamaBaru] = useState('');
  const [dusunBaru, setDusunBaru] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editDusun, setEditDusun] = useState('');
  const [hapusTarget, setHapusTarget] = useState<Warga | null>(null);

  async function loadAvailableMonths() {
    try {
      const res = await fetch('/api/absen/semua');
      if (!res.ok) return;
      const data: AbsenRecord[] = await res.json();
      const months = new Set<string>();
      data.forEach(r => months.add(r.tanggal.slice(0, 7)));
      const sorted = Array.from(months).sort((a, b) => b.localeCompare(a));
      setAvailableMonths(sorted);
    } catch { /* silent */ }
  }

  async function handlePeriodChange(value: string) {
    setPeriodFilter(value);
    if (value === 'today') {
      setMonthlyData([]);
    } else {
      setMonthlyLoading(true);
      try {
        const res = await fetch('/api/absen/semua');
        if (res.ok) {
          const all: AbsenRecord[] = await res.json();
          setMonthlyData(all.filter(r => r.tanggal.startsWith(value)));
        }
      } catch { /* silent */ }
      setMonthlyLoading(false);
    }
  }

  // ── Data yang ditampilkan (hari ini atau bulan terfilter) ──
  const displayData = periodFilter === 'today' ? absenHariIni : monthlyData;
  const displayPulang = useMemo(() => displayData.filter(r => r.jenisAbsen === 'pulang'), [displayData]);

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch('/api/absen/hari-ini');
      if (res.status === 401) {
        router.replace('/admin');
        return;
      }
      if (res.ok) {
        const data: AbsenRecord[] = await res.json();
        setAbsenHariIni(data);
      }
    } catch {
      // silent
    }
    setLoading(false);
    const now = new Date();
    setLastRefresh(
      `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    );
  }, [router]);

  const loadJadwal = useCallback(async () => {
    setJadwalLoading(true);
    try {
      const res = await fetch('/api/jadwal');
      if (res.ok) {
        const data: JadwalRonda[] = await res.json();
        // Kalau ada yang kosong, isi default
        const result = CONFIG.hariList.map((h, i) => {
          const existing = data.find(j => j.hari === h);
          if (existing) return existing;
          return { id: '', hari: h, petugas: CONFIG.petugasList[i % CONFIG.petugasList.length] };
        });
        setJadwal(result);
      }
    } catch {
      // silent
    }
    setJadwalLoading(false);
  }, []);

  // ── Auth check: dashboard hanya bisa diakses admin yang sudah login ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.replace('/admin');
          return;
        }
        if (!cancelled) setAuthChecked(true);
      } catch {
        router.replace('/admin');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    void (async () => {
      await refreshData();
      await loadAvailableMonths();
    })();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData, authChecked]);

  useEffect(() => {
    if (!authChecked) return;
    const t = setTimeout(() => { void loadJadwal(); }, 0);
    return () => clearTimeout(t);
  }, [loadJadwal, authChecked]);

  const loadWarga = useCallback(async () => {
    setWargaLoading(true);
    try {
      const params = new URLSearchParams({ status: wargaFilter });
      if (wargaDusun) params.set('dusun', wargaDusun);
      const res = await fetch(`/api/warga?${params.toString()}`);
      if (res.ok) {
        const data: Warga[] = await res.json();
        setWargaList(data);
      } else {
        const err = await res.json();
        push('error', err.error || 'Gagal memuat daftar warga');
      }
    } catch {
      push('error', 'Gagal terhubung ke server');
    }
    setWargaLoading(false);
  }, [wargaFilter, wargaDusun, push]);

  useEffect(() => {
    if (tab === 'warga') {
      const t = setTimeout(() => { void loadWarga(); }, 0);
      return () => clearTimeout(t);
    }
  }, [tab, wargaFilter, wargaDusun, loadWarga]);

  async function handleTambahWarga() {
    const nama = namaBaru.trim();
    const dusun = dusunBaru.trim();
    if (!nama || !dusun) {
      push('error', 'Nama dan dusun wajib diisi.');
      return;
    }
    setWargaLoading(true);
    try {
      const res = await fetch('/api/warga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, dusun }),
      });
      if (res.ok) {
        setNamaBaru('');
        setDusunBaru('');
        push('success', `"${nama}" ditambahkan ke warga terdaftar.`);
        await loadWarga();
      } else {
        const err = await res.json();
        push('error', err.error || 'Gagal menambahkan warga');
      }
    } catch {
      push('error', 'Gagal terhubung ke server');
    }
    setWargaLoading(false);
  }

  async function handleTerimaWarga(w: Warga) {
    const res = await fetch('/api/warga', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: w.id, terdaftar: true, aktif: true }),
    });
    if (res.ok) {
      push('success', `"${w.nama}" diterima sebagai warga terdaftar.`);
      await loadWarga();
    } else {
      const err = await res.json();
      push('error', err.error || 'Gagal menyetujui warga');
    }
  }

  async function handleToggleAktif(w: Warga) {
    const res = await fetch('/api/warga', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: w.id, aktif: !w.aktif }),
    });
    if (res.ok) {
      push('success', w.aktif ? `"${w.nama}" dinonaktifkan.` : `"${w.nama}" diaktifkan kembali.`);
      await loadWarga();
    } else {
      const err = await res.json();
      push('error', err.error || 'Gagal mengubah status warga');
    }
  }

  function mulaiEdit(w: Warga) {
    setEditingId(w.id);
    setEditNama(w.nama);
    setEditDusun(w.dusun);
  }

  async function handleSimpanEdit(w: Warga) {
    const nama = editNama.trim();
    const dusun = editDusun.trim();
    if (!nama || !dusun) {
      push('error', 'Nama dan dusun wajib diisi.');
      return;
    }
    const res = await fetch('/api/warga', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: w.id, nama, dusun }),
    });
    if (res.ok) {
      setEditingId(null);
      push('success', `Data "${w.nama}" diperbarui.`);
      await loadWarga();
    } else {
      const err = await res.json();
      push('error', err.error || 'Gagal menyimpan perubahan');
    }
  }

  async function handleKonfirmasiHapus(hapusAbsen: boolean) {
    if (!hapusTarget) return;
    const w = hapusTarget;
    setHapusTarget(null);
    const res = await fetch(
      `/api/warga?id=${encodeURIComponent(w.id)}${hapusAbsen ? '&hapus_absen=1' : ''}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      push('success', hapusAbsen
        ? `"${w.nama}" dihapus beserta data absennya.`
        : `"${w.nama}" dihapus dari daftar.`);
      await loadWarga();
    } else {
      const err = await res.json();
      push('error', err.error || 'Gagal menghapus warga');
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin');
  }

  function handleJadwalChange(hari: string, petugas: string) {
    setJadwal(prev => prev.map(j => j.hari === hari ? { ...j, petugas } : j));
    setJadwalDirty(true);
  }

  async function handleSimpanJadwal() {
    setJadwalSaving(true);
    try {
      const res = await fetch('/api/jadwal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jadwal: jadwal.map(j => ({ hari: j.hari, petugas: j.petugas })) }),
      });
      if (res.ok) {
        push('success', 'Jadwal berhasil disimpan.');
        setJadwalDirty(false);
        await loadJadwal();
      } else {
        const err = await res.json();
        push('error', err.error || 'Gagal menyimpan jadwal');
      }
    } catch {
      push('error', 'Gagal terhubung ke server');
    }
    setJadwalSaving(false);
  }

  // ── Dusun leaderboard (adaptif: hari ini atau bulan terfilter) ──
  const dusunLeaderboard = useMemo(() => {
    const counts = new Map<string, number>();
    displayPulang.forEach(r => {
      counts.set(r.dusun, (counts.get(r.dusun) || 0) + 1);
    });
    const dusunOrder = CONFIG.dusunList;
    return dusunOrder
      .map(d => ({ dusun: d, count: counts.get(d) || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [displayPulang]);

  const totalHadir = displayPulang.length;
  const tanggalLabel = formatTanggalIndo(getTanggalHariIni());
  const maxCount = Math.max(...dusunLeaderboard.map(d => d.count), 1);

  return (
    <main className="min-h-screen bg-slate-50">
      {!authChecked ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader size={32} className="animate-spin" />
          <p className="text-sm font-bold">Memeriksa sesi admin…</p>
        </div>
      ) : (
        <>
      {/* ─── NAVBAR ─── */}
      <nav className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-card">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Dashboard Admin</p>
            <h1 className="text-base sm:text-lg font-black leading-tight truncate">Absensi Ronda</h1>
            <p className="text-xs text-blue-200 hidden sm:block">Bale Desa Kawunglarang</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={handleLogout}
              className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white p-2.5 sm:px-3 sm:py-2 rounded-lg text-xs font-bold border border-white/20 transition-colors"
              style={{ minWidth: '40px', minHeight: '40px' }}>
              <LogOut size={16} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* ─── TAB NAV ─── */}
        <div className="flex items-center gap-1 bg-slate-200 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setTab('log')}
    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
      tab === 'log' ? 'bg-white text-slate-900 shadow-card' : 'text-slate-500 hover:text-slate-700'
    }`}
            style={{ minHeight: '42px' }}
          >
            <ClipboardList size={16} />
            Kehadiran
          </button>
          <button
            type="button"
            onClick={() => setTab('jadwal')}
    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
      tab === 'jadwal' ? 'bg-white text-slate-900 shadow-card' : 'text-slate-500 hover:text-slate-700'
    }`}
            style={{ minHeight: '42px' }}
          >
            <Calendar size={16} />
            Jadwal Ronda
          </button>
          <button
            type="button"
            onClick={() => setTab('warga')}
    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
      tab === 'warga' ? 'bg-white text-slate-900 shadow-card' : 'text-slate-500 hover:text-slate-700'
    }`}
            style={{ minHeight: '42px' }}
          >
            <Users size={16} />
            Daftar Warga
          </button>
        </div>

        {/* ════════════════════════════════════════════════ */}
        {/* TAB: LOG KEHADIRAN                              */}
        {/* ════════════════════════════════════════════════ */}
        {tab === 'log' && (
          <>
            {/* Header: title + filter bulan + refresh */}
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-black text-slate-900 truncate">
                    {periodFilter === 'today' ? tanggalLabel : 'Rekap Bulanan'}
                  </h2>
                  {/* Dropdown filter bulan */}
                  <div className="relative">
                    <select
                      value={periodFilter === 'today' ? 'today' : periodFilter}
                      onChange={e => handlePeriodChange(e.target.value)}
                      className="appearance-none bg-white border-2 border-slate-300 rounded-xl px-4 py-2 pr-10 text-sm font-bold text-slate-700 focus:border-[#1e3a8a] focus:outline-none transition-colors cursor-pointer"
                      style={{ minHeight: '40px' }}
                    >
                      <option value="today">Hari Ini</option>
                      {availableMonths.map(m => {
                        const [thn, bln] = m.split('-');
                        return <option key={m} value={m}>{BULAN_INDONESIA[parseInt(bln)-1]} {thn}</option>;
                      })}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Total absen: <strong>{displayData.length}</strong> · Hadir lengkap: <strong className="text-green-700">{totalHadir}</strong> orang
                  {periodFilter === 'today' && lastRefresh && <span className="ml-2">· Data: {lastRefresh}</span>}
                </p>
              </div>
              {periodFilter === 'today' && (
                <button onClick={refreshData}
                  className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 active:scale-[0.97] transition-all flex-shrink-0"
                  style={{ minHeight: '44px' }}>
                  <RefreshCw size={16} strokeWidth={2} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              )}
            </div>

            {/* Kehadiran per Dusun */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                  Kehadiran per Dusun — {periodFilter === 'today' ? 'Malam Ini' : `${BULAN_INDONESIA[parseInt(periodFilter.split('-')[1])-1]} ${periodFilter.split('-')[0]}`}
                </h3>
              </div>

              {(periodFilter === 'today' && loading) || monthlyLoading ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm font-semibold">Memuat data...</div>
              ) : dusunLeaderboard.length === 0 || totalHadir === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm font-semibold">
                  {periodFilter === 'today' ? 'Belum ada data absen malam ini.' : 'Tidak ada data absen untuk periode ini.'}
                </div>
              ) : (
                <div className="px-5 py-4 space-y-4">
                  {dusunLeaderboard.map((item, idx) => {
                    const pct = Math.round((item.count / maxCount) * 100);
                    return (
                      <div key={item.dusun} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-black flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <p className="text-sm font-bold text-slate-800 truncate">{item.dusun}</p>
                          </div>
                          <p className="text-sm font-black text-slate-900 tabular-nums flex-shrink-0 ml-3">{item.count} org</p>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1e3a8a] rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Users size={14} />
                Total hadir lengkap (masuk + pulang): <strong className="text-slate-800">{totalHadir}</strong> orang
              </div>
            </div>

            {/* Log Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                  Kehadiran ({displayData.length} data)
                </h3>
                {periodFilter !== 'today' && (
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {BULAN_INDONESIA[parseInt(periodFilter.split('-')[1])-1]} {periodFilter.split('-')[0]}
                  </span>
                )}
              </div>

              {displayData.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm font-semibold">
                  {periodFilter === 'today' ? (loading ? 'Memuat data...' : 'Belum ada absen malam ini.') : 'Tidak ada data untuk periode ini.'}
                </div>
              ) : (
                <>
                  <div className="sm:hidden divide-y divide-slate-100">
                    {displayData.map((r, i) => (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                        <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-black flex items-center justify-center flex-shrink-0 tabular-nums">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate">{r.nama}</p>
                          <p className="text-xs text-slate-500 font-semibold">
                            {r.dusun}
                            <span className="ml-2 text-slate-400">· {r.jamAbsen} WIB · ±{r.jarakMeter}m</span>
                          </p>
                          {periodFilter !== 'today' && (
                            <p className="text-[10px] text-slate-400 font-medium">{formatTanggalIndo(r.tanggal)}</p>
                          )}
                          <span className={`inline-block mt-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            r.jenisAbsen === 'masuk' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }`}>{r.jenisAbsen === 'masuk' ? 'MASUK' : 'PULANG'}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {['No', 'Nama', 'Dusun', ...(periodFilter !== 'today' ? ['Tanggal'] : []), 'Jam Absen', 'Jenis', 'Jarak (m)'].map(h => (
                            <th key={h} className="text-left px-4 py-3 font-black text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayData.map((r, i) => (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-slate-400 font-semibold tabular-nums">{i + 1}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{r.nama}</td>
                            <td className="px-4 py-3 text-slate-600 font-semibold whitespace-nowrap">{r.dusun}</td>
                            {periodFilter !== 'today' && (
                              <td className="px-4 py-3 text-slate-500 font-semibold whitespace-nowrap text-xs">{formatTanggalIndo(r.tanggal)}</td>
                            )}
                            <td className="px-4 py-3 tabular-nums font-semibold text-slate-700 whitespace-nowrap">{r.jamAbsen}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                r.jenisAbsen === 'masuk' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                              }`}>{r.jenisAbsen === 'masuk' ? 'MASUK' : 'PULANG'}</span>
                            </td>
                            <td className="px-4 py-3 tabular-nums font-semibold text-slate-700 whitespace-nowrap">±{r.jarakMeter}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs font-semibold text-slate-400">
                    Menampilkan {displayData.length} data absensi ({totalHadir} hadir lengkap)
                  </div>
                  <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 text-xs font-semibold text-blue-600">
                    Hadir lengkap = warga sudah absen Masuk <b>dan</b> Pulang.
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <ExportButton />
              <a
                href="/api/qr"
                download
                className="inline-flex items-center gap-2 bg-white text-[#1e3a8a] border-2 border-[#1e3a8a] px-5 py-3 rounded-lg font-bold text-sm hover:bg-[#1e3a8a] hover:text-white active:scale-[0.98] transition-all"
                style={{ minHeight: '44px' }}
              >
                <QrCode size={18} strokeWidth={2} />
                Download QR Code
              </a>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* TAB: JADWAL RONDA                               */}
        {/* ════════════════════════════════════════════════ */}
        {tab === 'jadwal' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-[#1e3a8a]" strokeWidth={2} />
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                  Jadwal Ronda Mingguan
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Atur petugas ronda setiap hari. Tersedia 7 hari (Senin — Minggu).
              </p>
            </div>

            {jadwalLoading ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm font-semibold">Memuat jadwal...</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-5 py-3 font-black text-slate-500 text-xs uppercase tracking-wider w-32">Hari</th>
                        <th className="text-left px-5 py-3 font-black text-slate-500 text-xs uppercase tracking-wider">Petugas Ronda</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jadwal.map(j => (
                        <tr key={j.hari} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 font-black text-slate-800">{HARI_LABEL[j.hari] || j.hari}</td>
                          <td className="px-5 py-3">
                            <select
                              value={j.petugas}
                              onChange={e => handleJadwalChange(j.hari, e.target.value)}
                              className="w-full max-w-xs px-3 py-2.5 border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:border-[#1e3a8a] focus:outline-none transition-colors"
                              style={{ minHeight: '44px' }}
                            >
                              {CONFIG.petugasList.map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Message + Save */}
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSimpanJadwal}
                      disabled={jadwalSaving}
                      className="inline-flex items-center gap-2 bg-[#1e3a8a] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#1e40af] active:scale-[0.98] transition-all disabled:opacity-50"
                      style={{ minHeight: '48px' }}
                    >
                      <Save size={18} strokeWidth={2} />
                      {jadwalSaving ? <><Loader size={18} className="animate-spin" strokeWidth={2} /> Menyimpan...</> : jadwalDirty ? 'Simpan Jadwal' : 'Simpan Jadwal'}
                    </button>
                    <a
                      href="/api/jadwal/download"
                      download
                      className="inline-flex items-center gap-2 bg-white text-slate-700 border-2 border-slate-300 px-5 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
                      style={{ minHeight: '48px' }}
                    >
                      <FileDown size={18} strokeWidth={2} />
                      Download Jadwal
                    </a>
                  </div>
                  {!jadwalDirty && jadwal.length > 0 && (
                    <p className="text-xs text-slate-400 font-medium">Tidak ada perubahan.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* TAB: DAFTAR WARGA (MASTER LIST)                 */}
        {/* ════════════════════════════════════════════════ */}
        {tab === 'warga' && (
          <div className="space-y-4">
            {/* ── Tambah manual ── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-[#1e3a8a]" strokeWidth={2} />
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                    Daftar Warga
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Hanya warga <b>terdaftar</b> yang bisa absen. Nama yang diketik manual oleh warga
                  belum disetujui → absennya ditolak & masuk antrean ini. Setujui agar warga bisa
                  absen dan namanya muncul di dropdown form absen.
                </p>
                <p className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-3">
                  Klik <b>Terima</b> untuk menyetujui nama baru. Klik ikon <b>tong sampah</b> untuk
                  menghapus nama yang iseng.
                </p>
              </div>

              <div className="px-5 py-4">
                <form
                  onSubmit={e => { e.preventDefault(); void handleTambahWarga(); }}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={namaBaru}
                      onChange={e => setNamaBaru(e.target.value)}
                      placeholder="Nama lengkap warga"
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none transition-colors"
                      style={{ minHeight: '46px' }}
                    />
                  </div>
                  <div className="relative sm:w-56">
                    <select
                      value={dusunBaru}
                      onChange={e => setDusunBaru(e.target.value)}
                      className="appearance-none w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-slate-700 focus:border-[#1e3a8a] focus:outline-none transition-colors cursor-pointer"
                      style={{ minHeight: '46px' }}
                    >
                      <option value="">-- Pilih Dusun --</option>
                      {CONFIG.dusunList.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 bg-[#1e3a8a] text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-[#1e40af] active:scale-[0.98] transition-all flex-shrink-0"
                    style={{ minHeight: '46px' }}
                  >
                    <Plus size={18} strokeWidth={2.5} />
                    Tambah
                  </button>
                </form>
              </div>
            </div>

            {/* ── Filter + list ── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {(['belum', 'terdaftar', 'semua'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setWargaFilter(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                        wargaFilter === f
                          ? 'bg-[#1e3a8a] text-white shadow-card'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                      style={{ minHeight: '32px' }}
                    >
                      {f === 'belum' ? 'Menunggu Persetujuan' : f === 'terdaftar' ? 'Disetujui' : 'Semua'}
                    </button>
                  ))}
                  <div className="relative sm:w-52">
                    <select
                      value={wargaDusun}
                      onChange={e => setWargaDusun(e.target.value)}
                      className="appearance-none w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-slate-700 focus:border-[#1e3a8a] focus:outline-none transition-colors cursor-pointer"
                      style={{ minHeight: '40px' }}
                    >
                      <option value="">Semua Dusun</option>
                      {CONFIG.dusunList.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={wargaSearch}
                    onChange={e => setWargaSearch(e.target.value)}
                    placeholder="Cari nama..."
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none transition-colors"
                    style={{ minHeight: '42px' }}
                  />
                </div>
              </div>

              {wargaLoading ? (
                <div className="px-5 py-10 text-center text-slate-400 text-sm font-semibold">
                  <Loader size={24} className="animate-spin mx-auto mb-2" />
                  Memuat daftar warga...
                </div>
              ) : (() => {
                const q = wargaSearch.trim().toLowerCase();
                const list = q
                  ? wargaList.filter(w => w.nama.toLowerCase().includes(q))
                  : wargaList;

                if (list.length === 0) {
                  return (
                    <div className="px-5 py-10 text-center text-slate-400 text-sm font-semibold">
                      {wargaFilter === 'belum'
                        ? 'Tidak ada nama yang menunggu verifikasi.'
                        : wargaFilter === 'terdaftar'
                          ? 'Belum ada warga terdaftar.'
                          : 'Daftar warga kosong.'}
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-slate-100">
                    {list.map(w => (
                      <div key={w.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors flex-wrap sm:flex-nowrap">
                        {editingId === w.id ? (
                          <>
                            <input
                              type="text"
                              value={editNama}
                              onChange={e => setEditNama(e.target.value)}
                              className="flex-1 min-w-0 px-3 py-2 border-2 border-slate-300 rounded-xl text-sm font-semibold focus:border-[#1e3a8a] focus:outline-none transition-colors"
                              style={{ minHeight: '40px' }}
                            />
                            <select
                              value={editDusun}
                              onChange={e => setEditDusun(e.target.value)}
                              className="appearance-none w-40 px-3 py-2 border-2 border-slate-300 rounded-xl text-sm font-semibold bg-white focus:border-[#1e3a8a] focus:outline-none transition-colors cursor-pointer"
                              style={{ minHeight: '40px' }}
                            >
                              {CONFIG.dusunList.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => void handleSimpanEdit(w)}
                              className="text-xs font-black bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 active:scale-95 transition-all"
                              style={{ minHeight: '40px' }}
                            >
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-xs font-black bg-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-300 active:scale-95 transition-all"
                              style={{ minHeight: '40px' }}
                            >
                              Batal
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-sm font-bold truncate ${w.aktif ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                                  {w.nama}
                                </p>
                                {!w.terdaftar ? (
                                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                    Menunggu Persetujuan
                                  </span>
                                ) : w.aktif ? (
                                  <span className="text-[10px] font-black uppercase tracking-wider text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                                    Disetujui
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    Nonaktif
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-semibold mt-0.5">{w.dusun}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                              {!w.terdaftar && (
                                <button
                                  type="button"
                                  onClick={() => void handleTerimaWarga(w)}
                                  title="Terima sebagai warga terdaftar"
                                  className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-black hover:bg-green-700 active:scale-95 transition-all"
                                  style={{ minHeight: '40px' }}
                                >
                                  <UserCheck size={15} />
                                  <span className="hidden sm:inline">Terima</span>
                                </button>
                              )}
                              {w.terdaftar && (
                                <button
                                  type="button"
                                  onClick={() => mulaiEdit(w)}
                                  title="Edit"
                                  className="flex items-center justify-center bg-slate-100 text-slate-600 p-2.5 rounded-lg hover:bg-slate-200 active:scale-95 transition-all"
                                  style={{ width: '40px', height: '40px' }}
                                >
                                  <Pencil size={15} />
                                </button>
                              )}
                              {w.terdaftar && (
                                <button
                                  type="button"
                                  onClick={() => void handleToggleAktif(w)}
                                  title={w.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                                  className={`flex items-center justify-center p-2.5 rounded-lg active:scale-95 transition-all ${
                                    w.aktif
                                      ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                                  }`}
                                  style={{ width: '40px', height: '40px' }}
                                >
                                  {w.aktif ? <UserX size={15} /> : <UserCheck size={15} />}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setHapusTarget(w)}
                                title="Hapus"
                                className="flex items-center justify-center bg-red-50 text-red-600 p-2.5 rounded-lg hover:bg-red-100 active:scale-95 transition-all"
                                style={{ width: '40px', height: '40px' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 py-4">
          Sistem Absensi Ronda — KKN 46 Kawunglarang UNIKU
        </p>
      </div>
        </>
      )}

      {/* Modal konfirmasi hapus warga */}
      <ConfirmModal
        open={hapusTarget !== null}
        title={`Hapus "${hapusTarget?.nama ?? ''}"?`}
        onClose={() => setHapusTarget(null)}
      >
        <div className="space-y-4">
          <p>
            Aksi ini <strong>permanen</strong>. Warga tidak akan lagi muncul di daftar
            dan autocomplete. Data absen atas nama <strong>{hapusTarget?.dusun}</strong> tetap
            tersimpan kecuali Anda memilih ikut menghapusnya.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleKonfirmasiHapus(true)}
              className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-red-700 active:scale-[0.98] transition-all"
              style={{ minHeight: '48px' }}
            >
              <Trash2 size={16} /> Hapus + Data Absen
            </button>
            <button
              type="button"
              onClick={() => void handleKonfirmasiHapus(false)}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-3 rounded-xl font-bold text-sm hover:bg-slate-200 active:scale-[0.98] transition-all"
              style={{ minHeight: '48px' }}
            >
              Hapus saja dari daftar
            </button>
          </div>
        </div>
      </ConfirmModal>
    </main>
  );
}