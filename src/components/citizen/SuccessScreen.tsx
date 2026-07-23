'use client';

import { CheckCircle } from 'lucide-react';
import { AbsenRecord } from '@/lib/types';

interface SuccessScreenProps {
  record: AbsenRecord;
  onBack: () => void;
}

export default function SuccessScreen({ record, onBack }: SuccessScreenProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 sm:px-5 py-8 sm:py-12 text-center">
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-green-600 flex items-center justify-center mb-5 sm:mb-6 shadow-md">
        <CheckCircle size={52} className="sm:w-[64px] sm:h-[64px] text-white" strokeWidth={1.8} />
      </div>

      <h2 className="text-2xl sm:text-3xl font-black text-green-700 mb-1 sm:mb-2 leading-tight">
        BERHASIL ABSEN!
      </h2>
      <p className="text-sm sm:text-base text-green-700 font-semibold mb-5 sm:mb-6">
        Kehadiran Anda telah tercatat
      </p>

      <div className="w-full bg-green-50 border-2 border-green-500 rounded-xl px-4 sm:px-5 py-5 sm:py-6 mb-6 sm:mb-8 space-y-3 sm:space-y-4 text-left">
        <div className="flex items-start gap-3">
          <span className="text-xl sm:text-2xl">👤</span>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-green-600">Nama</p>
            <p className="text-lg sm:text-xl font-black text-green-900 leading-tight truncate">{record.nama}</p>
          </div>
        </div>
        <div className="border-t border-green-200" />
        <div className="flex items-start gap-3">
          <span className="text-xl sm:text-2xl">🏘️</span>
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-green-600">Wilayah</p>
            <p className="text-lg sm:text-xl font-black text-green-900">{record.rt}</p>
          </div>
        </div>
        <div className="border-t border-green-200" />
        <div className="flex items-start gap-3">
          <span className="text-xl sm:text-2xl">🕐</span>
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-green-600">Jam Absen</p>
            <p className="text-lg sm:text-xl font-black text-green-900 tabular-nums">{record.jamAbsen} WIB</p>
          </div>
        </div>
        <div className="border-t border-green-200" />
        <div className="flex items-start gap-3">
          <span className="text-xl sm:text-2xl">📍</span>
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-green-600">Jarak</p>
            <p className="text-lg sm:text-xl font-black text-green-900">± {record.jarakMeter} meter</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="w-full bg-slate-100 text-slate-800 border-2 border-slate-300 rounded-xl py-4 sm:py-5 text-base sm:text-lg font-black active:scale-[0.98] transition-transform"
        style={{ minHeight: '52px' }}
      >
        ← Kembali ke Halaman Utama
      </button>
    </div>
  );
}