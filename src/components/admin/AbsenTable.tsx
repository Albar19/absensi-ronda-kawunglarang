'use client';

import { AbsenRecord, Warga } from '@/lib/types';
import { CheckCircle, XCircle } from 'lucide-react';

interface AbsenTableProps {
  wargaList: Warga[];
  absenHariIni: AbsenRecord[];
  filter: 'semua' | 'sudah' | 'belum';
}

export default function AbsenTable({ wargaList, absenHariIni, filter }: AbsenTableProps) {
  const absenMap = new Map<string, AbsenRecord>();
  absenHariIni.forEach(r => absenMap.set(r.wargaId, r));

  const filtered = wargaList.filter(w => {
    const hadir = absenMap.has(w.id);
    if (filter === 'sudah') return hadir;
    if (filter === 'belum') return !hadir;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl py-14 text-center">
        <p className="text-3xl mb-3">📭</p>
        <p className="text-base font-bold text-slate-500">Tidak ada data untuk ditampilkan.</p>
        <p className="text-sm text-slate-400 mt-1">Coba ubah filter di atas.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Mobile card list (< md) */}
      <div className="md:hidden divide-y divide-slate-100">
        {filtered.map((w, i) => {
          const record = absenMap.get(w.id);
          const hadir  = !!record;
          return (
            <div
              key={w.id}
              className={`flex items-center gap-3 px-4 py-3.5 ${hadir ? 'bg-green-50' : 'bg-white'}`}
            >
              {/* Number */}
              <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-black flex items-center justify-center flex-shrink-0 tabular-nums">
                {i + 1}
              </span>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{w.nama}</p>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {w.rt}
                  {record && (
                    <span className="ml-2 text-slate-400">· {record.jamAbsen} WIB · ±{record.jarakMeter}m</span>
                  )}
                </p>
              </div>
              {/* Badge */}
              {hadir ? (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-black px-2.5 py-1 rounded-full border border-green-200 flex-shrink-0">
                  <CheckCircle size={11} strokeWidth={3} /> HADIR
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200 flex-shrink-0">
                  <XCircle size={11} strokeWidth={2.5} /> BELUM
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table (≥ md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['No','Nama','RT','Jam Absen','Jarak (m)','Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-black text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap first:rounded-tl-xl last:rounded-tr-xl">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((w, i) => {
              const record = absenMap.get(w.id);
              const hadir  = !!record;
              return (
                <tr key={w.id} className={`transition-colors ${hadir ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-slate-50'}`}>
                  <td className="px-4 py-3 text-slate-400 font-semibold tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{w.nama}</td>
                  <td className="px-4 py-3 text-slate-600 font-semibold whitespace-nowrap">{w.rt}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-slate-700 whitespace-nowrap">{record ? record.jamAbsen : '—'}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-slate-700 whitespace-nowrap">{record ? `±${record.jarakMeter}` : '—'}</td>
                  <td className="px-4 py-3">
                    {hadir ? (
                      <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-black px-3 py-1 rounded-full border border-green-200">
                        <CheckCircle size={11} strokeWidth={3} /> HADIR
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                        <XCircle size={11} strokeWidth={2.5} /> BELUM
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs font-semibold text-slate-400">
        Menampilkan {filtered.length} dari {wargaList.length} warga
      </div>
    </div>
  );
}
