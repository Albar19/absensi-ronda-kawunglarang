'use client';

import { useEffect, useState } from 'react';
import { CONFIG } from '@/lib/config';

export default function HeaderBanner() {
  const [waktuSekarang, setWaktuSekarang] = useState('');
  const [tanggalSekarang, setTanggalSekarang] = useState('');

  useEffect(() => {
    function updateWaktu() {
      const now = new Date();
      const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const bulan = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];

      const namaHari = hari[now.getDay()];
      const tgl = now.getDate();
      const namaBulan = bulan[now.getMonth()];
      const tahun = now.getFullYear();

      const jam = now.getHours().toString().padStart(2, '0');
      const menit = now.getMinutes().toString().padStart(2, '0');
      const detik = now.getSeconds().toString().padStart(2, '0');

      setTanggalSekarang(`${namaHari}, ${tgl} ${namaBulan} ${tahun}`);
      setWaktuSekarang(`${jam}:${menit}:${detik} WIB`);
    }

    updateWaktu();
    const interval = setInterval(updateWaktu, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-[#1e3a8a] text-white w-full">
      {/* Top stripe */}
      <div className="h-1.5 bg-[#f59e0b] w-full" />

      <div className="px-5 py-5">
        {/* Logo + Title */}
        <div className="flex items-center gap-4">
          {/* Emblem placeholder */}
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center flex-shrink-0 border-2 border-[#f59e0b]">
            <span className="text-[#1e3a8a] font-black text-lg leading-none">🏛️</span>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-blue-200 leading-tight">
              Pemerintah Desa
            </p>
            <h1 className="text-xl font-black tracking-wide leading-tight text-white">
              {CONFIG.namaBalai}
            </h1>
            <p className="text-sm font-semibold text-[#f59e0b] tracking-wide mt-0.5">
              {CONFIG.subtitleAbsen}
            </p>
          </div>
        </div>

        {/* Date & Time */}
        <div className="mt-4 pt-4 border-t border-blue-700">
          <p className="text-base font-semibold text-blue-100 leading-tight">
            {tanggalSekarang || 'Memuat tanggal...'}
          </p>
          <p className="text-3xl font-black text-white tracking-widest mt-1 tabular-nums">
            {waktuSekarang || '--:--:-- WIB'}
          </p>
        </div>
      </div>

      {/* Bottom stripe */}
      <div className="h-1 bg-blue-900 w-full" />
    </header>
  );
}
