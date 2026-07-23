'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ChevronDown, AlertCircle } from 'lucide-react';
import { Warga } from '@/lib/types';
import { cekLockHP } from '@/lib/data';

interface NameSelectorProps {
  onSubmit: (warga: Warga) => void;
  isSubmitting: boolean;
}

export default function NameSelector({ onSubmit, isSubmitting }: NameSelectorProps) {
const [query, setQuery]           = useState('');
const [selected, setSelected]     = useState<Warga | null>(null);
const [showDropdown, setShowDropdown] = useState(false);
const [lockError, setLockError]   = useState<string | null>(null);
  const [wargaList, setWargaList]   = useState<Warga[]>([]);
  const [jadwalToday, setJadwalToday] = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/warga').then(r => r.ok ? r.json() : []),
      fetch('/api/jadwal/hari-ini').then(r => r.ok ? r.json() : []),
    ])
      .then(([warga, jadwalIds]: [Warga[], string[]]) => {
        setWargaList(warga);
        setJadwalToday(jadwalIds);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const wargaRonda = useMemo(() => {
    return wargaList.filter(w => jadwalToday.includes(w.id));
  }, [wargaList, jadwalToday]);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return wargaRonda.filter(w =>
      w.nama.toLowerCase().includes(q) || w.rt.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, wargaRonda]);

  function handleSelect(w: Warga) {
    const lock = cekLockHP(w.id);
    if (!lock.ok) {
      setLockError(lock.pesan!);
      return;
    }
    setSelected(w);
    setQuery(w.nama);
    setShowDropdown(false);
    setLockError(null);
    inputRef.current?.blur();
  }

  return (
    <div className="px-4 sm:px-5 pb-8 space-y-4">
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-6">
          <p className="text-slate-400 text-base font-semibold">Memuat data...</p>
        </div>
      )}

      {!loading && wargaRonda.length === 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
          <AlertCircle size={22} className="flex-shrink-0 mt-0.5 text-amber-600" />
          <p className="text-sm sm:text-base font-semibold text-amber-800 leading-snug">
            Belum ada jadwal ronda untuk hari ini. Silakan hubungi petugas.
          </p>
        </div>
      )}

      {!loading && wargaRonda.length > 0 && (
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3.5">
        <span className="text-xl flex-shrink-0 mt-0.5">📋</span>
        <p className="text-sm sm:text-base font-semibold text-blue-800 leading-snug">
          Cari dan pilih nama Anda di bawah ini, lalu tekan <strong>KIRIM ABSEN</strong>.
        </p>
      </div>
      )}

      {/* Search input */}
      <div>
        <label htmlFor="cari-nama" className="block text-xs font-black tracking-widest uppercase text-slate-500 mb-2">
          Pilih Nama Anda
        </label>

        <div className="relative" ref={dropRef}>
          {/* Input */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              id="cari-nama"
              type="text"
              inputMode="text"
              autoComplete="off"
              placeholder="Ketik nama atau RT…"
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null); setLockError(null); setShowDropdown(true); }}
              onFocus={() => query && setShowDropdown(true)}
              className="w-full pl-11 pr-10 py-4 text-base sm:text-lg font-semibold border-2 border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none transition-colors"
              style={{ minHeight: '56px' }}
            />
            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Dropdown */}
          {showDropdown && filtered.length > 0 && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border-2 border-[#1e3a8a] rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
              {filtered.map((w, i) => (
                <button
                  key={w.id}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); handleSelect(w); }}
                  className={`w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-blue-50 active:bg-blue-100 transition-colors ${i < filtered.length - 1 ? 'border-b border-slate-100' : ''}`}
                  style={{ minHeight: '56px' }}
                >
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900 truncate leading-tight">{w.nama}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{w.rt}</p>
                  </div>
                  <span className="text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md flex-shrink-0">{w.rt}</span>
                </button>
              ))}
            </div>
          )}

          {/* Empty result */}
          {showDropdown && query.length > 0 && filtered.length === 0 && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border-2 border-slate-200 rounded-xl shadow-lg z-50 px-4 py-4 text-center">
              <p className="text-sm font-semibold text-slate-500">Nama tidak ditemukan. Coba kata lain.</p>
            </div>
          )}
        </div>

        {/* Hint */}
        {!query && wargaRonda.length > 0 && (
          <p className="text-xs text-slate-400 mt-2 px-1">Contoh: ketik &quot;Ahmad&quot; atau &quot;RT 02&quot;</p>
        )}
      </div>

      {/* Lock error */}
      {lockError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-300 rounded-xl px-4 py-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5 text-red-600" />
          <p className="text-sm font-bold text-red-800 leading-snug">{lockError}</p>
        </div>
      )}

      {/* Selected confirmation chip */}
      {selected && !lockError && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-300 rounded-xl px-4 py-3">
          <span className="text-xl">✅</span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-green-600">Dipilih</p>
            <p className="text-base font-black text-green-900 leading-tight truncate">{selected.nama}</p>
            <p className="text-xs font-semibold text-green-700">{selected.rt}</p>
          </div>
        </div>
      )}

      {/* Submit button */}
      {wargaRonda.length > 0 && (
      <button
        type="button"
        onClick={() => selected && onSubmit(selected)}
        disabled={!selected || isSubmitting}
        className={`w-full rounded-xl text-xl font-black text-white tracking-wide transition-all ${
          !selected
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : isSubmitting
            ? 'bg-[#1e3a8a] opacity-70 cursor-wait'
            : 'bg-[#1e3a8a] hover:bg-[#1e40af] active:scale-[0.98]'
        }`}
        style={{ minHeight: '64px' }}
      >
        {isSubmitting ? '⏳ Menyimpan…' : '✅ KIRIM ABSEN'}
      </button>
      )}
    </div>
  );
}