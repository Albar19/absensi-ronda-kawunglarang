'use client';

import { CheckCircle } from 'lucide-react';
import { AbsenRecord } from '@/lib/types';

interface SuccessScreenProps {
  record: AbsenRecord;
  onBack: () => void;
}

export default function SuccessScreen({ record, onBack }: SuccessScreenProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-5 py-8 text-center">
      {/* Big green check */}
      <div className="w-28 h-28 rounded-full bg-green-600 flex items-center justify-center mb-6 shadow-md">
        <CheckCircle size={64} className="text-white" strokeWidth={1.8} />
      </div>

      {/* Title */}
      <h2 className="text-3xl font-black text-green-700 mb-2 leading-tight">
        BERHASIL ABSEN!
      </h2>
      <p className="text-base text-green-700 font-semibold mb-6">
        Kehadiran Anda telah tercatat
      </p>

      {/* Detail box */}
      <div className="w-full bg-green-50 border-2 border-green-500 rounded-xl px-5 py-6 mb-8 space-y-4 text-left">
        <div className="flex items-start gap-3">
          <span className="text-2xl">👤</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-600">Nama</p>
            <p className="text-xl font-black text-green-900 leading-tight">{record.nama}</p>
          </div>
        </div>
        <div className="border-t border-green-200" />
        <div className="flex items-start gap-3">
          <span className="text-2xl">🏘️</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-600">Wilayah</p>
            <p className="text-xl font-black text-green-900">{record.rt}</p>
          </div>
        </div>
        <div className="border-t border-green-200" />
        <div className="flex items-start gap-3">
          <span className="text-2xl">🕐</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-600">Jam Absen</p>
            <p className="text-xl font-black text-green-900 tabular-nums">{record.jamAbsen} WIB</p>
          </div>
        </div>
        <div className="border-t border-green-200" />
        <div className="flex items-start gap-3">
          <span className="text-2xl">📍</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-600">Jarak</p>
            <p className="text-xl font-black text-green-900">± {record.jarakMeter} meter</p>
          </div>
        </div>
      </div>

      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="w-full bg-slate-100 text-slate-800 border-2 border-slate-300 rounded-xl py-5 text-lg font-black active:scale-[0.98] transition-transform"
        style={{ minHeight: '60px' }}
      >
        ← Kembali ke Halaman Utama
      </button>
    </div>
  );
}
