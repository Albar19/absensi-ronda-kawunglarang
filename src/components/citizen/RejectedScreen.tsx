'use client';

import { XCircle, RefreshCw } from 'lucide-react';

interface RejectedScreenProps {
  pesanError: string;
  onRetry: () => void;
}

export default function RejectedScreen({ pesanError, onRetry }: RejectedScreenProps) {
  // Strip the leading "❌ ABSEN DITOLAK: " prefix for cleaner display
  const cleanMsg = pesanError.replace(/^❌\s*ABSEN DITOLAK:\s*/i, '');

  return (
    <div className="flex flex-col items-center px-4 sm:px-6 py-10 sm:py-14 text-center">
      {/* Icon */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-red-600 flex items-center justify-center mb-6 shadow-lg ring-4 ring-red-200">
        <XCircle size={52} className="text-white" strokeWidth={1.8} />
      </div>

      <h2 className="text-3xl sm:text-4xl font-black text-red-700 leading-tight">DITOLAK</h2>
      <p className="text-sm sm:text-base font-bold text-red-500 mt-1 mb-7">Absen tidak dapat diproses</p>

      {/* Error reason box */}
      <div className="w-full max-w-sm bg-red-50 border-2 border-red-400 rounded-2xl px-5 py-5 mb-6 text-left">
        <p className="text-xs font-black uppercase tracking-widest text-red-400 mb-1.5">Alasan Penolakan</p>
        <p className="text-base sm:text-lg font-bold text-red-900 leading-snug">{cleanMsg}</p>
      </div>

      {/* Retry */}
      <button
        type="button"
        onClick={onRetry}
        className="w-full max-w-sm bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
        style={{ minHeight: '60px' }}
      >
        <RefreshCw size={20} strokeWidth={2.5} />
        COBA LAGI
      </button>

      <p className="text-xs text-slate-400 mt-4 font-medium max-w-xs">
        Pastikan Anda berada di area Bale Desa dan GPS aktif saat melakukan absen.
      </p>
    </div>
  );
}