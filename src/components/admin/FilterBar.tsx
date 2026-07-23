'use client';

import { FilterType } from '@/lib/types';

interface FilterBarProps {
  activeFilter: FilterType;
  onChange: (f: FilterType) => void;
  countSemua: number;
  countSudah: number;
  countBelum: number;
}

const FILTERS: { key: FilterType; label: string; color: string; activeColor: string }[] = [
  {
    key: 'semua',
    label: 'Semua',
    color: 'bg-white text-slate-700 border-slate-300',
    activeColor: 'bg-slate-800 text-white border-slate-800',
  },
  {
    key: 'sudah',
    label: 'Sudah Absen',
    color: 'bg-white text-green-700 border-green-400',
    activeColor: 'bg-green-700 text-white border-green-700',
  },
  {
    key: 'belum',
    label: 'Belum Absen',
    color: 'bg-white text-red-700 border-red-400',
    activeColor: 'bg-red-700 text-white border-red-700',
  },
];

export default function FilterBar({
  activeFilter,
  onChange,
  countSemua,
  countSudah,
  countBelum,
}: FilterBarProps) {
  const counts: Record<FilterType, number> = {
    semua: countSemua,
    sudah: countSudah,
    belum: countBelum,
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => onChange(f.key)}
          className={`px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all ${
            activeFilter === f.key ? f.activeColor : f.color
          }`}
          style={{ minHeight: '40px' }}
        >
          {f.label}{' '}
          <span className={`ml-1 text-xs font-black tabular-nums ${
            activeFilter === f.key ? 'opacity-90' : 'opacity-70'
          }`}>
            ({counts[f.key]})
          </span>
        </button>
      ))}
    </div>
  );
}
