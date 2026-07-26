'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw, Download, Trophy, Users, Clock, MapPin } from 'lucide-react';
import { AbsenRecord } from '@/lib/types';
import { CONFIG } from '@/lib/config';
import { formatTanggalIndo, getTanggalHariIni } from '@/lib/data';
import ExportButton from '@/components/admin/ExportButton';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [absenHariIni, setAbsenHariIni] = useState<AbsenRecord[]>([]);
  const [lastRefresh, setLastRefresh] = useState('');
  const [loading, setLoading] = useState(true);

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

  // ── Dusun leaderboard (count per dusun, sorted desc) ──
  const dusunLeaderboard = useMemo(() => {
    const counts = new Map<string, number>();
    absenHariIni.forEach(r => {
      counts.set(r.dusun, (counts.get(r.dusun) || 0) + 1);
    });
    // Gunakan urutan dusun dari config, lalu urutkan desc
    const dusunOrder = CONFIG.dusunList;
    return dusunOrder
      .map(d => ({ dusun: d, count: counts.get(d) || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [absenHariIni]);

  const totalHadir = absenHariIni.length;
  const tanggalLabel = formatTanggalIndo(getTanggalHariIni());

  const trophyIcons = ['🏆', '🥈', '🥉', '⚠️'];

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ─── NAVBAR ─── */}
      <nav className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-md">
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
        {/* Date + Refresh */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-900 truncate">{tanggalLabel}</h2>
            <p className="text-xs text-slate-500 font-medium">
              Total hadir: <strong>{totalHadir}</strong> orang
              {lastRefresh && <span className="ml-2">· Data: {lastRefresh}</span>}
            </p>
          </div>
          <button onClick={refreshData}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 active:scale-[0.97] transition-all"
            style={{ minHeight: '44px' }}>
            <RefreshCw size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* ─── DUSUN LEADERBOARD ─── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-amber-500" strokeWidth={2} />
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                Dusun Leaderboard — Malam Ini
              </h3>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm font-semibold">
              Memuat data...
            </div>
          ) : dusunLeaderboard.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm font-semibold">
              Belum ada data absen malam ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {dusunLeaderboard.map((item, idx) => {
                const icon = trophyIcons[idx] || '📋';
                const isTop = idx === 0;
                const bgClass = isTop ? 'bg-amber-50' : idx === 1 ? 'bg-slate-50' : '';
                return (
                  <div key={item.dusun} className={`flex items-center justify-between px-5 py-4 ${bgClass}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl flex-shrink-0" role="img" aria-hidden>{icon}</span>
                      <div className="min-w-0">
                        <p className={`font-black truncate ${isTop ? 'text-amber-900 text-lg' : 'text-slate-800'}`}>
                          {item.dusun}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {item.count} warga hadir
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl font-black text-lg flex-shrink-0 ${
                      isTop ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.count}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Total footer */}
          <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Users size={14} />
            Total kehadiran malam ini: <strong className="text-slate-800">{totalHadir}</strong> orang
          </div>
        </div>

        {/* ─── LOG TABLE ─── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
              Log Kehadiran ({absenHariIni.length} data)
            </h3>
          </div>

          {absenHariIni.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm font-semibold">
              {loading ? 'Memuat data...' : 'Belum ada absen malam ini.'}
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-slate-100">
                {absenHariIni.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-black flex items-center justify-center flex-shrink-0 tabular-nums">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{r.nama}</p>
                      <p className="text-xs text-slate-500 font-semibold">
                        {r.dusun}
                        <span className="ml-2 text-slate-400">· {r.jamAbsen} WIB · ±{r.jarakMeter}m</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['No', 'Nama', 'Dusun', 'Jam Absen', 'Jarak (m)', 'Waktu'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-black text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {absenHariIni.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-semibold tabular-nums">{i + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{r.nama}</td>
                        <td className="px-4 py-3 text-slate-600 font-semibold whitespace-nowrap">{r.dusun}</td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-slate-700 whitespace-nowrap">{r.jamAbsen}</td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-slate-700 whitespace-nowrap">±{r.jarakMeter}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">
                          {r.jamAbsen}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs font-semibold text-slate-400">
                Menampilkan {absenHariIni.length} data kehadiran
              </div>
            </>
          )}
        </div>

        {/* ─── TOOLBAR ─── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <ExportButton />
        </div>

        <p className="text-center text-xs text-slate-400 py-4">
          Sistem Absensi Ronda — KKN 46 Kawunglarang UNIKU
        </p>
      </div>
    </main>
  );
}
