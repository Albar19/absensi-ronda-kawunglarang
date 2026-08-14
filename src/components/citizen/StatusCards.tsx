'use client';

import { Clock, MapPin, CheckCircle2 } from 'lucide-react';
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
    <div className="pt-4 pb-2 space-y-3">
      {/* ── Waktu Absen ── */}
      <div className={`flex items-center gap-4 rounded-xl border-2 px-4 py-3.5 transition-colors shadow-card ${cardStyle(jamState)}`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${dotStyle(jamState)}`}>
          <Clock size={20} className="text-white" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-0.5">Waktu Absen</p>
          {statusJam === null ? (
            <p className="text-base font-bold text-slate-400 animate-pulse">Memeriksa waktu…</p>
          ) : statusJam === 'tutup' ? (
            <>
              <p className="text-lg font-black text-red-700 leading-tight">BELUM/TIDAK BUKA</p>
              <p className="text-xs font-semibold text-red-600 mt-0.5">Masuk 20:00–22:00 · Pulang 23:00–23:59</p>
            </>
          ) : (
            <>
              <p className="text-lg font-black text-green-700 leading-tight">BUKA — SESI {sesiLabel}</p>
              <p className="text-xs font-semibold text-green-600 mt-0.5">{formatJamSesi(statusJam)}</p>
            </>
          )}
        </div>
      </div>

      {/* ── Lokasi Anda ── */}
      <div className={`flex items-center gap-4 rounded-xl border-2 px-4 py-3.5 transition-colors shadow-card ${cardStyle(lokasiState)}`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${dotStyle(lokasiState)}`}>
          <MapPin size={20} className="text-white" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-0.5">Lokasi Anda</p>
          {!statusJarak || statusJarak === 'loading' ? (
            <p className="text-base font-bold text-slate-400 animate-pulse">Mencari lokasi Anda…</p>
          ) : statusJarak === 'dekat' ? (
            <>
              <p className="text-lg font-black text-green-700 leading-tight flex items-center gap-1.5">
                LOKASI SESUAI
                <CheckCircle2 size={18} className="text-green-600" strokeWidth={2.5} />
              </p>
              <p className="text-xs font-semibold text-green-600 mt-0.5">
                Anda berada dalam area Bale Desa (±{jarakMeter} m)
                {akurasiMeter != null && akurasiMeter > 0 && ` · Sinyal lokasi: ±${akurasiMeter} m`}
              </p>
            </>
          ) : statusJarak === 'error' ? (
            <>
              <p className="text-lg font-black text-yellow-700 leading-tight">LOKASI TIDAK TERDETEKSI</p>
              <p className="text-xs font-semibold text-yellow-600 mt-0.5">Izinkan akses lokasi di browser, lalu coba lagi</p>
            </>
          ) : (
            <>
              <p className="text-lg font-black text-red-700 leading-tight">TERLALU JAUH</p>
              <p className="text-xs font-semibold text-red-600 mt-0.5">
                Anda berjarak ±{jarakMeter} m — harus berada dalam radius {CONFIG.radiusMeter} m dari Bale Desa
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
