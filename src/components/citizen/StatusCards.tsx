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

type CardState = 'idle' | 'ok' | 'error' | 'warn';

function cardStyle(state: CardState) {
  switch (state) {
    case 'ok':   return 'bg-green-50  border-green-500';
    case 'error': return 'bg-red-50    border-red-500';
    case 'warn':  return 'bg-yellow-50 border-yellow-400';
    default:      return 'bg-slate-100 border-slate-200';
  }
}
function dotStyle(state: CardState) {
  switch (state) {
    case 'ok':    return 'bg-green-600';
    case 'error': return 'bg-red-600';
    case 'warn':  return 'bg-yellow-500';
    default:      return 'bg-slate-300';
  }
}

export default function StatusCards({ statusJam, statusJarak, jarakMeter, akurasiMeter }: StatusCardsProps) {
  const jamBuka  = `${String(CONFIG.jamBukaAbsen).padStart(2,'0')}:${String(CONFIG.menitBukaAbsen).padStart(2,'0')}`;
  const jamTutup = `${String(CONFIG.jamTutupAbsen).padStart(2,'0')}:${String(CONFIG.menitTutupAbsen).padStart(2,'0')}`;

  const jamState: CardState = statusJam === null ? 'idle' : statusJam === 'buka' ? 'ok' : 'error';
  const lokasiState: CardState =
    !statusJarak || statusJarak === 'loading' ? 'idle'
    : statusJarak === 'dekat' ? 'ok'
    : statusJarak === 'error' ? 'warn'
    : 'error';

  return (
    <div className="px-4 sm:px-5 pt-4 pb-2 space-y-3">
      {/* ── Status Jam ── */}
      <div className={`flex items-center gap-4 rounded-xl border-2 px-4 py-3.5 transition-colors ${cardStyle(jamState)}`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${dotStyle(jamState)}`}>
          <Clock size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-0.5">Status Jam</p>
          {statusJam === null ? (
            <p className="text-base font-bold text-slate-400 animate-pulse">Memeriksa jam…</p>
          ) : statusJam === 'buka' ? (
            <>
              <p className="text-lg font-black text-green-700 leading-tight">🟢 BUKA</p>
              <p className="text-xs font-semibold text-green-600 mt-0.5">Tersedia pukul {jamBuka} – {jamTutup} WIB</p>
            </>
          ) : (
            <>
              <p className="text-lg font-black text-red-700 leading-tight">🔴 DITUTUP</p>
              <p className="text-xs font-semibold text-red-600 mt-0.5">Hanya buka {jamBuka} – {jamTutup} WIB</p>
            </>
          )}
        </div>
      </div>

      {/* ── Status Lokasi ── */}
      <div className={`flex items-center gap-4 rounded-xl border-2 px-4 py-3.5 transition-colors ${cardStyle(lokasiState)}`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${dotStyle(lokasiState)}`}>
          <MapPin size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-0.5">Status Lokasi</p>
          {!statusJarak || statusJarak === 'loading' ? (
            <p className="text-base font-bold text-slate-400 animate-pulse">Mendeteksi GPS…</p>
          ) : statusJarak === 'dekat' ? (
            <>
              <p className="text-lg font-black text-green-700 leading-tight">🟢 BALE DESA</p>
              <p className="text-xs font-semibold text-green-600 mt-0.5">
                Jarak anda: ±{jarakMeter} m
                {akurasiMeter != null && ` · Akurasi GPS: ±${akurasiMeter} m`}
              </p>
            </>
          ) : statusJarak === 'error' ? (
            <>
              <p className="text-lg font-black text-yellow-700 leading-tight">⚠️ GPS TIDAK AKTIF</p>
              <p className="text-xs font-semibold text-yellow-600 mt-0.5">Izinkan akses lokasi di browser</p>
            </>
          ) : (
            <>
              <p className="text-lg font-black text-red-700 leading-tight">🔴 TERLALU JAUH</p>
              <p className="text-xs font-semibold text-red-600 mt-0.5">
                Jarak: ±{jarakMeter} m — maks {CONFIG.radiusMeter} m dari Bale Desa
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}