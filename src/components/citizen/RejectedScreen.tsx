'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

interface RejectedScreenProps {
  pesanError: string;
  onRetry: () => void;
}

export default function RejectedScreen({ pesanError, onRetry }: RejectedScreenProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 sm:px-5 py-8 sm:py-12 text-center">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-600 flex items-center justify-center mb-5 sm:mb-6 shadow-md">
        <AlertCircle size={44} className="sm:w-[52px] sm:h-[52px] text-white" strokeWidth={2} />
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-red-700 mb-3 sm:mb-4 leading-tight">
        ABSEN DITOLAK
      </h2>

      <div className="w-full bg-red-50 border-2 border-red-500 rounded-xl px-4 sm:px-5 py-4 sm:py-5 mb-6 sm:mb-8">
        <p className="text-base sm:text-lg font-bold text-red-800 leading-snug">
          {pesanError}
        </p>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="w-full bg-slate-800 text-white rounded-xl py-4 sm:py-5 text-lg sm:text-xl font-black flex items-center justify-center gap-3 active:scale-[0.98] transition-transform border-2 border-slate-800"
        style={{ minHeight: '56px' }}
      >
        <RefreshCw size={20} className="sm:w-[24px] sm:h-[24px]" strokeWidth={2.5} />
        COBA LAGI
      </button>

      <p className="text-xs sm:text-sm text-slate-500 mt-4 font-medium px-4">
        Pastikan Anda berada di Bale Desa saat melakukan absen.
      </p>
    </div>
  );
}