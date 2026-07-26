'use client';

import { Clock, MapPin } from 'lucide-react';
import { CONFIG } from '@/lib/config';
import { formatJamSesi } from '@/lib/data';

interface StatusCardsProps {
  statusJam: 'masuk' | 'pulang' | 'tutup' | null;
  statusJarak: 'dekat' | 'jauh' | 'loading' | 'error' | null;
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
  const jamState: CardState = statusJam === null ? 'idle' : statusJam === 'tutup' ? 'error' : 'ok';
  const lokasiState: CardState =
    !statusJarak || statusJarak === 'loading' ? 'idle'
    : statusJarak === 'dekat' ? 'ok'
    : statusJarak === 'error' ? 'warn'
    : 'error';

  const sesiLabel = statusJam === 'pulang' ? 'PULANG' : 'MASUK';

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
          ) : statusJam === 'tutup' ? (
            <>
              <p className="text-lg font-black text-red-700 leading-tight">🔴 DITUTUP</p>
              <p className="text-xs font-semibold text-red-600 mt-0.5">Sesi masuk 20:00–23:40 · Sesi pulang 23:40–01:00</p>
            </>
          ) : (
            <>
              <p className="text-lg font-black text-green-700 leading-tight">🟢 BUKA — SESI {sesiLabel}</p>
              <p className="text-xs font-semibold text-green-600 mt-0.5">{formatJamSesi(statusJam)}</p>
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