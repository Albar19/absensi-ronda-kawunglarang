'use client';

import { Clock, MapPin } from 'lucide-react';
import { StatusJam, StatusJarak } from '@/lib/types';
import { CONFIG } from '@/lib/config';

interface StatusCardsProps {
  statusJam: StatusJam | null;
  statusJarak: StatusJarak | null;
  jarakMeter: number | null;
  akurasiMeter?: number | null;
}

export default function StatusCards({ statusJam, statusJarak, jarakMeter, akurasiMeter }: StatusCardsProps) {
  const jamBuka = CONFIG.jamBukaAbsen.toString().padStart(2, '0') + ':' +
    CONFIG.menitBukaAbsen.toString().padStart(2, '0');
  const jamTutup = CONFIG.jamTutupAbsen.toString().padStart(2, '0') + ':' +
    CONFIG.menitTutupAbsen.toString().padStart(2, '0');

  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-2.5 sm:space-y-3">
      <div
        className={`w-full rounded-xl border-2 px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 ${
          statusJam === null
            ? 'bg-slate-100 border-slate-300'
            : statusJam === 'buka'
            ? 'bg-green-50 border-green-500'
            : 'bg-red-50 border-red-500'
        }`}
      >
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            statusJam === null
              ? 'bg-slate-300'
              : statusJam === 'buka'
              ? 'bg-green-600'
              : 'bg-red-600'
          }`}
        >
          <Clock size={18} className="sm:w-[22px] sm:h-[22px] text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-slate-500">
            Status Jam
          </p>
          {statusJam === null ? (
            <p className="text-base sm:text-lg font-bold text-slate-400">Memeriksa...</p>
          ) : statusJam === 'buka' ? (
            <>
              <p className="text-lg sm:text-xl font-black text-green-700 flex items-center gap-2">
                <span>🟢</span> BUKA
              </p>
              <p className="text-xs sm:text-sm text-green-700 font-medium truncate">
                Absen tersedia pukul {jamBuka} – {jamTutup} WIB
              </p>
            </>
          ) : (
            <>
              <p className="text-lg sm:text-xl font-black text-red-700 flex items-center gap-2">
                <span>🔴</span> DITUTUP
              </p>
              <p className="text-xs sm:text-sm text-red-700 font-medium truncate">
                Absen hanya pukul {jamBuka} – {jamTutup} WIB
              </p>
            </>
          )}
        </div>
      </div>

      <div
        className={`w-full rounded-xl border-2 px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 ${
          statusJarak === null || statusJarak === 'loading'
            ? 'bg-slate-100 border-slate-300'
            : statusJarak === 'dekat'
            ? 'bg-green-50 border-green-500'
            : statusJarak === 'error'
            ? 'bg-yellow-50 border-yellow-500'
            : 'bg-red-50 border-red-500'
        }`}
      >
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            statusJarak === null || statusJarak === 'loading'
              ? 'bg-slate-300'
              : statusJarak === 'dekat'
              ? 'bg-green-600'
              : statusJarak === 'error'
              ? 'bg-yellow-500'
              : 'bg-red-600'
          }`}
        >
          <MapPin size={18} className="sm:w-[22px] sm:h-[22px] text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-slate-500">
            Status Lokasi
          </p>
          {statusJarak === null || statusJarak === 'loading' ? (
            <p className="text-base sm:text-lg font-bold text-slate-400">
              Mendeteksi lokasi...
            </p>
          ) : statusJarak === 'dekat' ? (
            <>
              <p className="text-lg sm:text-xl font-black text-green-700 flex items-center gap-2">
                <span>🟢</span> BALE DESA
              </p>
              <p className="text-xs sm:text-sm text-green-700 font-medium">
                Jarak Anda: ± {jarakMeter} meter
              </p>
              {akurasiMeter != null && (
                <p className="text-[11px] sm:text-xs text-green-600 font-medium">
                  Akurasi GPS: ±{akurasiMeter}m
                </p>
              )}
            </>
          ) : statusJarak === 'error' ? (
            <>
              <p className="text-lg sm:text-xl font-black text-yellow-700 flex items-center gap-2">
                <span>⚠️</span> GPS TIDAK AKTIF
              </p>
              <p className="text-xs sm:text-sm text-yellow-700 font-medium">
                Izinkan akses lokasi di browser Anda
              </p>
            </>
          ) : (
            <>
              <p className="text-lg sm:text-xl font-black text-red-700 flex items-center gap-2">
                <span>🔴</span> TERLALU JAUH
              </p>
              <p className="text-xs sm:text-sm text-red-700 font-medium">
                Jarak Anda: ± {jarakMeter} meter (maks {CONFIG.radiusMeter}m)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}