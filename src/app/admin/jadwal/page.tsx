'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeft, LogOut, AlertTriangle, CheckCircle, Loader, Database } from 'lucide-react';
import { getHariIniIndonesia } from '@/lib/data';

const DAFTAR_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

interface Jadwal {
  id: string;
  hari: string;
  warga_id: string;
  shift: string;
  keterangan: string | null;
  created_at: string;
}

interface Warga {
  id: string;
  nama: string;
  dusun: string;
}

export default function AdminJadwalPage() {
  const router = useRouter();
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addHari, setAddHari] = useState(getHariIniIndonesia());
  const [addWargaId, setAddWargaId] = useState('');
  const [addKet, setAddKet] = useState('');
  const [submitting, setSubmitting] = useState<'add' | 'delete' | null>(null);

  async function fetchData() {
    const [jRes, wRes] = await Promise.all([
      fetch('/api/jadwal'),
      fetch('/api/warga'),
    ]);
    if (jRes.status === 401 || wRes.status === 401) {
      router.replace('/admin');
      return;
    }
    setJadwalList(await jRes.json());
    setWargaList(await wRes.json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  // Migration status
  const [migrasiStatus, setMigrasiStatus] = useState<'loading' | 'ok' | 'perlu' | 'error'>('loading');
  const [migrasiPesan, setMigrasiPesan] = useState('');
  const [migrasiRunning, setMigrasiRunning] = useState(false);

  useEffect(() => {
    fetch('/api/migrasi-jadwal')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.done) {
          setMigrasiStatus('ok');
        } else {
          setMigrasiStatus('perlu');
          setMigrasiPesan(data?.pesan || 'Perlu migrasi jadwal');
        }
      })
      .catch(() => setMigrasiStatus('error'));
  }, []);

  async function handleMigrasi() {
    setMigrasiRunning(true);
    setMigrasiPesan('Menjalankan migrasi...');
    try {
      const res = await fetch('/api/migrasi-jadwal', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMigrasiStatus('ok');
        setMigrasiPesan(data.pesan || 'Migrasi berhasil!');
        fetchData();
      } else {
        setMigrasiPesan(data.error || 'Gagal');
      }
    } catch {
      setMigrasiPesan('Gagal terhubung ke server');
    }
    setMigrasiRunning(false);
  }

  const wargaMap = new Map(wargaList.map(w => [w.id, w]));

  async function handleAdd() {
    if (!addHari || !addWargaId || submitting) return;
    setSubmitting('add');
    const res = await fetch('/api/jadwal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hari: addHari, warga_id: addWargaId, keterangan: addKet }),
    });
    setSubmitting(null);
    if (res.ok) {
      setShowAdd(false);
      setAddWargaId('');
      setAddKet('');
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || 'Gagal menambah');
    }
  }

  async function handleDelete(id: string) {
    if (submitting) return;
    if (!confirm('Yakin ingin menghapus jadwal ini?')) return;
    setSubmitting('delete');
    await fetch(`/api/jadwal/${id}`, { method: 'DELETE' });
    setSubmitting(null);
    fetchData();
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin');
  }

  // Group by hari with custom sort order (Senin first)
  const groupedJadwal: Record<string, Jadwal[]> = {};
  jadwalList.forEach(j => {
    if (!groupedJadwal[j.hari]) groupedJadwal[j.hari] = [];
    groupedJadwal[j.hari].push(j);
  });
  const sortedHari = DAFTAR_HARI.filter(h => groupedJadwal[h]);
  const hasData = sortedHari.length > 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="bg-[#1e3a8a] text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/dashboard')} className="text-white/80 hover:text-white p-1">
              <ArrowLeft size={20} />
            </button>
            <div>
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Admin</p>
              <h1 className="text-base font-black leading-tight">Jadwal Ronda</h1>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm font-bold border border-white/20">
            <LogOut size={16} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
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
              <p className="text-sm font-black text-amber-900 uppercase tracking-wide">Migrasi Jadwal Diperlukan</p>
              <p className="text-sm text-amber-800 font-medium mt-1">
                Sistem ini masih menggunakan struktur database lama (kolom "tanggal"). Klik tombol di samping untuk mengubah ke struktur baru (kolom "hari").
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

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-black text-slate-900">Jadwal Harian Tetap</p>
          <button onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 bg-green-700 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-green-800 active:scale-[0.97] transition-all"
            style={{ minHeight: '48px' }}>
            <Plus size={18} />
            <span className="hidden sm:inline">Tambah Jadwal</span>
          </button>
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-12">Memuat data...</p>
        ) : !hasData ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-5xl mb-4">📅</p>
            <p className="text-lg font-semibold">Belum ada jadwal ronda.</p>
            <p className="text-sm">Klik &quot;Tambah Jadwal&quot; untuk membuat jadwal baru.</p>
          </div>
        ) : (
          sortedHari.map(hari => {
            const items = groupedJadwal[hari];
            return (
              <div key={hari} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center gap-3">
                  <p className="font-black text-slate-800">{hari}</p>
                  <span className="text-xs text-slate-500 font-medium">({items.length} orang)</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map(j => {
                    const w = wargaMap.get(j.warga_id);
                    return (
                      <div key={j.id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate">{w?.nama || j.warga_id}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                            <span>{w?.dusun || '—'}</span>
                            {j.keterangan && <span className="truncate">— {j.keterangan}</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDelete(j.id)} disabled={submitting !== null}
                          className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl disabled:opacity-50 transition-all flex-shrink-0"
                          style={{ minHeight: '44px', minWidth: '44px' }}>
                          {submitting === 'delete' ? <span className="animate-spin">⏳</span> : <Trash2 size={18} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-auto space-y-4">
            <h3 className="text-xl font-black text-slate-900">Tambah Jadwal Ronda</h3>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Hari</label>
              <select value={addHari} onChange={e => setAddHari(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-base font-semibold"
                style={{ minHeight: '48px' }}>
                {DAFTAR_HARI.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Warga</label>
              <select value={addWargaId} onChange={e => setAddWargaId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-base font-semibold"
                style={{ minHeight: '48px' }}>
                <option value="">-- Pilih warga --</option>
                {wargaList.map(w => (
                  <option key={w.id} value={w.id}>{w.nama} ({w.dusun})</option>
                ))}
              </select>
            </div>

            

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Keterangan (opsional)</label>
              <input value={addKet} onChange={e => setAddKet(e.target.value)}
                placeholder="misal: pos 1"
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-base font-semibold"
                style={{ minHeight: '48px' }} />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} disabled={submitting === 'add'}
                className="flex-1 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-base"
                style={{ minHeight: '48px' }}>Batal</button>
              <button onClick={handleAdd} disabled={submitting === 'add'}
                className="flex-1 py-3 rounded-xl bg-green-700 text-white font-bold text-base disabled:opacity-60 transition-all"
                style={{ minHeight: '48px' }}>
                {submitting === 'add' ? '⏳ Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}