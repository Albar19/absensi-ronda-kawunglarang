'use client';

import { useEffect, useState } from 'react';
import { CONFIG } from '@/lib/config';

export default function HeaderBanner() {
  const [waktu, setWaktu] = useState('');
  const [tanggal, setTanggal] = useState('');

  useEffect(() => {
    const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
                   'Juli','Agustus','September','Oktober','November','Desember'];
    function tick() {
      const now = new Date();
      setTanggal(`${HARI[now.getDay()]}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`);
      setWaktu(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} WIB`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="w-full bg-[#1e3a8a] text-white">
      {/* Gold top stripe */}
      <div className="h-1.5 bg-[#f59e0b]" />

      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        {/* ─── Identity row ─── */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Emblem */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-[#f59e0b] flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-xl sm:text-2xl leading-none" role="img" aria-label="balai desa">🏛️</span>
          </div>

          {/* Title block */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase text-blue-300 leading-tight">
              Pemerintah Desa
            </p>
            <h1 className="text-base sm:text-xl font-black tracking-wide leading-tight text-white truncate">
              {CONFIG.namaBalai}
            </h1>
            <p className="text-[11px] sm:text-sm font-bold text-[#f59e0b] tracking-wide mt-0.5 truncate">
              {CONFIG.subtitleAbsen}
            </p>
          </div>
        </div>

        {/* ─── Date/time row ─── */}
        <div className="mt-3 pt-3 border-t border-blue-700/60 flex items-end justify-between gap-4">
          <p className="text-sm sm:text-base font-semibold text-blue-200 leading-tight">
            {tanggal || 'Memuat…'}
          </p>
          <p className="text-2xl sm:text-3xl font-black tracking-widest tabular-nums text-white flex-shrink-0">
            {waktu || '--:--:--'}
          </p>
        </div>
      </div>

      {/* Shadow underline */}
      <div className="h-0.5 bg-blue-900/80" />
    </header>
  );
}