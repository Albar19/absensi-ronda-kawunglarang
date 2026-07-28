'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Moon, Sunrise, Lock, User, Pencil, Loader, AlertTriangle, Shield } from 'lucide-react';
import { FlowState, AbsenRecord } from '@/lib/types';
import { CONFIG, type JenisAbsen } from '@/lib/config';
import {
  hitungJarak,
  cekJamStatus,
  getJenisAbsenSaatIni,
  formatJamSesi,
  generateId,
  getTanggalHariIni,
  getDeviceId,
  muatDataWarga,
  simpanDataWarga,
  cekSudahAbsen,
  setSudahAbsen,
  clearSudahAbsen,
} from '@/lib/data';
import HeaderBanner  from '@/components/citizen/HeaderBanner';
import StatusCards   from '@/components/citizen/StatusCards';
import RejectedScreen from '@/components/citizen/RejectedScreen';
import SuccessScreen  from '@/components/citizen/SuccessScreen';

export default function HomePage() {
  const [flowState,      setFlowState]      = useState<FlowState>('idle');
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [statusJam,      setStatusJam]      = useState<JamStatusDisplay>(null);
  const [statusJarak,    setStatusJarak]    = useState<'dekat'|'jauh'|'loading'|'error'|null>(null);
  const [jarakMeter,     setJarakMeter]     = useState<number|null>(null);
  const [akurasi,        setAkurasi]        = useState<number|null>(null);
  const [koordinat,      setKoordinat]      = useState<{lat:number;lng:number}|null>(null);
  const [pesanError,     setPesanError]     = useState('');
  const [successRecord,  setSuccessRecord]  = useState<AbsenRecord|null>(null);
  const [jenisAbsen,     setJenisAbsen]     = useState<JenisAbsen>('masuk');

  // Form state
  const [nama, setNama] = useState('');
  const [dusun, setDusun] = useState('');
  const [showEditHint, setShowEditHint] = useState(false);
  const [namaRegistered, setNamaRegistered] = useState(false); // apakah nama sudah terdaftar di server
  const [deviceRegisteredName, setDeviceRegisteredName] = useState<string | null>(null);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [namaList, setNamaList] = useState<string[]>([]);
  const namaInputRef = useRef<HTMLInputElement>(null);

  // Load saved warga data + check device registration + fetch name list on mount
  useEffect(() => {
    const init = async () => {
      // Muat localStorage dulu sebagai base
      const saved = muatDataWarga();

      // 1. Fetch daftar nama untuk autocomplete
      try {
        const namaRes = await fetch('/api/absen/daftar-nama');
        if (namaRes.ok) {
          const namaData = await namaRes.json();
          if (namaData.names) setNamaList(namaData.names);
        }
      } catch { /* silent */ }

      // 2. Cek apakah device sudah terdaftar di server (nama override localStorage)
      const deviceId = getDeviceId();
      try {
        const devRes = await fetch(`/api/absen/cek-device?device_id=${encodeURIComponent(deviceId)}`);
        if (devRes.ok) {
          const devData = await devRes.json();
          if (devData.registered && devData.nama) {
            setNama(devData.nama);
            setDusun(saved?.dusun || '');
            setNamaRegistered(true);
            setDeviceRegisteredName(devData.nama);
            // Nama registered — tidak ada tombol edit nama, hanya dusun bisa diganti
            return;
          }
        }
      } catch { /* silent */ }

      // 3. Fallback ke localStorage (device belum terdaftar)
      if (saved) {
        setNama(saved.nama);
        setDusun(saved.dusun);
        setShowEditHint(true);
      }
    };
    init();
  }, []);

  const mulaiCek = useCallback(async () => {
    setFlowState('checking');
    setStatusJam(null);
    setStatusJarak('loading');
    setJarakMeter(null);
    setPesanError('');

    const jamStatus = cekJamStatus();

    if (jamStatus === 'belum-buka' || jamStatus === 'ditutup') {
      setStatusJam('tutup');
      setStatusJarak(null);
      setTimeout(() => {
        if (jamStatus === 'belum-buka') {
          setPesanError('Absen belum dibuka. Sesi masuk pukul 20:00 - 23:40 WIB, sesi pulang pukul 23:40 - 01:00 WIB.');
        } else {
          setPesanError('Waktu absen sudah ditutup. Absen hanya tersedia pukul 20:00 - 01:00 WIB.');
        }
        setFlowState('rejected');
      }, 700);
      return;
    }

    // Tentukan sesi
    const sesi = getJenisAbsenSaatIni();
    setJenisAbsen(sesi);
    setStatusJam(sesi); // 'masuk' or 'pulang'

    // Cek localStorage apakah sudah absen untuk sesi ini
    const deviceId = getDeviceId();
    const today = getTanggalHariIni();
    if (cekSudahAbsen(deviceId, today, sesi)) {
      setStatusJarak(null);
      setTimeout(() => {
        setPesanError(`Anda sudah melakukan absen ${sesi === 'pulang' ? 'pulang' : 'masuk'} malam ini.`);
        setFlowState('rejected');
      }, 700);
      return;
    }

    // Kalau pulang, cek dulu apakah sudah absen masuk hari ini
    if (sesi === 'pulang') {
      try {
        const cekRes = await fetch(`/api/absen/cek-masuk?device_id=${encodeURIComponent(deviceId)}&tanggal=${getTanggalHariIni()}`);
        if (!cekRes.ok) {
          const cekData = await cekRes.json();
          setStatusJarak(null);
          setTimeout(() => {
            setPesanError(cekData.error || 'Anda belum absen masuk malam ini. Hubungi admin jika ada kendala.');
            setFlowState('rejected');
          }, 700);
          return;
        }
      } catch {
        setStatusJarak(null);
        setTimeout(() => {
          setPesanError('Gagal memeriksa absen masuk. Periksa koneksi Anda.');
          setFlowState('rejected');
        }, 700);
        return;
      }
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
            setPesanError(`Jarak Anda terlalu jauh dari Bale Desa (${jarak} meter). Anda harus berada dalam radius ${CONFIG.radiusMeter} meter.`);
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
      jenisAbsen,
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
        // Simpan flag sudah absen — cegah absen ganda
        setSudahAbsen(deviceId, getTanggalHariIni(), jenisAbsen);
        // Simpan nama ke localStorage setelah sukses (first time)
        simpanDataWarga(namaTrim, dusun);
        if (!namaRegistered) {
          // Nama baru terdaftar — lock untuk selanjutnya
          setNamaRegistered(true);
          setDeviceRegisteredName(namaTrim);
        }
        setSuccessRecord(record);
        setTimeout(() => { setIsSubmitting(false); setFlowState('success'); }, 300);
        return;
      }
      const err = await res.json();
      // Handle konflik nama device (titip absen)
      if (err.code === 'DEVICE_NAME_CONFLICT' && err.registeredName) {
        setPesanError(`Perangkat ini sudah terdaftar atas nama "${err.registeredName}". Tidak bisa absen atas nama berbeda. Hubungi Admin jika Anda ingin mengganti nama.`);
        // Update form dengan nama terdaftar
        setNama(err.registeredName);
        setNamaRegistered(true);
        setDeviceRegisteredName(err.registeredName);
      } else if (err.jarakServer != null) {
        // Server menolak karena jarak (terjadi jika data GPS berubah saat submit)
        setPesanError(
          `Jarak dari server: ${err.jarakServer}m (batas ${CONFIG.radiusMeter}m). ` +
          `Jarak dari perangkat Anda: ${err.jarakClient}m. ` +
          `Coba lagi dari lokasi yang lebih dekat ke Bale Desa.`
        );
        // Update jarak yang ditampilkan dengan nilai server agar sinkron
        setJarakMeter(err.jarakServer);
      } else {
        setPesanError(err.error || 'Gagal menyimpan absen');
      }
    } catch {
      setPesanError('Gagal terhubung ke server');
    }
    setIsSubmitting(false);
    setFlowState('rejected');
  }, [nama, dusun, jarakMeter, koordinat, jenisAbsen]);

  const handleReset = useCallback(() => {
    // Hapus flag supaya bisa absen ulang (misal perbaiki dusun)
    clearSudahAbsen(getDeviceId(), getTanggalHariIni(), jenisAbsen);
    setFlowState('idle');
    setIsSubmitting(false);
    setStatusJam(null);
    setStatusJarak(null);
    setJarakMeter(null);
    setAkurasi(null);
    setKoordinat(null);
    setPesanError('');
    setSuccessRecord(null);
  }, [jenisAbsen]);

  const handleEditToggle = useCallback(() => {
    // Jika device sudah terdaftar di server, tampilkan warning dulu
    if (namaRegistered) {
      setShowEditWarning(true);
    } else {
      setShowEditHint(false);
    }
  }, [namaRegistered]);

  const handleConfirmEditName = useCallback(() => {
    setShowEditWarning(false);
    // Nama registered: aktifkan form biar dusun bisa diganti
    // Nama tetap tidak bisa diedit (readOnly), tapi server akan tolak jika diubah
    if (namaRegistered) {
      setShowEditHint(true);
    } else {
      setShowEditHint(false);
    }
  }, [namaRegistered]);

  const handleCancelEditWarning = useCallback(() => {
    setShowEditWarning(false);
  }, []);

  const isFormValid = nama.trim().length > 0 && dusun.length > 0;

  // ── Adaptive labels ──
  const jamStatus = cekJamStatus();
  const sesiAktif = jamStatus === 'masuk' || jamStatus === 'pulang' ? jamStatus : null;
  const labelSesi = sesiAktif === 'pulang' ? 'PULANG' : 'MASUK';
  const labelSesiLower = sesiAktif === 'pulang' ? 'pulang' : 'masuk';
  const jamSesiStr = sesiAktif ? formatJamSesi(sesiAktif) : '';

  function BadgeSesi({ warna, label }: { warna: string; label: string }) {
    return (
      <span className={`flex items-center gap-1.5 text-sm font-bold ${warna}`}>
        <span className="w-2 h-2 rounded-full bg-current" />
        <span>{label}</span>
      </span>
    );
  }

  const tombolMulai: React.ReactNode = sesiAktif === 'pulang' ? (
    <span className="flex flex-col items-center gap-0.5">
      <BadgeSesi warna="text-yellow-400" label="PULANG" />
      <span className="flex items-center gap-2"><Moon size={24} /> MULAI ABSEN PULANG</span>
    </span>
  ) : sesiAktif === 'masuk' ? (
    <span className="flex flex-col items-center gap-0.5">
      <BadgeSesi warna="text-green-400" label="MASUK" />
      <span className="flex items-center gap-2"><Moon size={24} /> MULAI ABSEN MASUK</span>
    </span>
  ) : (
    <span className="flex flex-col items-center gap-0.5">
      <BadgeSesi warna="text-red-400" label="TUTUP" />
      <span className="flex items-center gap-2"><Lock size={24} /> ABSEN DITUTUP</span>
    </span>
  );

  const tombolSubmit: React.ReactNode = sesiAktif === 'pulang' ? (
    <span className="flex flex-col items-center gap-0.5">
      <BadgeSesi warna="text-yellow-400" label="PULANG" />
      <span className="flex items-center gap-2"><Sunrise size={24} /> SAYA PULANG RONDA</span>
    </span>
  ) : (
    <span className="flex flex-col items-center gap-0.5">
      <BadgeSesi warna="text-green-400" label="MASUK" />
      <span className="flex items-center gap-2"><Moon size={24} /> SAYA HADIR RONDA</span>
    </span>
  );

  return (
    <main className="bg-slate-100 sm:flex sm:items-start sm:justify-center">
      <div className="w-full sm:max-w-md bg-white sm:rounded-2xl sm:shadow-lg">

        <HeaderBanner />

        {/* ─── IDLE ─── */}
        {flowState === 'idle' && (
          <div className="px-4 sm:px-6 py-8 space-y-5">
            {/* Welcome */}
            <div className="text-center space-y-1.5">
              <Moon size={56} className="text-slate-300 mx-auto" />
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Selamat Datang</h2>
              <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                {sesiAktif
                  ? `Sesi ${labelSesiLower} sedang dibuka (${jamSesiStr}).`
                  : 'Tekan tombol di bawah untuk memulai absen ronda malam.'}
              </p>
            </div>

            {/* Step guide */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 space-y-3">
              <p className="text-xs font-black tracking-widest uppercase text-slate-400">Cara Absen — 2 Sesi</p>

              {/* Sesi 1: Masuk */}
              <div>
                <p className="text-xs font-black text-green-700 uppercase tracking-wider mb-1.5">Sesi 1: Absen Masuk (20:00 — 23:40 WIB)</p>
                <ol className="space-y-1.5">
                  {[
                    'Tekan tombol MULAI ABSEN MASUK',
                    'Izinkan akses lokasi GPS',
                    'Isi Nama dan pilih Dusun',
                    'Tekan SAYA HADIR RONDA',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 leading-snug">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Sesi 2: Pulang */}
              <div>
                <p className="text-xs font-black text-yellow-700 uppercase tracking-wider mb-1.5">Sesi 2: Absen Pulang (23:40 — 01:00 WIB)</p>
                <ol className="space-y-1.5">
                  {[
                    'Tekan tombol MULAI ABSEN PULANG',
                    'Sistem cek — wajib sudah absen masuk',
                    'Izinkan akses lokasi GPS',
                    'Tekan SAYA PULANG RONDA',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-yellow-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 leading-snug">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Note */}
              <p className="text-xs font-semibold text-slate-400 leading-relaxed pt-1 border-t border-slate-200">
                Hadir dihitung hanya jika melakukan <strong className="text-slate-600">MASUK + PULANG</strong> di malam yang sama.
              </p>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={mulaiCek}
              disabled={!sesiAktif}
              className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-xl font-black text-xl sm:text-2xl tracking-wide active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '68px' }}
            >
              {tombolMulai}
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
              <Loader size={18} className="animate-spin" />
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
          <><div className="px-4 sm:px-5 pb-8 space-y-4">
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

            {/* Sesi badge */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
              {sesiAktif === 'pulang' ? <Sunrise size={24} className="text-blue-700" /> : <Moon size={24} className="text-blue-700" />}
              <div>
                <p className="text-sm font-bold text-blue-900">
                  Sesi <span className="uppercase">{labelSesi}</span>
                </p>
                <p className="text-xs text-blue-700">{jamSesiStr}</p>
              </div>
            </div>

            {/* Device registered badge */}
            {namaRegistered && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <Shield size={22} className="text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-amber-900">
                    Perangkat terdaftar: {deviceRegisteredName}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Nama tidak bisa diganti (1 perangkat = 1 warga). Hubungi Admin jika ada kesalahan nama.
                  </p>
                </div>
              </div>
            )}

            {/* Auto-fill hint (hanya jika belum registered) */}
            {showEditHint && !namaRegistered && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <User size={22} className="text-green-700 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-green-900">
                    Data Anda sudah terisi otomatis.
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                      Jika nama atau dusun salah, klik <strong>"Ubah Nama / Dusun"</strong> di bawah.
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
                  ref={namaInputRef}
                  type="text"
                  inputMode="text"
                  autoComplete="name"
                  placeholder={namaRegistered ? deviceRegisteredName || 'Nama terdaftar' : 'Ketik nama lengkap Anda'}
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  readOnly={namaRegistered || (!showEditHint && !!muatDataWarga())}
                  list="daftar-nama-list"
                  className="w-full px-4 py-4 text-base sm:text-lg font-semibold border-2 border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none transition-colors read-only:bg-slate-50 read-only:text-slate-500"
                  style={{ minHeight: '56px' }}
                />
                {/* Datalist autocomplete */}
                {namaList.length > 0 && (
                  <datalist id="daftar-nama-list">
                    {namaList.map(n => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                )}
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

            {/* Tombol utama: adaptif */}
            <button
              type="button"
              onClick={handleSubmitAbsen}
              disabled={!isFormValid || isSubmitting}
              className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-xl font-black text-xl sm:text-2xl tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={{ minHeight: '68px' }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader size={22} className="animate-spin" /> Menyimpan…
                </span>
              ) : (
                tombolSubmit
              )}
            </button>

            {/* Tombol sekunder: Ubah Nama / Dusun */}
            {showEditHint && !namaRegistered && (
              <button
                type="button"
                onClick={handleEditToggle}
                className="w-full bg-white hover:bg-slate-50 text-slate-600 border-2 border-slate-200 rounded-xl font-bold text-base transition-all active:scale-[0.98]"
                style={{ minHeight: '52px' }}
              >
                <Pencil size={18} /> Ubah Nama / Dusun
              </button>
            )}
            {namaRegistered && (
              <button
                type="button"
                onClick={handleEditToggle}
                className="w-full bg-white hover:bg-slate-50 text-slate-600 border-2 border-slate-200 rounded-xl font-bold text-base transition-all active:scale-[0.98]"
                style={{ minHeight: '52px' }}
              >
                <Pencil size={18} /> Ubah Dusun (Nama tetap)
              </button>
            )}
          </div>

          {/* ─── WARNING MODAL: Edit nama registered ─── */}
          {showEditWarning && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
              <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-auto space-y-4">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle size={32} className="text-red-600" strokeWidth={1.8} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Peringatan!</h3>
                  <p className="text-sm text-slate-600 font-semibold leading-relaxed">
                    Perangkat ini sudah terdaftar atas nama <strong>{deviceRegisteredName}</strong>.
                    Mengganti nama dapat dianggap sebagai <strong>titip absen</strong> dan melanggar aturan.
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Jika Anda ingin mengganti nama karena salah ketik, hubungi Admin untuk reset perangkat Anda.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelEditWarning}
                    className="flex-1 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-base hover:bg-slate-50 active:scale-[0.98] transition-all"
                    style={{ minHeight: '48px' }}
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmEditName}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-base hover:bg-red-700 active:scale-[0.98] transition-all"
                    style={{ minHeight: '48px' }}
                  >
                    Tetap Ganti Nama
                  </button>
                </div>
              </div>
            </div>
          )}</>
        )}

        {/* ─── SUCCESS ─── */}
        {flowState === 'success' && successRecord && (
          <SuccessScreen record={successRecord} onBack={handleReset} />
        )}

      </div>
    </main>
  );
}

type JamStatusDisplay = 'masuk' | 'pulang' | 'tutup' | null;
