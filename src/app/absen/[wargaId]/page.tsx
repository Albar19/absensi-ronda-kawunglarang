'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FlowState, AbsenRecord, Warga } from '@/lib/types';
import { CONFIG } from '@/lib/config';
import {
  hitungJarak,
  isJamAbsenBuka,
  generateId,
  getTanggalHariIni,
} from '@/lib/data';
import HeaderBanner from '@/components/citizen/HeaderBanner';
import StatusCards from '@/components/citizen/StatusCards';
import JadwalHariIni from '@/components/citizen/JadwalHariIni';
import RejectedScreen from '@/components/citizen/RejectedScreen';
import SuccessScreen from '@/components/citizen/SuccessScreen';

export default function AbsenQRPage() {
  const params = useParams();
  const wargaId = params.wargaId as string;

  const [warga, setWarga] = useState<Warga | null>(null);
  const [wargaLoaded, setWargaLoaded] = useState(false);
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusJam, setStatusJam] = useState<'buka' | 'tutup' | null>(null);
  const [statusJarak, setStatusJarak] = useState<'dekat' | 'jauh' | 'loading' | 'error' | null>(null);
  const [jarakMeter, setJarakMeter] = useState<number | null>(null);
  const [akurasiMeter, setAkurasiMeter] = useState<number | null>(null);
  const [koordinat, setKoordinat] = useState<{ lat: number; lng: number } | null>(null);
  const [pesanError, setPesanError] = useState<string>('');
  const [successRecord, setSuccessRecord] = useState<AbsenRecord | null>(null);

  useEffect(() => {
    fetch('/api/warga')
      .then(r => r.ok ? r.json() : [])
      .then((data: Warga[]) => {
        const found = data.find(w => w.id === wargaId) ?? null;
        setWarga(found);
        setWargaLoaded(true);
        if (!found) setFlowState('rejected');
      })
      .catch(() => {
        setWargaLoaded(true);
        setFlowState('rejected');
      });
  }, [wargaId]);

  const mulaiCek = useCallback(() => {
    setFlowState('checking');
    setStatusJam(null);
    setStatusJarak('loading');
    setJarakMeter(null);
    setPesanError('');

    const jamOk = isJamAbsenBuka();
    setStatusJam(jamOk ? 'buka' : 'tutup');

    if (!jamOk) {
      const jamBuka = CONFIG.jamBukaAbsen.toString().padStart(2, '0') + ':' +
        CONFIG.menitBukaAbsen.toString().padStart(2, '0');
      const jamTutup = CONFIG.jamTutupAbsen.toString().padStart(2, '0') + ':' +
        CONFIG.menitTutupAbsen.toString().padStart(2, '0');
      setStatusJarak(null);
      setTimeout(() => {
        setPesanError(
          `❌ ABSEN DITOLAK: Waktu absen sudah ditutup. Absen hanya tersedia pukul ${jamBuka} – ${jamTutup} WIB.`
        );
        setFlowState('rejected');
      }, 800);
      return;
    }

    if (!navigator.geolocation) {
      setStatusJarak('error');
      setTimeout(() => {
        setPesanError(
          '❌ ABSEN DITOLAK: Browser Anda tidak mendukung GPS. Gunakan browser Chrome atau Firefox terbaru.'
        );
        setFlowState('rejected');
      }, 600);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setAkurasiMeter(Math.round(accuracy));
        const jarak = hitungJarak(latitude, longitude, CONFIG.baleDesaLat, CONFIG.baleDesaLng);
        setJarakMeter(jarak);
        setKoordinat({ lat: latitude, lng: longitude });

        if (jarak <= CONFIG.radiusMeter) {
          setStatusJarak('dekat');
          setTimeout(() => setFlowState('form'), 600);
        } else {
          setStatusJarak('jauh');
          setTimeout(() => {
            setPesanError(
              `❌ ABSEN DITOLAK: Jarak Anda terlalu jauh dari Bale Desa (± ${jarak} meter). Anda harus berada dalam radius ${CONFIG.radiusMeter} meter dari Bale Desa Kawunglarang.`
            );
            setFlowState('rejected');
          }, 800);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setStatusJarak('error');
        setTimeout(() => {
          setPesanError(
            '❌ ABSEN DITOLAK: Izin lokasi ditolak. Silakan aktifkan izin lokasi (GPS) pada browser Anda, lalu coba lagi.'
          );
          setFlowState('rejected');
        }, 600);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!warga) return;
    setIsSubmitting(true);

    const now = new Date();
    const jam = now.getHours().toString().padStart(2, '0');
    const menit = now.getMinutes().toString().padStart(2, '0');
    const detik = now.getSeconds().toString().padStart(2, '0');

    const record: AbsenRecord = {
      id: generateId(),
      wargaId: warga.id,
      nama: warga.nama,
      rt: warga.rt,
      tanggal: getTanggalHariIni(),
      jamAbsen: `${jam}:${menit}:${detik}`,
      jarakMeter: jarakMeter ?? 0,
      koordinatLat: koordinat?.lat ?? 0,
      koordinatLng: koordinat?.lng ?? 0,
      status: 'hadir',
    };

    try {
      await fetch('/api/absen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch {
      // silent
    }

    setSuccessRecord(record);
    setTimeout(() => {
      setIsSubmitting(false);
      setFlowState('success');
    }, 300);
  }, [warga, jarakMeter, koordinat]);

  const handleReset = useCallback(() => {
    setFlowState('idle');
    setIsSubmitting(false);
    setStatusJam(null);
    setStatusJarak(null);
    setJarakMeter(null);
    setAkurasiMeter(null);
    setKoordinat(null);
    setPesanError('');
    setSuccessRecord(null);
  }, []);

  if (!wargaLoaded) {
    return (
      <main className="max-w-lg md:max-w-xl mx-auto bg-white min-h-screen shadow-sm">
        <HeaderBanner />
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-400 text-lg font-semibold">Memuat data...</p>
        </div>
      </main>
    );
  }

  if (!warga) {
    return (
      <main className="max-w-lg md:max-w-xl mx-auto bg-white min-h-screen shadow-sm">
        <HeaderBanner />
        <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
          <div className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center mb-6 shadow-md">
            <span className="text-4xl text-white">⚠️</span>
          </div>
          <h2 className="text-2xl font-black text-red-700 mb-4">QR TIDAK VALID</h2>
          <div className="w-full bg-red-50 border-2 border-red-500 rounded-xl px-5 py-5 mb-8">
            <p className="text-lg font-bold text-red-800 leading-snug">
              Kode QR yang Anda scan tidak dikenali. Silakan hubungi petugas ronda.
            </p>
          </div>
          <Link
            href="/"
            className="w-full bg-slate-800 text-white rounded-xl py-5 text-xl font-black text-center active:scale-[0.98] transition-transform border-2 border-slate-800"
            style={{ minHeight: '64px' }}
          >
            ← Kembali ke Halaman Utama
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg md:max-w-xl mx-auto bg-white min-h-screen shadow-sm">
      <HeaderBanner />

      {/* ---- WELCOME + Warga Info ---- */}
      {flowState === 'idle' && (
        <div className="px-4 py-8 space-y-6">
          <div className="bg-[#eff6ff] border-2 border-[#1e3a8a] rounded-xl px-5 py-5 text-center">
            <p className="text-3xl mb-2">👤</p>
            <p className="text-xs font-bold uppercase tracking-widest text-[#1e3a8a]">Absen Atas Nama</p>
            <p className="text-2xl font-black text-[#1e3a8a] leading-tight mt-1">{warga.nama}</p>
            <p className="text-lg font-bold text-[#1e3a8a]/70 mt-1">{warga.rt}</p>
          </div>

          <JadwalHariIni />

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 space-y-2">
            <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">Panduan:</p>
            <ol className="space-y-1.5 text-sm text-slate-600 font-medium list-decimal list-inside">
              <li>Pastikan Anda sudah berada di Bale Desa</li>
              <li>Tekan tombol <strong>MULAI ABSEN</strong></li>
              <li>Izinkan akses lokasi GPS jika diminta</li>
              <li>Nama akan otomatis terisi — langsung tekan <strong>KIRIM ABSEN</strong></li>
            </ol>
          </div>

          <button
            type="button"
            onClick={mulaiCek}
            className="w-full bg-[#1e3a8a] text-white rounded-xl py-5 text-2xl font-black tracking-wide active:scale-[0.98] transition-transform border-2 border-[#1e3a8a]"
            style={{ minHeight: '72px' }}
          >
            🌙 MULAI ABSEN
          </button>
        </div>
      )}

      {/* ---- CHECKING ---- */}
      {flowState === 'checking' && (
        <div className="space-y-2">
          <StatusCards statusJam={statusJam} statusJarak={statusJarak} jarakMeter={jarakMeter} akurasiMeter={akurasiMeter} />
          <div className="px-4 pb-6 text-center">
            <div className="inline-flex items-center gap-2 text-slate-500 text-sm font-semibold">
              <span className="animate-spin text-lg">⏳</span>
              Sedang memeriksa...
            </div>
          </div>
        </div>
      )}

      {/* ---- REJECTED ---- */}
      {flowState === 'rejected' && (
        <RejectedScreen pesanError={pesanError} onRetry={handleReset} />
      )}

      {/* ---- FORM (confirmation + submit) ---- */}
      {flowState === 'form' && (
        <div>
          <StatusCards statusJam={statusJam} statusJarak={statusJarak} jarakMeter={jarakMeter} akurasiMeter={akurasiMeter} />
          <div className="border-t-2 border-slate-100 mt-2" />

          <div className="px-4 pb-8 space-y-5">
            <div className="bg-green-50 border-2 border-green-500 rounded-xl px-5 py-5 text-center mt-5">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">Konfirmasi Absen</p>
              <p className="text-2xl font-black text-green-900 mt-1">{warga.nama}</p>
              <p className="text-lg font-bold text-green-700/70">{warga.rt}</p>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-[#1e3a8a] text-white rounded-xl py-5 text-xl font-black tracking-wide transition-all active:scale-[0.98] disabled:opacity-60 border-2 border-[#1e3a8a]"
              style={{ minHeight: '64px' }}
            >
              {isSubmitting ? '⏳ Menyimpan...' : '✅ KIRIM ABSEN'}
            </button>
          </div>
        </div>
      )}

      {/* ---- SUBMITTING ---- */}
      {isSubmitting && flowState === 'form' && (
        <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 gap-4">
          <div className="text-5xl animate-pulse">⏳</div>
          <p className="text-xl font-black text-slate-700">Menyimpan absen...</p>
        </div>
      )}

      {/* ---- SUCCESS ---- */}
      {flowState === 'success' && successRecord && (
        <SuccessScreen record={successRecord} onBack={handleReset} />
      )}
    </main>
  );
}