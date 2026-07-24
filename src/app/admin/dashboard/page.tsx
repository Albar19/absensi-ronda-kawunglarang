'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw, QrCode, UsersIcon, Calendar, Search, Database, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { AbsenRecord } from '@/lib/types';
import { formatTanggalIndo, getTanggalHariIni, getHariIniIndonesia, countHariDalamRentang } from '@/lib/data';
import AbsenTable from '@/components/admin/AbsenTable';
import ExportButton from '@/components/admin/ExportButton';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [absenHariIni, setAbsenHariIni] = useState<AbsenRecord[]>([]);
  const [lastRefresh, setLastRefresh] = useState('');
  const [wargaList, setWargaList] = useState<{ id: string; nama: string; dusun: string }[]>([]);
  const [semuaRiwayat, setSemuaRiwayat] = useState<AbsenRecord[]>([]);
  const [jadwalList, setJadwalList] = useState<{ id: string; hari: string; warga_id: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dusunFilter, setDusunFilter] = useState('semua');
  const [dusunList, setDusunList] = useState<string[]>([]);
  const [migrasiStatus, setMigrasiStatus] = useState<'loading' | 'ok' | 'perlu' | 'error'>('loading');
  const [migrasiPesan, setMigrasiPesan] = useState('');
  const [migrasiRunning, setMigrasiRunning] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const [hariIniRes, wargaRes, riwayatRes, dRes, jRes] = await Promise.all([
        fetch('/api/absen/hari-ini'),
        fetch('/api/warga'),
        fetch('/api/absen/semua'),
        fetch('/api/dusun'),
        fetch('/api/jadwal'),
      ]);
      if (hariIniRes.status === 401) {
        router.replace('/admin');
        return;
      }
      if (hariIniRes.ok) setAbsenHariIni(await hariIniRes.json());
      if (wargaRes.ok) setWargaList(await wargaRes.json());
      if (riwayatRes.ok) setSemuaRiwayat(await riwayatRes.json());
      if (dRes.ok) {
        const data = await dRes.json();
        setDusunList(data.map((r: { nama: string }) => r.nama));
      }
      if (jRes.ok) setJadwalList(await jRes.json());
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

  // Cek status migrasi
  useEffect(() => {
    fetch('/api/migrasi')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.done) {
          setMigrasiStatus('ok');
        } else {
          setMigrasiStatus('perlu');
          setMigrasiPesan(data?.pesan || 'Perlu migrasi database');
        }
      })
      .catch(() => setMigrasiStatus('error'));
  }, []);

  async function handleMigrasi() {
    setMigrasiRunning(true);
    setMigrasiPesan('Menjalankan migrasi...');
    try {
      const res = await fetch('/api/migrasi', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMigrasiStatus('ok');
        setMigrasiPesan(data.pesan || 'Migrasi berhasil!');
        refreshData();
      } else {
        setMigrasiPesan(data.error || 'Gagal');
      }
    } catch {
      setMigrasiPesan('Gagal terhubung ke server');
    }
    setMigrasiRunning(false);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin');
  }

  const wargaData = wargaList;
  const totalWarga = wargaData.length;
  const sudahAbsen = absenHariIni.length;
  const tanggalLabel = formatTanggalIndo(getTanggalHariIni());

  // ── Hitung periode 30 hari ──
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const cutoff = startDate.toISOString().split('T')[0];

  // Map: warga_id → jumlah hadir dalam 30 hari
  const absenCountMap = new Map<string, number>();
  semuaRiwayat.forEach(r => {
    if (r.tanggal >= cutoff) {
      absenCountMap.set(r.wargaId, (absenCountMap.get(r.wargaId) || 0) + 1);
    }
  });

  // Map: warga_id → jumlah jadwal dalam 30 hari
  const jadwalCountMap = new Map<string, number>();
  jadwalList.forEach(j => {
    const cnt = countHariDalamRentang(j.hari, startDate, endDate);
    jadwalCountMap.set(j.warga_id, (jadwalCountMap.get(j.warga_id) || 0) + cnt);
  });

  // ── Data kehadiran per warga (dipakai untuk tabel + grup dusun) ──
  const wargaAttendance = useMemo(() => {
    return wargaData
      .map(w => {
        const jadwal = jadwalCountMap.get(w.id) || 0;
        const hadir = absenCountMap.get(w.id) || 0;
        const pct = jadwal > 0 ? Math.round((hadir / jadwal) * 100) : 0;
        return {
          ...w,
          jadwal,
          hadir,
          pct,
          hariIni: absenHariIni.some(a => a.wargaId === w.id),
        };
      })
      .filter(w => {
        const matchSearch = !searchQuery || w.nama.toLowerCase().includes(searchQuery.toLowerCase());
        const matchDusun = dusunFilter === 'semua' || w.dusun === dusunFilter;
        return matchSearch && matchDusun;
      });
  }, [wargaData, jadwalCountMap, absenCountMap, absenHariIni, searchQuery, dusunFilter]);

  // ── Group by dusun ──
  const groupedByDusun = useMemo(() => {
    const groups = new Map<string, typeof wargaAttendance>();
    wargaAttendance.forEach(w => {
      if (!groups.has(w.dusun)) groups.set(w.dusun, []);
      groups.get(w.dusun)!.push(w);
    });
    return Array.from(groups.entries())
      .map(([dusun, items]) => {
        const totalJadwal = items.reduce((s, w) => s + w.jadwal, 0);
        const totalHadir = items.reduce((s, w) => s + w.hadir, 0);
        const dusunPct = totalJadwal > 0 ? Math.round((totalHadir / totalJadwal) * 100) : 0;
        return { dusun, items, totalJadwal, totalHadir, dusunPct };
      })
      .sort((a, b) => b.dusunPct - a.dusunPct);
  }, [wargaAttendance]);

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Dashboard Admin</p>
            <h1 className="text-base sm:text-lg font-black leading-tight truncate">Absensi Ronda</h1>
            <p className="text-xs text-blue-200 hidden sm:block">Bale Desa Kawunglarang</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={() => router.push('/admin/warga')}
              className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white p-2.5 sm:px-3 sm:py-2 rounded-lg text-xs font-bold border border-white/20 transition-colors"
              style={{ minWidth: '40px', minHeight: '40px' }}>
              <UsersIcon size={16} />
              <span className="hidden sm:inline">Warga</span>
            </button>
            <button onClick={() => router.push('/admin/jadwal')}
              className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white p-2.5 sm:px-3 sm:py-2 rounded-lg text-xs font-bold border border-white/20 transition-colors"
              style={{ minWidth: '40px', minHeight: '40px' }}>
              <Calendar size={16} />
              <span className="hidden sm:inline">Jadwal</span>
            </button>
            <button onClick={handleLogout}
              className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white p-2.5 sm:px-3 sm:py-2 rounded-lg text-xs font-bold border border-white/20 transition-colors"
              style={{ minWidth: '40px', minHeight: '40px' }}>
              <LogOut size={16} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ─── MIGRASI BANNER ─── */}
      {migrasiStatus === 'loading' && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
            <Loader size={20} className="animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-blue-800">Memeriksa status database...</p>
          </div>
        </div>
      )}
      {migrasiStatus === 'perlu' && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="flex items-start gap-4 bg-amber-50 border-2 border-amber-400 rounded-xl px-5 py-4">
            <div className="flex-shrink-0 mt-0.5">
              <Database size={24} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-amber-900 uppercase tracking-wide">Migrasi Database Diperlukan</p>
              <p className="text-sm text-amber-800 font-medium mt-1">
                Sistem ini masih menggunakan struktur database lama (RT). Klik tombol di samping untuk mengubah ke struktur baru (Dusun).
              </p>
              {migrasiPesan && migrasiPesan !== 'Menjalankan migrasi...' && (
                <p className="text-xs text-amber-700 mt-1 font-mono">{migrasiPesan}</p>
              )}
            </div>
            <button
              onClick={handleMigrasi}
              disabled={migrasiRunning}
              className="flex-shrink-0 flex items-center gap-2 bg-amber-600 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-amber-700 disabled:opacity-60 transition-all active:scale-[0.97]"
              style={{ minHeight: '48px' }}
            >
              {migrasiRunning ? (
                <><Loader size={18} className="animate-spin" /> Memproses...</>
              ) : (
                <><Database size={18} /> Jalankan Migrasi</>
              )}
            </button>
          </div>
        </div>
      )}
      {migrasiStatus === 'ok' && migrasiPesan && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3">
            <CheckCircle size={20} className="text-green-600" />
            <p className="text-sm font-semibold text-green-800">{migrasiPesan}</p>
          </div>
        </div>
      )}
      {migrasiStatus === 'error' && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3">
            <AlertTriangle size={20} className="text-red-600" />
            <p className="text-sm font-semibold text-red-800">Gagal memeriksa status database.</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Date + Refresh */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-900 truncate">{tanggalLabel}</h2>
            <p className="text-xs text-slate-500 font-medium">Data: {lastRefresh || '—'}</p>
          </div>
          <button onClick={refreshData}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 active:scale-[0.97] transition-all"
            style={{ minHeight: '44px' }}>
            <RefreshCw size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        

        {/* ─── KEHADIRAN PER DUSUN ─── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Header + Search + Filter */}
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                Kehadiran per Dusun ({sudahAbsen}/{totalWarga} hari ini)
              </h3>
              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <div className="relative flex-1 sm:w-48">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-semibold focus:border-[#1e3a8a] focus:outline-none"
                    style={{ minHeight: '40px' }}
                  />
                </div>
                <select value={dusunFilter} onChange={e => setDusunFilter(e.target.value)}
                  className="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-semibold focus:border-[#1e3a8a] focus:outline-none"
                  style={{ minHeight: '40px' }}>
                  <option value="semua">Semua Dusun</option>
                  {dusunList.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Body: grouped by dusun */}
          {groupedByDusun.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm font-semibold">
              Tidak ada data
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {groupedByDusun.map(group => {
                const label = group.dusunPct >= 70 ? 'Aktif' : group.dusunPct >= 30 ? 'Cukup' : 'Jarang';
                const badgeBg = group.dusunPct >= 70 ? 'bg-green-100 text-green-800' : group.dusunPct >= 30 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
                const barColor = group.dusunPct >= 70 ? 'bg-green-600' : group.dusunPct >= 30 ? 'bg-yellow-500' : 'bg-red-500';
                const textColor = group.dusunPct >= 70 ? 'text-green-700' : group.dusunPct >= 30 ? 'text-yellow-700' : 'text-red-700';
                return (
                  <div key={group.dusun}>
                    {/* Dusun Header */}
                    <div className="bg-slate-50 px-4 sm:px-5 py-3 border-b border-slate-100">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-black text-slate-800 truncate">{group.dusun}</p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${badgeBg} flex-shrink-0`}>
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold tabular-nums flex-shrink-0">
                          <span className="text-slate-600">{group.totalHadir}/{group.totalJadwal}</span>
                          <span className={textColor}>{group.dusunPct}%</span>
                        </div>
                      </div>
                      {/* Mini bar for dusun */}
                      <div className="mt-1.5 bg-slate-200 rounded-full h-2 overflow-hidden max-w-[300px]">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${group.dusunPct}%` }} />
                      </div>
                    </div>

                    {/* Warga list under dusun */}
                    <div className="divide-y divide-slate-100">
                      {group.items.map(w => {
                        const wpct = w.jadwal > 0 ? Math.round((w.hadir / w.jadwal) * 100) : 0;
                        const wBarColor = wpct >= 70 ? 'bg-green-600' : wpct >= 30 ? 'bg-yellow-500' : 'bg-red-500';
                        const wTextColor = wpct >= 70 ? 'text-green-700' : wpct >= 30 ? 'text-yellow-700' : 'text-red-700';
                        return (
                          <div key={w.id} className="px-4 sm:px-5 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors pl-8 sm:pl-10">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900 truncate">{w.nama}</p>
                                {w.hariIni && (
                                  <span className="text-[10px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                    ✅ Hadir
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden max-w-[180px]">
                                  <div className={`h-full rounded-full transition-all ${wBarColor}`} style={{ width: `${wpct}%` }} />
                                </div>
                                <span className="text-[11px] font-black text-slate-500 tabular-nums flex-shrink-0">
                                  {w.hadir}/{w.jadwal}
                                </span>
                                <span className={`text-[11px] font-black tabular-nums flex-shrink-0 ${wTextColor}`}>
                                  {wpct}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-4 text-[11px] text-slate-500 font-medium flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> &ge;70% (Aktif)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> 30-69% (Cukup)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> &lt;30% (Jarang)
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <a href="/api/qr/download" download="qr-bale-desa.png"
              className="inline-flex items-center gap-2 bg-white text-[#1e3a8a] px-4 py-2.5 rounded-xl font-bold text-sm border-2 border-[#1e3a8a] hover:bg-blue-50 active:scale-[0.97] transition-all"
              style={{ minHeight: '44px' }}>
              <QrCode size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">QR Code</span>
            </a>
            <ExportButton />
          </div>
        </div>

        {/* Table */}
        <AbsenTable wargaList={wargaData} absenHariIni={absenHariIni} filter="semua" />

        <p className="text-center text-xs text-slate-400 py-4">
          Sistem Absensi Ronda — Bale Desa Kawunglarang
        </p>
      </div>
    </main>
  );
}