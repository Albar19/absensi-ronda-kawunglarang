'use client';

import { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import { CONFIG } from '@/lib/config';
import { HARI_INDONESIA, BULAN_INDONESIA } from '@/lib/data';

export default function HeaderBanner() {
  const [waktu, setWaktu] = useState('');
  const [tanggal, setTanggal] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTanggal(`${HARI_INDONESIA[now.getDay()]}, ${now.getDate()} ${BULAN_INDONESIA[now.getMonth()]} ${now.getFullYear()}`);
      setWaktu(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} WIB`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="w-full bg-navy text-white">
      {/* Gold top stripe */}
      <div className="h-1.5 bg-gold" />

      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        {/* ─── Identity row ─── */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Emblem */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-gold flex items-center justify-center flex-shrink-0 shadow-sm">
            <Landmark size={24} className="text-navy" strokeWidth={2} />
          </div>

          {/* Title block */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase text-blue-300 leading-tight">
              Pemerintah Desa
            </p>
            <h1 className="text-base sm:text-xl font-black tracking-wide leading-tight text-white truncate">
              {CONFIG.namaBalai}
            </h1>
            <p className="text-[11px] sm:text-sm font-bold text-gold tracking-wide mt-0.5 truncate">
              {CONFIG.subtitleAbsen}
            </p>
          </div>
        </div>

        {/* ─── Date / Time row ─── */}
        <div className="mt-3 pt-3 border-t border-blue-700/60 flex items-center justify-between gap-3">
          <p className="text-sm sm:text-base font-bold text-blue-200 min-w-0 truncate">
            {tanggal || 'Memuat...'}
          </p>
          <p className="text-sm sm:text-base font-bold tabular-nums text-white flex-shrink-0">
            {waktu || '--:--:--'}
          </p>
        </div>
      </div>

      {/* Shadow underline */}
      <div className="h-0.5 bg-blue-900/80" />
    </header>
  );
}
