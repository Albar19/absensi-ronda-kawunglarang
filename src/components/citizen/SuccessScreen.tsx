'use client';

import { CheckCircle } from 'lucide-react';
import { AbsenRecord } from '@/lib/types';

interface SuccessScreenProps {
  record: AbsenRecord;
  onBack: () => void;
}

export default function SuccessScreen({ record, onBack }: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center px-4 sm:px-6 py-10 sm:py-14 text-center">
      {/* Check icon */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-green-600 flex items-center justify-center mb-6 shadow-lg ring-4 ring-green-200">
        <CheckCircle size={52} className="text-white" strokeWidth={1.8} />
      </div>

      <h2 className="text-3xl sm:text-4xl font-black text-green-700 leading-tight">BERHASIL ABSEN!</h2>
      <p className="text-sm sm:text-base text-green-600 font-semibold mt-1 mb-7">
        Kehadiran Anda telah tercatat malam ini
      </p>

      {/* Detail card */}
      <div className="w-full max-w-sm bg-white border-2 border-green-400 rounded-2xl overflow-hidden shadow-sm mb-6">
        {[
          { icon: '👤', label: 'Nama',     value: record.nama },
          { icon: '🏘️', label: 'Wilayah',  value: record.rt },
          { icon: '🕐', label: 'Jam Absen', value: `${record.jamAbsen} WIB` },
          { icon: '📍', label: 'Jarak',     value: `± ${record.jarakMeter} meter` },
        ].map((row, i, arr) => (
          <div key={row.label}>
            <div className="flex items-center gap-4 px-5 py-3.5">
              <span className="text-2xl w-8 text-center flex-shrink-0" role="img" aria-hidden>{row.icon}</span>
              <div className="min-w-0 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-green-500">{row.label}</p>
                <p className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">{row.value}</p>
              </div>
            </div>
            {i < arr.length - 1 && <div className="h-px bg-green-100 mx-5" />}
          </div>
        ))}
      </div>

      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="w-full max-w-sm bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-200 rounded-xl font-black text-base active:scale-[0.98] transition-all"
        style={{ minHeight: '54px' }}
      >
        ← Kembali ke Halaman Utama
      </button>
    </div>
  );
}