'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

interface RejectedScreenProps {
  pesanError: string;
  onRetry: () => void;
}

export default function RejectedScreen({ pesanError, onRetry }: RejectedScreenProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-5 py-8 text-center">
      {/* Big red icon */}
      <div className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center mb-6 shadow-md">
        <AlertCircle size={52} className="text-white" strokeWidth={2} />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-black text-red-700 mb-4 leading-tight">
        ABSEN DITOLAK
      </h2>

      {/* Error box */}
      <div className="w-full bg-red-50 border-2 border-red-500 rounded-xl px-5 py-5 mb-8">
        <p className="text-lg font-bold text-red-800 leading-snug">
          {pesanError}
        </p>
      </div>

      {/* Retry button */}
      <button
        type="button"
        onClick={onRetry}
        className="w-full bg-slate-800 text-white rounded-xl py-5 text-xl font-black flex items-center justify-center gap-3 active:scale-[0.98] transition-transform border-2 border-slate-800"
        style={{ minHeight: '64px' }}
      >
        <RefreshCw size={24} strokeWidth={2.5} />
        COBA LAGI
      </button>

      <p className="text-sm text-slate-500 mt-4 font-medium">
        Pastikan Anda berada di Bale Desa saat melakukan absen.
      </p>
    </div>
  );
}
