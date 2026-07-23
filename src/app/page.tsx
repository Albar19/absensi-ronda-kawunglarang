'use client';

import { useState, useCallback } from 'react';
import { Warga, FlowState, AbsenRecord } from '@/lib/types';
import { CONFIG } from '@/lib/config';
import {
  hitungJarak,
  isJamAbsenBuka,
  generateId,
  getTanggalHariIni,
} from '@/lib/data';
import HeaderBanner from '@/components/citizen/HeaderBanner';
import StatusCards from '@/components/citizen/StatusCards';
import NameSelector from '@/components/citizen/NameSelector';
import RejectedScreen from '@/components/citizen/RejectedScreen';
import SuccessScreen from '@/components/citizen/SuccessScreen';

export default function HomePage() {
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusJam, setStatusJam] = useState<'buka' | 'tutup' | null>(null);
  const [statusJarak, setStatusJarak] = useState<'dekat' | 'jauh' | 'loading' | 'error' | null>(null);
  const [jarakMeter, setJarakMeter] = useState<number | null>(null);
  const [akurasiMeter, setAkurasiMeter] = useState<number | null>(null);
  const [koordinat, setKoordinat] = useState<{ lat: number; lng: number } | null>(null);
  const [pesanError, setPesanError] = useState<string>('');
  const [successRecord, setSuccessRecord] = useState<AbsenRecord | null>(null);

  const mulaiCek = useCallback(() => {
    setFlowState('checking');
    setStatusJam(null);
    setStatusJarak('loading');
    setJarakMeter(null);
    setPesanError('');

    // Cek jam
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

    // Cek geolokasi
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
        const jarak = hitungJarak(
          latitude, longitude,
          CONFIG.baleDesaLat, CONFIG.baleDesaLng
        );
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
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  const handleSubmitAbsen = useCallback(
    async (warga: Warga) => {
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
        // silent — absen tetap dianggap berhasil di UI
      }

      setSuccessRecord(record);

      setTimeout(() => {
        setIsSubmitting(false);
        setFlowState('success');
      }, 300);
    },
    [jarakMeter, koordinat]
  );

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

  return (
    <main className="max-w-lg md:max-w-xl mx-auto bg-white min-h-screen shadow-sm">
      {/* Always show header */}
      <HeaderBanner />

      {/* ---- IDLE STATE ---- */}
      {flowState === 'idle' && (
        <div className="px-4 py-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-4xl">🌙</p>
            <h2 className="text-2xl font-black text-slate-900">Selamat Datang</h2>
            <p className="text-base text-slate-600 font-medium leading-snug">
              Tekan tombol di bawah untuk memulai proses absen ronda malam.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 space-y-2">
            <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">Panduan Absen:</p>
            <ol className="space-y-1.5 text-sm text-slate-600 font-medium list-decimal list-inside">
              <li>Tekan tombol <strong>MULAI ABSEN</strong></li>
              <li>Izinkan akses lokasi GPS jika diminta</li>
              <li>Cari dan pilih nama Anda</li>
              <li>Tekan <strong>KIRIM ABSEN</strong></li>
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

          {/* Admin link */}
          <div className="text-center pt-4 border-t border-slate-200">
            <a
              href="/admin"
              className="text-sm text-slate-400 underline hover:text-slate-600 transition-colors"
            >
              Masuk sebagai Admin
            </a>
          </div>
        </div>
      )}

      {/* ---- CHECKING STATE ---- */}
      {flowState === 'checking' && (
        <div className="space-y-2">
          <StatusCards
            statusJam={statusJam}
            statusJarak={statusJarak}
            jarakMeter={jarakMeter}
            akurasiMeter={akurasiMeter}
          />
          <div className="px-4 pb-6 text-center">
            <div className="inline-flex items-center gap-2 text-slate-500 text-sm font-semibold">
              <span className="animate-spin text-lg">⏳</span>
              Sedang memeriksa...
            </div>
          </div>
        </div>
      )}

      {/* ---- REJECTED STATE ---- */}
      {flowState === 'rejected' && (
        <RejectedScreen pesanError={pesanError} onRetry={handleReset} />
      )}

      {/* ---- FORM STATE ---- */}
      {flowState === 'form' && (
        <div>
          <StatusCards
            statusJam={statusJam}
            statusJarak={statusJarak}
            jarakMeter={jarakMeter}
            akurasiMeter={akurasiMeter}
          />
          <div className="border-t-2 border-slate-100 mt-2" />
          <NameSelector
            onSubmit={handleSubmitAbsen}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* ---- SUBMITTING STATE ---- */}
      {isSubmitting && flowState === 'form' && (
        <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 gap-4">
          <div className="text-5xl animate-pulse">⏳</div>
          <p className="text-xl font-black text-slate-700">Menyimpan absen...</p>
        </div>
      )}

      {/* ---- SUCCESS STATE ---- */}
      {flowState === 'success' && successRecord && (
        <SuccessScreen record={successRecord} onBack={handleReset} />
      )}
    </main>
  );
}
