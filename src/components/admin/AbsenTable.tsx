'use client';

import { AbsenRecord } from '@/lib/types';
import { Warga } from '@/lib/types';
import { CheckCircle, XCircle } from 'lucide-react';

interface AbsenTableProps {
  wargaList: Warga[];
  absenHariIni: AbsenRecord[];
  filter: 'semua' | 'sudah' | 'belum';
}

export default function AbsenTable({ wargaList, absenHariIni, filter }: AbsenTableProps) {
  // Build a map of wargaId -> record
  const absenMap = new Map<string, AbsenRecord>();
  absenHariIni.forEach((r) => absenMap.set(r.wargaId, r));

  // Apply filter
  const filteredWarga = wargaList.filter((w) => {
    const hadir = absenMap.has(w.id);
    if (filter === 'sudah') return hadir;
    if (filter === 'belum') return !hadir;
    return true;
  });

  if (filteredWarga.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p className="text-lg font-semibold">Tidak ada data untuk ditampilkan.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100 border-b-2 border-slate-300">
            <th className="text-left px-4 py-3 font-black text-slate-700 text-xs uppercase tracking-wider whitespace-nowrap">No</th>
            <th className="text-left px-4 py-3 font-black text-slate-700 text-xs uppercase tracking-wider">Nama</th>
            <th className="text-left px-4 py-3 font-black text-slate-700 text-xs uppercase tracking-wider whitespace-nowrap">RT</th>
            <th className="text-left px-4 py-3 font-black text-slate-700 text-xs uppercase tracking-wider whitespace-nowrap">Jam Absen</th>
            <th className="text-left px-4 py-3 font-black text-slate-700 text-xs uppercase tracking-wider whitespace-nowrap">Jarak (m)</th>
            <th className="text-left px-4 py-3 font-black text-slate-700 text-xs uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredWarga.map((warga, index) => {
            const record = absenMap.get(warga.id);
            const hadir = !!record;

            return (
              <tr
                key={warga.id}
                className={`border-b border-slate-100 transition-colors ${
                  hadir ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <td className="px-4 py-3 text-slate-500 font-semibold tabular-nums">
                  {index + 1}
                </td>
                <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                  {warga.nama}
                </td>
                <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap">
                  {warga.rt}
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold text-slate-700 whitespace-nowrap">
                  {record ? record.jamAbsen : '—'}
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold text-slate-700 whitespace-nowrap">
                  {record ? `±${record.jarakMeter}` : '—'}
                </td>
                <td className="px-4 py-3">
                  {hadir ? (
                    <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-black px-3 py-1 rounded-full border border-green-300">
                      <CheckCircle size={12} strokeWidth={3} />
                      HADIR
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-black px-3 py-1 rounded-full border border-red-200">
                      <XCircle size={12} strokeWidth={3} />
                      BELUM
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
