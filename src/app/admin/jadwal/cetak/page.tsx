'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, ArrowLeft, Loader } from 'lucide-react';
import { CONFIG } from '@/lib/config';
import type { JadwalRonda } from '@/lib/types';

const HARI_LABEL: Record<string, string> = {
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
  minggu: 'Minggu',
};

export default function CetakJadwalPage() {
  const router = useRouter();
  const [jadwal, setJadwal] = useState<JadwalRonda[]>([]);
  const [loading, setLoading] = useState(true);
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/jadwal');
        if (res.status === 401) {
          router.replace('/admin');
          return;
        }
        if (res.ok) {
          const data: JadwalRonda[] = await res.json();
          // Urutkan sesuai hariList
          const result = CONFIG.hariList.map(h => data.find(j => j.hari === h)).filter(Boolean) as JadwalRonda[];
          setJadwal(result);
        }
      } catch {
        // silent
      }
      setLoading(false);
    }
    load();
  }, [router]);

  useEffect(() => {
    if (!loading && jadwal.length > 0 && !printed) {
      setPrinted(true);
      setTimeout(() => window.print(), 300);
    }
  }, [loading, jadwal, printed]);

  return (
    <main className="min-h-screen bg-white print:bg-white">
      {/* ─── Toolbar (hidden saat print) ─── */}
      <div className="print:hidden bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            style={{ minHeight: '40px' }}
          >
            <ArrowLeft size={18} />
            Kembali
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-[#1e3a8a] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#1e40af] active:scale-[0.98] transition-all"
            style={{ minHeight: '40px' }}
          >
            <Printer size={18} strokeWidth={2.5} />
            Cetak
          </button>
        </div>
      </div>

      {/* ─── Konten Cetak ─── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 print:py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-semibold gap-2">
            <Loader size={18} className="animate-spin" />
            Memuat jadwal...
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-8 print:mb-6">
              <h1 className="text-2xl font-black text-slate-900 print:text-black uppercase tracking-wide">
                Jadwal Ronda Mingguan
              </h1>
              <p className="text-sm font-semibold text-slate-500 print:text-slate-700 mt-1">
                {CONFIG.namaBalai} — {CONFIG.namaDesa}
              </p>
            </div>

            {/* Tabel */}
            <table className="w-full border-collapse text-sm print:text-xs">
              <thead>
                <tr className="border-b-2 border-slate-800 print:border-black">
                  <th className="text-left px-4 py-3 font-black text-slate-800 print:text-black text-xs uppercase tracking-wider w-16">
                    No
                  </th>
                  <th className="text-left px-4 py-3 font-black text-slate-800 print:text-black text-xs uppercase tracking-wider">
                    Hari
                  </th>
                  <th className="text-left px-4 py-3 font-black text-slate-800 print:text-black text-xs uppercase tracking-wider">
                    Petugas Ronda
                  </th>
                </tr>
              </thead>
              <tbody>
                {jadwal.map((j, i) => (
                  <tr key={j.hari} className="border-b border-slate-200 print:border-slate-400">
                    <td className="px-4 py-3 text-slate-500 print:text-slate-700 font-semibold tabular-nums align-top">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 print:text-black align-top">
                      {HARI_LABEL[j.hari] || j.hari}
                    </td>
                    <td className="px-4 py-3 text-slate-700 print:text-slate-900 font-semibold align-top">
                      {j.petugas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 print:border-slate-400 text-center">
              <p className="text-xs text-slate-400 print:text-slate-600 font-medium">
                — Dokumen ini adalah jadwal ronda mingguan {CONFIG.namaDesa} —
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
