'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw, Download, Users, Clock, MapPin, Calendar, Save, QrCode, Loader, FileDown, Smartphone, Pencil, AlertTriangle, Search } from 'lucide-react';
import { AbsenRecord, JadwalRonda } from '@/lib/types';
import { CONFIG } from '@/lib/config';
import { formatTanggalIndo, getTanggalHariIni } from '@/lib/data';
import ExportButton from '@/components/admin/ExportButton';

type Tab = 'log' | 'jadwal' | 'device';

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
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('log');

  // ── Log absen ──
  const [absenHariIni, setAbsenHariIni] = useState<AbsenRecord[]>([]);
  const [lastRefresh, setLastRefresh] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Jadwal ──
  const [jadwal, setJadwal] = useState<JadwalRonda[]>([]);
  const [jadwalLoading, setJadwalLoading] = useState(false);
  const [jadwalSaving, setJadwalSaving] = useState(false);
  const [jadwalMessage, setJadwalMessage] = useState('');
  const [jadwalDirty, setJadwalDirty] = useState(false);

  // ── Device management ──
  const [deviceSearch, setDeviceSearch] = useState('');
  const [deviceResults, setDeviceResults] = useState<{ nama: string; deviceId: string; dusun: string; count: number }[]>([]);
  const [deviceSearchLoading, setDeviceSearchLoading] = useState(false);
  const [renameDeviceId, setRenameDeviceId] = useState<string | null>(null);
  const [renameNamaLama, setRenameNamaLama] = useState<string | null>(null);
  const [renameNamaBaru, setRenameNamaBaru] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

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

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    loadJadwal();
  }, [loadJadwal]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin');
  }

  function handleJadwalChange(hari: string, petugas: string) {
    setJadwal(prev => prev.map(j => j.hari === hari ? { ...j, petugas } : j));
    setJadwalDirty(true);
    setJadwalMessage('');
  }

  async function handleSimpanJadwal() {
    setJadwalSaving(true);
    setJadwalMessage('');
    try {
      const res = await fetch('/api/jadwal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jadwal: jadwal.map(j => ({ hari: j.hari, petugas: j.petugas })) }),
      });
      if (res.ok) {
        setJadwalMessage('Jadwal berhasil disimpan.');
        setJadwalDirty(false);
        await loadJadwal();
      } else {
        const err = await res.json();
        setJadwalMessage(`${err.error || 'Gagal menyimpan'}`);
      }
    } catch {
      setJadwalMessage('Gagal terhubung ke server');
    }
    setJadwalSaving(false);
  }

  // ── Device management ──
  async function handleCariDevice() {
    const q = deviceSearch.trim();
    if (!q || q.length < 2) {
      setResetMessage('Ketik minimal 2 karakter (nama atau device ID).');
      return;
    }
    setDeviceSearchLoading(true);
    setResetMessage('');
    try {
      const res = await fetch(`/api/absen/semua`);
      if (!res.ok) {
        setResetMessage('Gagal mengambil data.');
        setDeviceSearchLoading(false);
        return;
      }
      const allData: AbsenRecord[] = await res.json();

      // Filter: nama atau device_id mengandung query
      const qLower = q.toLowerCase();
      const matched = new Map<string, { nama: string; deviceId: string; dusun: string; count: number }>();
      allData.forEach(r => {
        if (
          r.nama.toLowerCase().includes(qLower) ||
          r.deviceId.toLowerCase().includes(qLower)
        ) {
          const key = r.deviceId;
          if (!matched.has(key)) {
            matched.set(key, { nama: r.nama, deviceId: r.deviceId, dusun: r.dusun, count: 0 });
          }
          const entry = matched.get(key)!;
          entry.count++;
          // Update nama ke yang terbaru
          if (allData.indexOf(r) < allData.findIndex(x => x.deviceId === key)) {
            // this is an earlier record, skip
          }
          // Use the latest name for display
          const existingIdx = allData.findIndex(x => x.deviceId === key && x.nama === r.nama);
          if (existingIdx >= 0) {
            entry.nama = r.nama;
            entry.dusun = r.dusun;
          }
        }
      });

      // Urutkan: yang cocok nama dulu
      const results = Array.from(matched.values()).sort((a, b) => {
        const aName = a.nama.toLowerCase().includes(qLower) ? 0 : 1;
        const bName = b.nama.toLowerCase().includes(qLower) ? 0 : 1;
        return aName - bName;
      });

      setDeviceResults(results);
      if (results.length === 0) {
        setResetMessage('Tidak ditemukan perangkat dengan kata kunci tersebut.');
      }
    } catch {
      setResetMessage('Gagal mencari data.');
    }
    setDeviceSearchLoading(false);
  }

  async function handleRenameDevice(deviceId: string, namaBaru: string) {
    setRenameLoading(true);
    setResetMessage('');
    try {
      const res = await fetch('/api/absen/reset-nama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, nama_baru: namaBaru }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetMessage(data.message || 'Nama berhasil diganti.');
        // Update nama di hasil pencarian
        setDeviceResults(prev => prev.map(d =>
          d.deviceId === deviceId ? { ...d, nama: namaBaru } : d
        ));
      } else {
        setResetMessage(data.error || 'Gagal mengganti nama.');
      }
    } catch {
      setResetMessage('Gagal terhubung ke server.');
    }
    setRenameLoading(false);
    setRenameDeviceId(null);
    setRenameNamaLama(null);
    setRenameNamaBaru('');
  }

  // ── Hanya absen pulang yang dihitung (pulang = sudah masuk & lengkap) ──
  const absenPulang = useMemo(() => absenHariIni.filter(r => r.jenisAbsen === 'pulang'), [absenHariIni]);

  // ── Dusun leaderboard ──
  const dusunLeaderboard = useMemo(() => {
    const counts = new Map<string, number>();
    absenPulang.forEach(r => {
      counts.set(r.dusun, (counts.get(r.dusun) || 0) + 1);
    });
    const dusunOrder = CONFIG.dusunList;
    return dusunOrder
      .map(d => ({ dusun: d, count: counts.get(d) || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [absenPulang]);

  const totalHadir = absenPulang.length;
  const tanggalLabel = formatTanggalIndo(getTanggalHariIni());
  const maxCount = Math.max(...dusunLeaderboard.map(d => d.count), 1);

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
        {/* ─── TAB NAV ─── */}
        <div className="flex items-center gap-1 bg-slate-200 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setTab('log')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === 'log' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
            style={{ minHeight: '42px' }}
          >
            <Users size={16} />
            Log Kehadiran
          </button>
          <button
            type="button"
            onClick={() => setTab('jadwal')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === 'jadwal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
            style={{ minHeight: '42px' }}
          >
            <Calendar size={16} />
            Jadwal Ronda
          </button>
          <button
            type="button"
            onClick={() => setTab('device')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === 'device' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
            style={{ minHeight: '42px' }}
          >
            <Smartphone size={16} />
            Perangkat
          </button>
        </div>

        {/* ════════════════════════════════════════════════ */}
        {/* TAB: LOG KEHADIRAN                              */}
        {/* ════════════════════════════════════════════════ */}
        {tab === 'log' && (
          <>
            {/* Date + Refresh */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="min-w-0">
                <h2 className="text-lg font-black text-slate-900 truncate">{tanggalLabel}</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Total absen: <strong>{absenHariIni.length}</strong> · Hadir lengkap: <strong className="text-green-700">{totalHadir}</strong> orang
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

            {/* Rekapitulasi Kehadiran per Dusun */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                  Rekapitulasi Kehadiran per Dusun — Malam Ini
                </h3>
              </div>

              {loading ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm font-semibold">Memuat data...</div>
              ) : dusunLeaderboard.length === 0 || totalHadir === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm font-semibold">Belum ada data absen malam ini.</div>
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
                  <div className="sm:hidden divide-y divide-slate-100">
                    {absenHariIni.map((r, i) => (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                        <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-black flex items-center justify-center flex-shrink-0 tabular-nums">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate">{r.nama}</p>
                          <p className="text-xs text-slate-500 font-semibold">
                            {r.dusun}
                            <span className="ml-2 text-slate-400">· {r.jamAbsen} WIB · ±{r.jarakMeter}m</span>
                          </p>
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
                          {['No', 'Nama', 'Dusun', 'Jam Absen', 'Jenis', 'Jarak (m)'].map(h => (
                            <th key={h} className="text-left px-4 py-3 font-black text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
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
                    Menampilkan {absenHariIni.length} data absensi ({totalHadir} hadir lengkap)
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
                <QrCode size={18} strokeWidth={2.5} />
                Download QR Code
              </a>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* TAB: JADWAL RONDA                               */}
        {/* ════════════════════════════════════════════════ */}
        {tab === 'jadwal' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
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
                  {jadwalMessage && (
                    <p className={`text-sm font-bold ${jadwalMessage.includes('berhasil') ? 'text-green-700' : 'text-red-700'}`}>{jadwalMessage}</p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSimpanJadwal}
                      disabled={jadwalSaving}
                      className="inline-flex items-center gap-2 bg-[#1e3a8a] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#1e40af] active:scale-[0.98] transition-all disabled:opacity-50"
                      style={{ minHeight: '48px' }}
                    >
                      <Save size={18} strokeWidth={2.5} />
                      {jadwalSaving ? <><Loader size={18} className="animate-spin" strokeWidth={2.5} /> Menyimpan...</> : jadwalDirty ? 'Simpan Jadwal' : 'Simpan Jadwal'}
                    </button>
                    <a
                      href="/api/jadwal/download"
                      download
                      className="inline-flex items-center gap-2 bg-white text-slate-700 border-2 border-slate-300 px-5 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
                      style={{ minHeight: '48px' }}
                    >
                      <FileDown size={18} strokeWidth={2.5} />
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
        {/* TAB: PERANGKAT (DEVICE MANAGEMENT)              */}
        {/* ════════════════════════════════════════════════ */}
        {tab === 'device' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Smartphone size={20} className="text-[#1e3a8a]" strokeWidth={2} />
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                  Manajemen Perangkat
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Cari perangkat untuk mengganti nama warga. 1 perangkat = 1 warga. Data absen tetap tersimpan.
              </p>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Search */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={deviceSearch}
                    onChange={e => setDeviceSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCariDevice(); }}
                    placeholder="Cari nama warga atau ID perangkat..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none transition-colors"
                    style={{ minHeight: '46px' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCariDevice}
                  disabled={deviceSearchLoading}
                  className="bg-[#1e3a8a] text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-[#1e40af] active:scale-[0.98] transition-all disabled:opacity-50"
                  style={{ minHeight: '46px', whiteSpace: 'nowrap' }}
                >
                  {deviceSearchLoading ? <Loader size={16} className="animate-spin" /> : 'Cari'}
                </button>
              </div>

              {/* Message */}
              {resetMessage && (
                <p className={`text-sm font-bold ${resetMessage.includes('berhasil') || resetMessage.includes('ditemukan') ? 'text-green-700' : 'text-red-700'}`}>
                  {resetMessage}
                </p>
              )}

              {/* Results */}
              {deviceResults.length > 0 && (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {deviceResults.map(dev => (
                    <div key={dev.deviceId} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-900 truncate">{dev.nama}</p>
                        <p className="text-xs text-slate-500 font-semibold truncate">
                          {dev.dusun} · {dev.count} absen
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                          ID: {dev.deviceId.slice(0, 24)}…
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRenameDeviceId(dev.deviceId);
                          setRenameNamaLama(dev.nama);
                          setRenameNamaBaru(dev.nama);
                        }}
                        className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 active:scale-[0.97] transition-all flex-shrink-0"
                        style={{ minHeight: '38px' }}
                      >
                        <Pencil size={14} strokeWidth={2.5} />
                        Ganti Nama
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {deviceResults.length === 0 && !deviceSearchLoading && !resetMessage && (
                <div className="text-center py-8 text-slate-400 text-sm font-semibold">
                  <Smartphone size={40} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                  Cari nama warga untuk melihat perangkat terdaftar.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── RENAME MODAL ─── */}
        {renameDeviceId && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-auto space-y-4">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <Pencil size={32} className="text-blue-600" strokeWidth={1.8} />
                </div>
                <h3 className="text-xl font-black text-slate-900">Ganti Nama</h3>
                <p className="text-sm text-slate-600 font-semibold leading-relaxed">
                  Nama saat ini: <strong>{renameNamaLama}</strong>
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Masukkan nama baru untuk perangkat ini. Semua data absen tetap tersimpan.
                </p>
              </div>
              <div>
                <label htmlFor="nama-baru" className="block text-xs font-black tracking-widest uppercase text-slate-500 mb-1.5">
                  Nama Baru
                </label>
                <input
                  id="nama-baru"
                  type="text"
                  value={renameNamaBaru}
                  onChange={e => setRenameNamaBaru(e.target.value)}
                  placeholder="Ketik nama yang benar"
                  autoFocus
                  className="w-full px-4 py-3 text-base font-semibold border-2 border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none transition-colors"
                  style={{ minHeight: '52px' }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRenameDeviceId(null);
                    setRenameNamaLama(null);
                    setRenameNamaBaru('');
                  }}
                  disabled={renameLoading}
                  className="flex-1 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-base hover:bg-slate-50 transition-all disabled:opacity-50"
                  style={{ minHeight: '48px' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (renameNamaBaru.trim()) {
                      handleRenameDevice(renameDeviceId, renameNamaBaru.trim());
                    }
                  }}
                  disabled={renameLoading || !renameNamaBaru.trim()}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ minHeight: '48px' }}
                >
                  {renameLoading ? <><Loader size={16} className="animate-spin" /> Menyimpan...</> : 'Simpan Nama'}
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 py-4">
          Sistem Absensi Ronda — KKN 46 Kawunglarang UNIKU
        </p>
      </div>
    </main>
  );
}