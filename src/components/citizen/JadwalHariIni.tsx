'use client';

import { useEffect, useState } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { getHariIniIndonesia } from '@/lib/data';

interface JadwalItem {
  id: string;
  hari: string;
  warga_id: string;
  shift: string;
  keterangan: string | null;
}

interface WargaItem {
  id: string;
  nama: string;
  dusun: string;
}

export default function JadwalHariIni() {
  const [jadwalList, setJadwalList] = useState<JadwalItem[]>([]);
  const [wargaMap, setWargaMap] = useState<Map<string, WargaItem>>(new Map());
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [jRes, wRes] = await Promise.all([
        fetch('/api/jadwal'),
        fetch('/api/warga'),
      ]);
      if (jRes.ok) {
        const semuaJadwal: JadwalItem[] = await jRes.json();
        const hariIni = getHariIniIndonesia();
        setJadwalList(semuaJadwal.filter(j => j.hari === hariIni));
      }
      if (wRes.ok) {
        const warga: WargaItem[] = await wRes.json();
        setWargaMap(new Map(warga.map(w => [w.id, w])));
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 sm:px-5 py-3 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 bg-slate-200 rounded w-40 animate-pulse" />
            <div className="h-3 bg-slate-200 rounded w-24 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (jadwalList.length === 0) return null;

  const displayWarga = expanded ? jadwalList : jadwalList.slice(0, 3);
  const sisa = jadwalList.length - 3;

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3 text-left hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1e3a8a] flex items-center justify-center flex-shrink-0">
            <Calendar size={16} className="sm:w-[18px] sm:h-[18px] text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-black text-[#1e3a8a]">Jadwal Ronda Hari Ini</p>
            <p className="text-xs sm:text-sm text-blue-700 font-medium">{jadwalList.length} orang bertugas</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-[#1e3a8a] flex-shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-[#1e3a8a] flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-3 sm:pb-4 space-y-1.5">
          {displayWarga.map(j => {
            const w = wargaMap.get(j.warga_id);
            return (
              <div key={j.id} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 sm:px-4 py-2.5 border border-blue-100">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{w?.nama || j.warga_id}</p>
                  <p className="text-xs text-slate-500 font-medium">{w?.dusun || '—'} {j.keterangan ? `• ${j.keterangan}` : ''}</p>
                </div>
              </div>
            );
          })}
          {!expanded && sisa > 0 && (
            <p className="text-xs text-blue-600 font-semibold text-center pt-1">
              +{sisa} orang lainnya — tap untuk lihat semua
            </p>
          )}
        </div>
      )}
    </div>
  );
}