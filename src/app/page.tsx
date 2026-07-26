'use client';

import { useState, useCallback, useEffect } from 'react';
import { FlowState, AbsenRecord } from '@/lib/types';
import { CONFIG } from '@/lib/config';
import {
  hitungJarak,
  cekJamStatus,
  generateId,
  getTanggalHariIni,
  getDeviceId,
  muatDataWarga,
  simpanDataWarga,
} from '@/lib/data';
import HeaderBanner  from '@/components/citizen/HeaderBanner';
import StatusCards   from '@/components/citizen/StatusCards';
import RejectedScreen from '@/components/citizen/RejectedScreen';
import SuccessScreen  from '@/components/citizen/SuccessScreen';

export default function HomePage() {
  const [flowState,      setFlowState]      = useState<FlowState>('idle');
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [statusJam,      setStatusJam]      = useState<'buka'|'tutup'|null>(null);
  const [statusJarak,    setStatusJarak]    = useState<'dekat'|'jauh'|'loading'|'error'|null>(null);
  const [jarakMeter,     setJarakMeter]     = useState<number|null>(null);
  const [akurasi,        setAkurasi]        = useState<number|null>(null);
  const [koordinat,      setKoordinat]      = useState<{lat:number;lng:number}|null>(null);
  const [pesanError,     setPesanError]     = useState('');
  const [successRecord,  setSuccessRecord]  = useState<AbsenRecord|null>(null);

  // Form state
  const [nama, setNama] = useState('');
  const [dusun, setDusun] = useState('');
  const [showEditHint, setShowEditHint] = useState(false);

  // Load saved warga data from localStorage on mount
  useEffect(() => {
    const saved = muatDataWarga();
    if (saved) {
      setNama(saved.nama);
      setDusun(saved.dusun);
      setShowEditHint(true);
    }
  }, []);

  const mulaiCek = useCallback(() => {
    setFlowState('checking');
    setStatusJam(null);
    setStatusJarak('loading');
    setJarakMeter(null);
    setPesanError('');

    const jamStatus = cekJamStatus();
    setStatusJam(jamStatus === 'buka' ? 'buka' : 'tutup');

    if (jamStatus !== 'buka') {
      const jb = `${String(CONFIG.jamBukaAbsen).padStart(2,'0')}:${String(CONFIG.menitBukaAbsen).padStart(2,'0')}`;
      const jt = `${String(CONFIG.jamTutupAbsen).padStart(2,'0')}:${String(CONFIG.menitTutupAbsen).padStart(2,'0')}`;
      setStatusJarak(null);
      setTimeout(() => {
        setPesanError(
          jamStatus === 'belum-buka'
            ? `Absen belum dibuka. Absen dibuka pukul ${jb} WIB.`
            : `Waktu absen sudah ditutup. Absen hanya tersedia pukul ${jb} – ${jt} WIB.`
        );
        setFlowState('rejected');
      }, 700);
      return;
    }

    if (!navigator.geolocation) {
      setStatusJarak('error');
      setTimeout(() => {
        setPesanError('Browser Anda tidak mendukung GPS. Gunakan Chrome atau Firefox terbaru.');
        setFlowState('rejected');
      }, 500);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords;
        setAkurasi(Math.round(accuracy));
        const jarak = hitungJarak(latitude, longitude, CONFIG.baleDesaLat, CONFIG.baleDesaLng);
        setJarakMeter(jarak);
        setKoordinat({ lat: latitude, lng: longitude });

        if (jarak <= CONFIG.radiusMeter) {
          setStatusJarak('dekat');
          setTimeout(() => setFlowState('form'), 500);
        } else {
          setStatusJarak('jauh');
          setTimeout(() => {
            setPesanError(`Jarak Anda terlalu jauh dari Bale Desa (±${jarak} meter). Anda harus berada dalam radius ${CONFIG.radiusMeter} meter.`);
            setFlowState('rejected');
          }, 700);
        }
      },
      err => {
        console.error(err);
        setStatusJarak('error');
        setTimeout(() => {
          setPesanError('Izin lokasi ditolak. Aktifkan izin lokasi (GPS) pada browser Anda, lalu coba lagi.');
          setFlowState('rejected');
        }, 500);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const handleSubmitAbsen = useCallback(async () => {
    const namaTrim = nama.trim();
    if (!namaTrim || !dusun) {
      setPesanError('Nama dan Dusun harus diisi.');
      setFlowState('rejected');
      return;
    }

    setIsSubmitting(true);
    const now = new Date();
    const deviceId = getDeviceId();
    const record: AbsenRecord = {
      id: generateId(),
      nama: namaTrim,
      dusun,
      tanggal: getTanggalHariIni(),
      jamAbsen: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`,
      latitude: koordinat?.lat ?? 0,
      longitude: koordinat?.lng ?? 0,
      jarakMeter: jarakMeter ?? 0,
      deviceId,
    };

    try {
      const res = await fetch('/api/absen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        simpanDataWarga(namaTrim, dusun);
        setSuccessRecord(record);
        setTimeout(() => { setIsSubmitting(false); setFlowState('success'); }, 300);
        return;
      }
      const err = await res.json();
      setPesanError(err.error || 'Gagal menyimpan absen');
    } catch {
      setPesanError('Gagal terhubung ke server');
    }
    setIsSubmitting(false);
    setFlowState('rejected');
  }, [nama, dusun, jarakMeter, koordinat]);

  const handleReset = useCallback(() => {
    setFlowState('idle');
    setIsSubmitting(false);
    setStatusJam(null);
    setStatusJarak(null);
    setJarakMeter(null);
    setAkurasi(null);
    setKoordinat(null);
    setPesanError('');
    setSuccessRecord(null);
  }, []);

  const handleEditToggle = useCallback(() => {
    setShowEditHint(false);
  }, []);

  const isFormValid = nama.trim().length > 0 && dusun.length > 0;

  return (
    <main className="min-h-screen bg-slate-100 sm:flex sm:items-start sm:justify-center sm:py-8 lg:py-12">
      <div className="w-full sm:max-w-md bg-white sm:rounded-2xl sm:shadow-lg">

        <HeaderBanner />

        {/* ─── IDLE ─── */}
        {flowState === 'idle' && (
          <div className="px-4 sm:px-6 py-8 space-y-5">
            {/* Welcome */}
            <div className="text-center space-y-1.5">
              <p className="text-5xl" role="img" aria-label="bulan">🌙</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Selamat Datang</h2>
              <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                Tekan tombol di bawah untuk memulai absen ronda malam.
              </p>
            </div>

            {/* Step guide */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-4">
              <p className="text-xs font-black tracking-widest uppercase text-slate-400 mb-3">Cara Absen</p>
              <ol className="space-y-2">
                {[
                  'Tekan tombol MULAI ABSEN',
                  'Izinkan akses lokasi GPS jika diminta',
                  'Isi Nama dan pilih Dusun',
                  'Tekan SAYA HADIR RONDA',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#1e3a8a] text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={mulaiCek}
              className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-xl font-black text-xl sm:text-2xl tracking-wide active:scale-[0.98] transition-all shadow-sm"
              style={{ minHeight: '68px' }}
            >
              🌙 MULAI ABSEN
            </button>

            <div className="text-center pt-2 border-t border-slate-100">
              <a href="/admin" className="text-xs text-slate-400 underline hover:text-slate-600 transition-colors">
                Masuk sebagai Admin
              </a>
            </div>
          </div>
        )}

        {/* ─── CHECKING ─── */}
        {flowState === 'checking' && (
          <div className="py-2">
            <StatusCards statusJam={statusJam} statusJarak={statusJarak} jarakMeter={jarakMeter} akurasiMeter={akurasi} />
            <div className="px-4 py-5 flex items-center justify-center gap-2 text-slate-400 text-sm font-semibold">
              <span className="animate-spin inline-block">⏳</span>
              Sedang memeriksa…
            </div>
          </div>
        )}

        {/* ─── REJECTED ─── */}
        {flowState === 'rejected' && (
          <RejectedScreen pesanError={pesanError} onRetry={handleReset} />
        )}

        {/* ─── FORM ─── */}
        {flowState === 'form' && (
          <div className="px-4 sm:px-5 pb-8 space-y-4">
            <div className="pt-3">
              <button
                type="button"
                onClick={handleReset}
                className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
              >
                ← Kembali
              </button>
            </div>

            <StatusCards statusJam={statusJam} statusJarak={statusJarak} jarakMeter={jarakMeter} akurasiMeter={akurasi} />
            <div className="h-px bg-slate-100" />

            {/* Auto-fill hint */}
            {showEditHint && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">👤</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-blue-900">
                    Data Anda sudah terisi otomatis.
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Jika nama atau dusun salah, klik <strong>"✏️ Ubah Nama / Dusun"</strong> di bawah.
                  </p>
                </div>
              </div>
            )}

            {/* Form fields */}
            <div className="space-y-3">
              <div>
                <label htmlFor="nama" className="block text-xs font-black tracking-widest uppercase text-slate-500 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  id="nama"
                  type="text"
                  inputMode="text"
                  autoComplete="name"
                  placeholder="Ketik nama lengkap Anda"
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  readOnly={!showEditHint && !!muatDataWarga()}
                  className="w-full px-4 py-4 text-base sm:text-lg font-semibold border-2 border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none transition-colors read-only:bg-slate-50 read-only:text-slate-500"
                  style={{ minHeight: '56px' }}
                />
              </div>

              <div>
                <label htmlFor="dusun" className="block text-xs font-black tracking-widest uppercase text-slate-500 mb-1.5">
                  Pilih Dusun
                </label>
                <select
                  id="dusun"
                  value={dusun}
                  onChange={e => setDusun(e.target.value)}
                  disabled={!showEditHint && !!muatDataWarga()}
                  className="w-full px-4 py-4 text-base sm:text-lg font-semibold border-2 border-slate-300 rounded-xl bg-white text-slate-900 focus:border-[#1e3a8a] focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
                  style={{ minHeight: '56px' }}
                >
                  <option value="">-- Pilih Dusun --</option>
                  {CONFIG.dusunList.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tombol utama: SAYA HADIR RONDA */}
            <button
              type="button"
              onClick={handleSubmitAbsen}
              disabled={!isFormValid || isSubmitting}
              className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-xl font-black text-xl sm:text-2xl tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={{ minHeight: '68px' }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Menyimpan…
                </span>
              ) : (
                '🌙 SAYA HADIR RONDA'
              )}
            </button>

            {/* Tombol sekunder: Ubah Nama / Dusun (muncul jika auto-fill aktif) */}
            {showEditHint && (
              <button
                type="button"
                onClick={handleEditToggle}
                className="w-full bg-white hover:bg-slate-50 text-slate-600 border-2 border-slate-200 rounded-xl font-bold text-base transition-all active:scale-[0.98]"
                style={{ minHeight: '52px' }}
              >
                ✏️ Ubah Nama / Dusun
              </button>
            )}
          </div>
        )}

        {/* ─── SUCCESS ─── */}
        {flowState === 'success' && successRecord && (
          <SuccessScreen record={successRecord} onBack={handleReset} />
        )}

      </div>
    </main>
  );
}
