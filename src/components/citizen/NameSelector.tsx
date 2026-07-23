'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Warga } from '@/lib/types';

interface NameSelectorProps {
  onSubmit: (warga: Warga) => void;
  isSubmitting: boolean;
}

export default function NameSelector({ onSubmit, isSubmitting }: NameSelectorProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Warga | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [wargaList, setWargaList] = useState<Warga[]>([]);

  useEffect(() => {
    fetch('/api/warga')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setWargaList(data); })
      .catch(() => {});
  }, []);

  const filteredWarga = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return wargaList.filter(
      (w) =>
        w.nama.toLowerCase().includes(q) ||
        w.rt.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, wargaList]);

  function handleSelect(warga: Warga) {
    setSelected(warga);
    setQuery(warga.nama);
    setShowDropdown(false);
  }

  function handleInput(val: string) {
    setQuery(val);
    setSelected(null);
    setShowDropdown(true);
  }

  function handleSubmit() {
    if (!selected) return;
    onSubmit(selected);
  }

  return (
    <div className="px-3 sm:px-4 pb-6 sm:pb-8 space-y-4 sm:space-y-5">
      <div className="bg-[#eff6ff] border-2 border-[#1e3a8a] rounded-xl px-4 sm:px-5 py-3 sm:py-4">
        <p className="text-sm sm:text-base font-bold text-[#1e3a8a] leading-snug">
          📋 Silakan cari dan pilih nama Anda di bawah ini untuk melakukan absen.
        </p>
      </div>

      <div>
        <label htmlFor="cari-nama" className="block text-sm sm:text-base font-black text-slate-800 mb-2 tracking-wide uppercase">
          Pilih Nama Anda:
        </label>

        <div className="relative">
          <div className="relative flex items-center">
            <Search size={18} className="sm:w-[20px] sm:h-[20px] absolute left-3.5 sm:left-4 text-slate-400 flex-shrink-0" strokeWidth={2.5} />
            <input
              id="cari-nama"
              type="text"
              inputMode="text"
              autoComplete="off"
              placeholder="Ketik nama atau RT..."
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              onFocus={() => query && setShowDropdown(true)}
              className="w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-4 text-base sm:text-lg font-semibold border-2 border-slate-400 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none transition-colors"
              style={{ minHeight: '52px' }}
            />
          </div>

          {showDropdown && filteredWarga.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border-2 border-[#1e3a8a] rounded-xl mt-1 shadow-lg z-50 overflow-hidden">
              {filteredWarga.map((warga) => (
                <button
                  key={warga.id}
                  type="button"
                  onClick={() => handleSelect(warga)}
                  className="w-full text-left px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between border-b border-slate-100 last:border-0 hover:bg-blue-50 active:bg-blue-100 transition-colors"
                  style={{ minHeight: '52px' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">{warga.nama}</p>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">{warga.rt}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {query.length > 0 && filteredWarga.length === 0 && (
          <p className="text-sm sm:text-base text-slate-500 mt-2 px-1">
            Nama tidak ditemukan. Coba kata lain.
          </p>
        )}
        {query.length === 0 && (
          <p className="text-xs sm:text-sm text-slate-400 mt-2 px-1">
            Contoh: ketik &quot;Ahmad&quot; atau &quot;RT 02&quot;
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selected || isSubmitting}
        className={`w-full rounded-xl py-4 sm:py-5 text-lg sm:text-xl font-black text-white tracking-wide transition-all border-2 ${
          !selected
            ? 'bg-slate-300 border-slate-300 text-slate-500 cursor-not-allowed'
            : isSubmitting
            ? 'bg-[#1e3a8a] border-[#1e3a8a] opacity-70 cursor-wait'
            : 'bg-[#1e3a8a] border-[#1e3a8a] active:scale-[0.98] hover:bg-[#1e40af]'
        }`}
        style={{ minHeight: '56px' }}
      >
        {isSubmitting ? '⏳ Menyimpan...' : '✅ KIRIM ABSEN'}
      </button>

      {selected && (
        <p className="text-center text-sm sm:text-base text-slate-600 font-semibold">
          Akan absen sebagai: <strong className="text-slate-900">{selected.nama}</strong> ({selected.rt})
        </p>
      )}
    </div>
  );
}