'use client';

import { CheckCircle, Moon, Sunrise, User, Building2, Clock, MapPin, Plus, ArrowRight } from 'lucide-react';
import { AbsenRecord } from '@/lib/types';

interface SuccessScreenProps {
  records: AbsenRecord[];
  onBack: () => void;
  onTambahNama?: () => void;
  onLanjutPulang?: () => void;
}

export default function SuccessScreen({ records, onBack, onTambahNama, onLanjutPulang }: SuccessScreenProps) {
  const jenisAbsen = records[0]?.jenisAbsen ?? 'masuk';
  const labelSesi = jenisAbsen === 'pulang' ? 'PULANG' : 'MASUK';
  const IconSesi = jenisAbsen === 'pulang' ? Sunrise : Moon;

  return (
    <div className="flex flex-col items-center px-4 sm:px-6 py-10 sm:py-14 text-center">
      {/* Check icon */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-green-600 flex items-center justify-center mb-6 shadow-elevated ring-4 ring-green-200">
        <CheckCircle size={52} className="text-white" strokeWidth={2} />
      </div>

      <h2 className="text-3xl sm:text-4xl font-black text-green-700 leading-tight">
        BERHASIL ABSEN!
      </h2>
      <p className="text-sm sm:text-base text-green-600 font-semibold mt-1 mb-7">
        {records.length > 1
          ? `${records.length} orang berhasil tercatat ${jenisAbsen === 'pulang' ? 'pulang' : 'masuk'} malam ini`
          : `Kehadiran ${records[0].nama} telah tercatat malam ini`}
      </p>

      {/* Daftar nama */}
      <div className="w-full max-w-sm bg-white border-2 border-green-400 rounded-2xl overflow-hidden shadow-card mb-6">
        {/* Header ringkasan */}
        <div className="flex items-center gap-4 px-5 py-3.5 border-b border-green-100">
          <div className="w-8 flex justify-center flex-shrink-0">
            <IconSesi size={20} className="text-green-600" strokeWidth={2} />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-green-500">Sesi {labelSesi}</p>
            <p className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
              {records.length} peserta tercatat
            </p>
          </div>
        </div>

        {/* Detail tiap orang */}
        {records.map((r, i) => (
          <div key={`${r.nama}-${i}`} className="px-5 py-3.5">
            <div className="flex items-center gap-4">
              <div className="w-8 flex justify-center flex-shrink-0">
                <User size={20} className="text-green-600" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">{r.nama}</p>
                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 flex-wrap">
                  <span className="inline-flex items-center gap-1"><Building2 size={12} /> {r.dusun}</span>
                  <span className="inline-flex items-center gap-1"><Clock size={12} /> {r.jamAbsen} WIB</span>
                  <span className="inline-flex items-center gap-1"><MapPin size={12} /> ±{r.jarakMeter}m</span>
                </p>
              </div>
            </div>
            {i < records.length - 1 && <div className="h-px bg-green-100 mx-8 mt-3.5" />}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-sm space-y-3">
        {onLanjutPulang && jenisAbsen === 'masuk' && (
          <button
            type="button"
            onClick={onLanjutPulang}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{ minHeight: '54px' }}
          >
            LANJUT ABSEN PULANG <ArrowRight size={20} strokeWidth={2.5} />
          </button>
        )}

        {onTambahNama && jenisAbsen === 'masuk' && (
          <button
            type="button"
            onClick={onTambahNama}
            className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-xl font-black text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{ minHeight: '54px' }}
          >
            <Plus size={20} strokeWidth={2.5} /> Tambah Nama Lainnya
          </button>
        )}

        <button
          type="button"
          onClick={onBack}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-200 rounded-xl font-black text-base active:scale-[0.98] transition-all"
          style={{ minHeight: '54px' }}
        >
          Kembali ke Halaman Utama
        </button>
      </div>
    </div>
  );
}
