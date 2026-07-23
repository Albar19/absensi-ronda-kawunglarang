'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, X, Check, ArrowLeft, LogOut } from 'lucide-react';
import { formatTanggalIndo, getTanggalHariIni } from '@/lib/data';

interface Warga {
  id: string;
  nama: string;
  rt: string;
  created_at: string;
}

const RT_LIST = ['RT 01', 'RT 02', 'RT 03', 'RT 04'];

export default function AdminWargaPage() {
  const router = useRouter();
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editRt, setEditRt] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addId, setAddId] = useState('');
  const [addNama, setAddNama] = useState('');
  const [addRt, setAddRt] = useState('RT 01');
  const [submitting, setSubmitting] = useState<'add' | 'edit' | 'delete' | null>(null);

  async function fetchWarga() {
    const res = await fetch('/api/warga');
    if (res.status === 401) { router.replace('/admin'); return; }
    setWargaList(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWarga();
  }, []);

  async function handleAdd() {
    if (!addId || !addNama || submitting) return;
    setSubmitting('add');
    const res = await fetch('/api/warga', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: addId.trim(), nama: addNama.trim(), rt: addRt }),
    });
    setSubmitting(null);
    if (res.ok) {
      setShowAdd(false);
      setAddId('');
      setAddNama('');
      fetchWarga();
    } else {
      const data = await res.json();
      alert(data.error || 'Gagal menambah');
    }
  }

  async function handleEdit(id: string) {
    if (submitting) return;
    setSubmitting('edit');
    const res = await fetch(`/api/warga/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: editNama.trim(), rt: editRt }),
    });
    setSubmitting(null);
    if (res.ok) {
      setEditingId(null);
      fetchWarga();
    }
  }

  async function handleDelete(id: string) {
    if (submitting) return;
    if (!confirm('Yakin ingin menghapus warga ini?')) return;
    setSubmitting('delete');
    await fetch(`/api/warga/${id}`, { method: 'DELETE' });
    setSubmitting(null);
    fetchWarga();
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin');
  }

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
              <h1 className="text-base font-black leading-tight">Data Warga</h1>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm font-bold border border-white/20">
            <LogOut size={16} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-black text-slate-900">{formatTanggalIndo(getTanggalHariIni())}</p>
          <button onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 bg-green-700 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-green-800 active:scale-[0.97] transition-all"
            style={{ minHeight: '48px' }}>
            <Plus size={18} />
            <span className="hidden sm:inline">Tambah Warga</span>
          </button>
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-12">Memuat data...</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-sm min-w-[500px]">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300">
                  <th className="text-left px-4 py-3 font-black text-slate-700 text-xs uppercase w-12">No</th>
                  <th className="text-left px-4 py-3 font-black text-slate-700 text-xs uppercase">ID</th>
                  <th className="text-left px-4 py-3 font-black text-slate-700 text-xs uppercase">Nama</th>
                  <th className="text-left px-4 py-3 font-black text-slate-700 text-xs uppercase w-20">RT</th>
                  <th className="text-center px-4 py-3 font-black text-slate-700 text-xs uppercase w-28">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {wargaList.map((w, i) => (
                  <tr key={w.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 font-semibold">{i + 1}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{w.id}</td>
                    {editingId === w.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input value={editNama} onChange={e => setEditNama(e.target.value)}
                            className="w-full px-3 py-2.5 border-2 border-blue-500 rounded-lg text-sm font-semibold"
                            style={{ minHeight: '44px' }} />
                        </td>
                        <td className="px-4 py-2">
                          <select value={editRt} onChange={e => setEditRt(e.target.value)}
                            className="w-full px-3 py-2.5 border-2 border-blue-500 rounded-lg text-sm font-semibold"
                            style={{ minHeight: '44px' }}>
                            {RT_LIST.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleEdit(w.id)} disabled={submitting === 'edit'}
                              className="p-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-all"
                              style={{ minHeight: '44px', minWidth: '44px' }}>
                              {submitting === 'edit' ? <span className="animate-spin">⏳</span> : <Check size={18} />}
                            </button>
                            <button onClick={() => setEditingId(null)} disabled={submitting !== null}
                              className="p-2.5 bg-slate-400 text-white rounded-xl hover:bg-slate-500 disabled:opacity-50 transition-all"
                              style={{ minHeight: '44px', minWidth: '44px' }}>
                              <X size={18} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-bold text-slate-900 break-words">{w.nama}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{w.rt}</td>
                        <td className="px-4 py-2">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => { setEditingId(w.id); setEditNama(w.nama); setEditRt(w.rt); }}
                              disabled={submitting !== null}
                              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
                              style={{ minHeight: '44px', minWidth: '44px' }}>
                              <Pencil size={18} />
                            </button>
                            <button onClick={() => handleDelete(w.id)} disabled={submitting !== null}
                              className="p-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all"
                              style={{ minHeight: '44px', minWidth: '44px' }}>
                              {submitting === 'delete' ? <span className="animate-spin">⏳</span> : <Trash2 size={18} />}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-auto space-y-4">
            <h3 className="text-xl font-black text-slate-900">Tambah Warga Baru</h3>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">ID</label>
              <input value={addId} onChange={e => setAddId(e.target.value)}
                placeholder="contoh: rt01-011"
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-base font-semibold"
                style={{ minHeight: '48px' }} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nama</label>
              <input value={addNama} onChange={e => setAddNama(e.target.value)}
                placeholder="Nama lengkap"
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-base font-semibold"
                style={{ minHeight: '48px' }} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">RT</label>
              <select value={addRt} onChange={e => setAddRt(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-base font-semibold"
                style={{ minHeight: '48px' }}>
                {RT_LIST.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
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