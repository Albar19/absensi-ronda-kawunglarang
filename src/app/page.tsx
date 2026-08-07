'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Moon, Sunrise, Lock, User, Shield, Loader, CheckCircle, MapPin, Plus, Trash2, ArrowLeft, PenLine } from 'lucide-react';
import { FlowState, AbsenRecord } from '@/lib/types';
import { CONFIG, type JenisAbsen } from '@/lib/config';
import {
  hitungJarak,
  cekJamStatus,
  formatJamSesi,
  generateId,
  getTanggalHariIni,
  muatDataWarga,
  simpanDataWarga,
  isDemoMode,
} from '@/lib/data';
import HeaderBanner  from '@/components/citizen/HeaderBanner';
import StatusCards   from '@/components/citizen/StatusCards';
import RejectedScreen from '@/components/citizen/RejectedScreen';
import SuccessScreen  from '@/components/citizen/SuccessScreen';

interface OrangRow {
  nama: string;
  manual?: boolean; // true = mode ketik manual, false = pilih dari dropdown
}

function BadgeSesi({ warna, label }: { warna: string; label: string }) {
  return (
    <span className={`flex items-center gap-1.5 text-sm font-bold ${warna}`}>
      <span className="w-2 h-2 rounded-full bg-current" />
      <span>{label}</span>
    </span>
  );
}

// Identitas absen = nama + dusun. Key unik untuk checklist pulang.
function keyOrang({ nama, dusun }: { nama: string; dusun: string }) {
  return `${nama.trim().toLowerCase()}|${dusun.trim().toLowerCase()}`;
}

export default function HomePage() {
  const [flowState,      setFlowState]      = useState<FlowState>('idle');
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [statusJam,      setStatusJam]      = useState<JamStatusDisplay>(null);
  const [statusJarak,    setStatusJarak]    = useState<'dekat'|'jauh'|'loading'|'error'|null>(null);
  const [jarakMeter,     setJarakMeter]     = useState<number|null>(null);
  const [akurasi,        setAkurasi]        = useState<number|null>(null);
  const [koordinat,      setKoordinat]      = useState<{lat:number;lng:number}|null>(null);
  const [pesanError,     setPesanError]     = useState('');
  const [jenisAbsen,     setJenisAbsen]     = useState<JenisAbsen>('masuk');
  // Demo mode: true = perangkat sudah absen masuk hari ini → tombol jadi PULANG
  const [sudahMasuk,     setSudahMasuk]     = useState(false);

  // Form state — satu dusun di atas + multi nama (sesi masuk)
  const [rows, setRows] = useState<OrangRow[]>([{ nama: '' }]);
  const [dusunForm, setDusunForm] = useState('');
  // Cache nama warga terdaftar per dusun (untuk dropdown pilih nama)
  const [namaByDusun, setNamaByDusun] = useState<Record<string, string[]>>({});
  const [loadingNama, setLoadingNama] = useState(false);
  const namaInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // Sesi pulang — checklist nama yang sudah absen masuk dari perangkat ini
  const [pulangPeople, setPulangPeople] = useState<{ nama: string; dusun: string }[]>([]);
  const [checkedNames, setCheckedNames] = useState<Set<string>>(new Set());

  // Sukses — kumpulan record (multi nama)
  const [successRecords, setSuccessRecords] = useState<AbsenRecord[]>([]);

  // Ambil nama warga terdaftar untuk satu dusun (di-cache per dusun)
  const loadNamaDusun = useCallback(async (dusun: string) => {
    if (!dusun || namaByDusun[dusun]) return;
    setLoadingNama(true);
    try {
      const res = await fetch(`/api/absen/daftar-nama?dusun=${encodeURIComponent(dusun)}`);
      if (res.ok) {
        const data = await res.json();
        setNamaByDusun(prev => ({ ...prev, [dusun]: data.names ?? [] }));
      }
    } catch { /* silent */ } finally {
      setLoadingNama(false);
    }
  }, [namaByDusun]);

  // Load daftar nama untuk autocomplete + data warga tersimpan
  useEffect(() => {
    const init = async () => {
      // Isi dusun + baris pertama dari localStorage jika ada
      const saved = muatDataWarga();
      if (saved) {
        setDusunForm(saved.dusun);
        setRows([{ nama: saved.nama, manual: true }]);
        void loadNamaDusun(saved.dusun);
      }

      // Demo mode: deteksi apakah perangkat ini sudah absen masuk hari ini
      // → menentukan tombol ABSEN / PULANG otomatis.
      if (isDemoMode()) {
        try {
          const cekRes = await fetch(`/api/absen/cek-masuk?tanggal=${getTanggalHariIni()}`);
          if (cekRes.ok) {
            const cekData = await cekRes.json();
            setSudahMasuk((cekData.people?.length ?? 0) > 0);
          }
        } catch { /* silent */ }
      }
    };
    init();
  }, [loadNamaDusun]);

  const mulaiCek = useCallback(async (jenis: JenisAbsen) => {
    setJenisAbsen(jenis);
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
          setPesanError('Absen belum dibuka. Sesi masuk pukul 20:00 - 22:00 WIB, sesi pulang pukul 23:00 - 23:59 WIB.');
        } else {
          setPesanError('Waktu absen sudah ditutup. Absen masuk 20:00 - 22:00 WIB, pulang 23:00 - 23:59 WIB.');
        }
        setFlowState('rejected');
      }, 700);
      return;
    }

    // Sesi pulang: ambil daftar orang yang sudah absen masuk dari perangkat ini
    if (jenis === 'pulang') {
      try {
        const cekRes = await fetch(`/api/absen/cek-masuk?tanggal=${getTanggalHariIni()}`);
        if (!cekRes.ok) {
          const cekData = await cekRes.json();
          setStatusJarak(null);
          setTimeout(() => {
            setPesanError(cekData.error || 'Belum ada absen masuk dari perangkat ini. Hubungi admin jika ada kendala.');
            setFlowState('rejected');
          }, 700);
          return;
        }
        const cekData = await cekRes.json();
        const people: { nama: string; dusun: string }[] = cekData.people || [];
        if (people.length === 0) {
          setStatusJarak(null);
          setTimeout(() => {
            setPesanError('Belum ada absen masuk dari perangkat ini malam ini.');
            setFlowState('rejected');
          }, 700);
          return;
        }
        setPulangPeople(people);
        setCheckedNames(new Set(people.map(p => keyOrang(p))));
      } catch {
        setStatusJarak(null);
        setTimeout(() => {
          setPesanError('Gagal memeriksa absen masuk. Periksa koneksi Anda.');
          setFlowState('rejected');
        }, 700);
        return;
      }
    } else {
      // Sesi masuk: mulai dengan 1 baris kosong (dusun terpisah di atas)
      const saved = muatDataWarga();
      setDusunForm(saved?.dusun ?? '');
      setRows(saved ? [{ nama: saved.nama, manual: true }] : [{ nama: '' }]);
      if (saved?.dusun) void loadNamaDusun(saved.dusun);
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
  }, [loadNamaDusun]);

  // ── Sesi MASUK: submit semua baris nama (satu dusun di atas) ──
  const handleSubmitMasuk = useCallback(async () => {
    const dusun = dusunForm.trim();
    const validRows = rows
      .map(r => ({ nama: r.nama.trim(), dusun }))
      .filter(r => r.nama.length > 0 && dusun.length > 0)
      .map(r => isDemoMode() && !r.nama.startsWith('[DEMO]')
        ? { ...r, nama: `[DEMO] ${r.nama}` }
        : r);

    if (validRows.length === 0) {
      setPesanError('Pilih dusun dan isi minimal satu nama.');
      setFlowState('rejected');
      return;
    }

    setIsSubmitting(true);
    const now = new Date();
    const jamAbsen = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const tanggal = getTanggalHariIni();
    const submitted: AbsenRecord[] = [];

    for (const row of validRows) {
      const record: AbsenRecord = {
        id: generateId(),
        nama: row.nama,
        dusun: row.dusun,
        tanggal,
        jamAbsen,
        jenisAbsen: 'masuk',
        latitude: koordinat?.lat ?? 0,
        longitude: koordinat?.lng ?? 0,
        jarakMeter: jarakMeter ?? 0,
      };

      try {
        const res = await fetch('/api/absen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
        if (!res.ok) {
          const err = await res.json();
          setPesanError(err.error || `Gagal menyimpan absen atas nama ${row.nama}`);
          setIsSubmitting(false);
          setFlowState('rejected');
          return;
        }
        submitted.push(record);
        // Simpan nama terakhir ke localStorage untuk autofill berikutnya
        simpanDataWarga(row.nama, row.dusun);
      } catch {
        setPesanError('Gagal terhubung ke server');
        setIsSubmitting(false);
        setFlowState('rejected');
        return;
      }
    }

    setSuccessRecords(submitted);
    setIsSubmitting(false);
    setFlowState('success');
    if (isDemoMode()) setSudahMasuk(true);
  }, [rows, dusunForm, koordinat, jarakMeter]);

  // ── Sesi PULANG: submit semua nama yang dicentang ──
  const handleSubmitPulang = useCallback(async () => {
    const selected = pulangPeople.filter(p => checkedNames.has(keyOrang(p)));
    if (selected.length === 0) {
      setPesanError('Pilih minimal satu nama yang absen pulang.');
      setFlowState('rejected');
      return;
    }

    setIsSubmitting(true);
    const now = new Date();
    const jamAbsen = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const tanggal = getTanggalHariIni();
    const submitted: AbsenRecord[] = [];

    for (const p of selected) {
      const record: AbsenRecord = {
        id: generateId(),
        nama: p.nama,
        dusun: p.dusun,
        tanggal,
        jamAbsen,
        jenisAbsen: 'pulang',
        latitude: koordinat?.lat ?? 0,
        longitude: koordinat?.lng ?? 0,
        jarakMeter: jarakMeter ?? 0,
      };

      try {
        const res = await fetch('/api/absen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
        if (!res.ok) {
          const err = await res.json();
          setPesanError(err.error || `Gagal menyimpan absen pulang atas nama ${p.nama}`);
          setIsSubmitting(false);
          setFlowState('rejected');
          return;
        }
        submitted.push(record);
      } catch {
        setPesanError('Gagal terhubung ke server');
        setIsSubmitting(false);
        setFlowState('rejected');
        return;
      }
    }

    setSuccessRecords(submitted);
    setIsSubmitting(false);
    setFlowState('success');
    // Setelah pulang, perangkat bisa langsung absen masuk lagi (test berulang)
    if (isDemoMode()) setSudahMasuk(false);
  }, [pulangPeople, checkedNames, koordinat, jarakMeter]);

  const handleReset = useCallback(() => {
    setFlowState('idle');
    setIsSubmitting(false);
    setStatusJam(null);
    setStatusJarak(null);
    setJarakMeter(null);
    setAkurasi(null);
    setKoordinat(null);
    setPesanError('');
    setSuccessRecords([]);
    setPulangPeople([]);
    setCheckedNames(new Set());
  }, []);

  const tambahRow = useCallback(() => {
    setRows(prev => {
      const last = prev[prev.length - 1];
      return [...prev, { nama: '', manual: last?.manual ?? false }];
    });
    setTimeout(() => namaInputRef.current?.focus(), 50);
  }, []);

  const hapusRow = useCallback((idx: number) => {
    setRows(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }, []);

  const ubahRow = useCallback((idx: number, value: string) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, nama: value } : r)));
  }, []);

  const setRowManual = useCallback((idx: number, manual: boolean) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, manual } : r)));
  }, []);

  // Satu dusun di atas — semua baris nama mengikuti dusun ini
  const pilihDusun = useCallback((dusun: string) => {
    setDusunForm(dusun);
    setRows(prev => prev.map(() => ({ nama: '', manual: false })));
    void loadNamaDusun(dusun);
  }, [loadNamaDusun]);

  const toggleChecked = useCallback((key: string) => {
    setCheckedNames(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Demo: hapus semua data test ([DEMO]) agar test berikutnya bersih
  const handleResetDemo = useCallback(async () => {
    if (!confirm('Hapus semua data test ([DEMO])? Data tidak bisa dikembalikan.')) return;
    try {
      const res = await fetch('/api/absen/reset-demo', { method: 'POST' });
      if (!res.ok) throw new Error();
      window.location.reload();
    } catch {
      alert('Gagal membersihkan data. Coba lagi.');
    }
  }, []);

  const isFormValid = jenisAbsen === 'pulang'
    ? checkedNames.size > 0
    : dusunForm.trim().length > 0 && rows.some(r => r.nama.trim().length > 0);

  // Penanda langkah — bantu pengguna tahu posisi saat mengisi form
  const langkah = jenisAbsen === 'pulang'
    ? { steps: ['Centang Nama', 'Tekan Tombol Pulang'], current: checkedNames.size > 0 ? 1 : 0 }
    : {
        steps: ['Pilih Dusun', 'Pilih Nama', 'Tekan Tombol Hadir'],
        current: !dusunForm ? 0 : (rows.some(r => r.nama.trim()) ? 2 : 1),
      };

  // ── Adaptive session ──
  const demo = isDemoMode();
  const jamStatus = cekJamStatus();
  // Demo: tombol adaptif — sudah absen masuk → PULANG, belum → MASUK.
  // Produksi: ikuti jam sesi asli.
  const sesiAktif = demo
    ? (sudahMasuk ? 'pulang' : 'masuk')
    : (jamStatus === 'masuk' || jamStatus === 'pulang' ? jamStatus : null);
  const labelSesi = sesiAktif === 'pulang' ? 'PULANG' : 'MASUK';
  const labelSesiLower = sesiAktif === 'pulang' ? 'pulang' : 'masuk';
  const jamSesiStr = sesiAktif ? formatJamSesi(sesiAktif) : '';

  const tombolMulai: React.ReactNode = sesiAktif === 'pulang' ? (
    <span className="flex flex-col items-center gap-0.5">
      <BadgeSesi warna="text-yellow-400" label="PULANG" />
      <span className="flex items-center gap-2"><Moon size={24} strokeWidth={2} /> MULAI ABSEN PULANG</span>
    </span>
  ) : sesiAktif === 'masuk' ? (
    <span className="flex flex-col items-center gap-0.5">
      <BadgeSesi warna="text-green-400" label="MASUK" />
      <span className="flex items-center gap-2"><Moon size={24} strokeWidth={2} /> MULAI ABSEN MASUK</span>
    </span>
  ) : (
    <span className="flex flex-col items-center gap-0.5">
      <BadgeSesi warna="text-red-400" label="TUTUP" />
      <span className="flex items-center gap-2"><Lock size={24} strokeWidth={2} /> ABSEN DITUTUP</span>
    </span>
  );

  const tombolSubmit: React.ReactNode = jenisAbsen === 'pulang' ? (
    <span className="flex flex-col items-center gap-0.5">
      <BadgeSesi warna="text-yellow-400" label="PULANG" />
      <span className="flex items-center gap-2"><Sunrise size={24} strokeWidth={2} /> SAYA PULANG RONDA ({checkedNames.size} org)</span>
    </span>
  ) : (
    <span className="flex flex-col items-center gap-0.5">
      <BadgeSesi warna="text-green-400" label="MASUK" />
      <span className="flex items-center gap-2"><Moon size={24} strokeWidth={2} /> SAYA HADIR RONDA ({rows.filter(r => r.nama.trim()).length} org)</span>
    </span>
  );

  return (
    <main className="bg-slate-100 sm:flex sm:items-start sm:justify-center">
      <div className="w-full sm:max-w-md bg-white sm:rounded-2xl sm:shadow-lg">

        <HeaderBanner />

        {/* ─── IDLE ─── */}
        {flowState === 'idle' && (
          <div className="px-4 sm:px-6 py-8 space-y-5 animate-fade-up">
            {/* Welcome */}
            <div className="text-center space-y-1.5">
              <Moon size={56} className="text-slate-300 mx-auto" strokeWidth={1.5} />
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Selamat Datang</h2>
              <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                {sesiAktif
                  ? `Sesi ${labelSesiLower} sedang dibuka (${jamSesiStr}).`
                  : 'Tekan tombol di bawah untuk memulai absen ronda malam.'}
              </p>
            </div>

            {/* Step guide — sederhana, teks besar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 space-y-3.5 shadow-card">
              <p className="text-sm font-black text-slate-800">3 Langkah Mudah:</p>
              {[
                'Tekan tombol besar di bawah untuk mulai absen',
                'Izinkan izin lokasi (GPS) saat diminta HP',
                'Pilih Dusun & Nama, lalu tekan tombol besar untuk selesai',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-navy text-white text-sm font-black flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm sm:text-base font-semibold text-slate-700 leading-snug">{step}</p>
                </div>
              ))}
              <p className="text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed pt-2.5 border-t border-slate-200">
                Malam ini 2 sesi:{' '}
                <strong className="text-green-700">Masuk (20:00–22:00)</strong> &{' '}
                <strong className="text-yellow-700">Pulang (23:00–23:59)</strong>. Hadir dihitung
                jika <strong className="text-slate-600">masuk + pulang</strong> di malam yang sama.
              </p>
            </div>

            {/* Tips izin GPS */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
              <MapPin size={22} className="text-amber-700 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <div className="text-sm font-semibold text-amber-800 leading-relaxed">
                <p className="font-black text-amber-900 mb-0.5">Tips Izin Lokasi</p>
                Saat HP meminta izin lokasi, pilih <strong>IZINKAN</strong>, lalu pilih{' '}
                <strong>LOKASI AKURAT / PRECISE</strong> — jangan pilih &quot;Perkiraan / Approximate&quot;
                agar absen tidak ditolak karena jarak.
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={sesiAktif ? () => mulaiCek(sesiAktif) : undefined}
              disabled={!sesiAktif}
              className={`w-full text-white rounded-xl font-black text-xl sm:text-2xl tracking-wide active:scale-[0.98] transition-all shadow-sm disabled:opacity-80 disabled:cursor-not-allowed bg-navy hover:bg-navy-hover`}
              style={{ minHeight: '68px' }}
            >
              {tombolMulai}
            </button>

            <div className="text-center pt-2 border-t border-slate-100">
              <a href="/admin" className="text-xs text-slate-400 underline hover:text-slate-600 transition-colors">
                Masuk sebagai Admin
              </a>
            </div>

            {demo && (
              <button
                type="button"
                onClick={handleResetDemo}
                className="w-full text-xs font-bold text-red-400 hover:text-red-600 transition-colors text-center"
              >
                Bersihkan Data Test ([DEMO])
              </button>
            )}
          </div>
        )}

        {/* ─── CHECKING ─── */}
        {flowState === 'checking' && (
          <div className="py-2 animate-fade-up">
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
          <div className="px-4 sm:px-6 pb-8 space-y-4 animate-fade-up">
            <div className="pt-3">
              <button
                type="button"
                onClick={handleReset}
                className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5 py-1"
              >
                <ArrowLeft size={16} strokeWidth={2.5} />
                Kembali
              </button>
            </div>

            <StatusCards statusJam={statusJam} statusJarak={statusJarak} jarakMeter={jarakMeter} akurasiMeter={akurasi} />
            <div className="h-px bg-slate-100" />

            {/* Penanda langkah — besar & jelas */}
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-card">
              <div className="flex gap-1.5 flex-shrink-0">
                {langkah.steps.map((_, i) => (
                  <span
                    key={i}
                    className={`inline-block h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                      i < langkah.current ? 'bg-green-600' : i === langkah.current ? 'bg-navy scale-110' : 'bg-slate-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm sm:text-base font-black text-slate-700 min-w-0">
                Langkah {langkah.current + 1} dari {langkah.steps.length}:{' '}
                <span className="text-navy">{langkah.steps[langkah.current]}</span>
              </p>
            </div>

            {/* Sesi badge */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
              {jenisAbsen === 'pulang' ? <Sunrise size={24} className="text-blue-700" strokeWidth={2} /> : <Moon size={24} className="text-blue-700" strokeWidth={2} />}
              <div>
                <p className="text-sm font-bold text-blue-900">
                  Sesi <span className="uppercase">{labelSesi}</span>
                </p>
                <p className="text-xs text-blue-700">{jamSesiStr}</p>
              </div>
            </div>

            {jenisAbsen === 'pulang' ? (
              /* ══════════ FORM PULANG — CHECKLIST ══════════ */
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
                  <Shield size={24} className="text-amber-700 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-amber-900">
                      Nama yang sudah absen masuk ({pulangPeople.length} org)
                    </p>
                    <p className="text-sm text-amber-700 mt-0.5 leading-relaxed">
                      Hilangkan centang untuk yang <strong>pulang lebih awal</strong>. Nama yang tetap tercentang tercatat HADIR lengkap.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 border-2 border-slate-200 rounded-xl overflow-hidden">
                  {pulangPeople.map(p => {
                    const k = keyOrang(p);
                    return (
                      <label key={k} className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-slate-50 transition-colors active:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={checkedNames.has(k)}
                          onChange={() => toggleChecked(k)}
                          className="w-6 h-6 accent-blue-700 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-slate-900 truncate">{p.nama}</p>
                          <p className="text-sm text-slate-500 font-semibold">{p.dusun}</p>
                        </div>
                        {checkedNames.has(k) ? (
                          <CheckCircle size={22} className="text-green-600 flex-shrink-0" strokeWidth={2} />
                        ) : (
                          <span className="text-xs font-black text-slate-400 uppercase flex-shrink-0">pulang awal</span>
                        )}
                      </label>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleSubmitPulang}
                  disabled={!isFormValid || isSubmitting}
                  className="w-full bg-navy hover:bg-navy-hover text-white rounded-xl font-black text-xl sm:text-2xl tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
              </>
            ) : (
              /* ══════════ FORM MASUK — MULTI NAMA ══════════ */
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
                  <User size={24} className="text-green-700 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-green-900">
                      Isi data peserta ronda
                    </p>
                    <p className="text-sm text-green-700 mt-0.5 leading-relaxed">
                      Pilih <strong>dusun</strong> dulu, lalu pilih <strong>nama</strong> dari daftar warga. Tekan <strong>&quot;+ Tambah Nama&quot;</strong> untuk menambahkan peserta lain.
                    </p>
                  </div>
                </div>

                {/* Satu dusun untuk semua baris nama */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Pilih Dusun
                  </label>
                  <select
                    value={dusunForm}
                    onChange={e => pilihDusun(e.target.value)}
                    className="w-full px-4 py-4 text-base sm:text-lg font-semibold border-2 border-slate-300 rounded-xl bg-white text-slate-900 focus:border-navy focus:outline-none transition-colors"
                    style={{ minHeight: '56px' }}
                  >
                    <option value="">-- Pilih Dusun --</option>
                    {CONFIG.dusunList.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Daftar baris nama */}
                <div className="space-y-3">
                  {rows.map((row, idx) => (
                    <div key={idx} className="border-2 border-slate-200 rounded-xl p-3 space-y-3 relative">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => hapusRow(idx)}
                          className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-card hover:bg-red-600 active:scale-95 transition-all"
                          aria-label="Hapus nama"
                        >
                          <Trash2 size={14} strokeWidth={2.5} />
                        </button>
                      )}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                          Nama Lengkap {rows.length > 1 ? `#${idx + 1}` : ''}
                        </label>
                        {row.manual ? (
                          <input
                            ref={idx === 0 ? (namaInputRef as React.RefObject<HTMLInputElement>) : undefined}
                            type="text"
                            inputMode="text"
                            autoComplete="name"
                            placeholder="Ketik nama lengkap"
                            value={row.nama}
                            onChange={e => ubahRow(idx, e.target.value)}
                            className="w-full px-4 py-4 text-base sm:text-lg font-semibold border-2 border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:border-navy focus:outline-none transition-colors"
                            style={{ minHeight: '56px' }}
                          />
                        ) : !dusunForm ? (
                          <div
                            className="w-full px-4 py-4 text-base sm:text-lg font-semibold text-slate-400 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-between"
                            style={{ minHeight: '56px' }}
                          >
                            Pilih dusun di atas untuk melihat daftar nama
                            {loadingNama && <Loader size={16} className="animate-spin" />}
                          </div>
                        ) : (
                          <select
                            ref={idx === 0 ? (namaInputRef as React.RefObject<HTMLSelectElement>) : undefined}
                            value={row.nama}
                            onChange={e => ubahRow(idx, e.target.value)}
                            className="w-full px-4 py-4 text-base sm:text-lg font-semibold border-2 border-slate-300 rounded-xl bg-white text-slate-900 focus:border-navy focus:outline-none transition-colors"
                            style={{ minHeight: '56px' }}
                          >
                            <option value="">
                              {loadingNama && !namaByDusun[dusunForm]
                                ? 'Memuat daftar nama…'
                                : '-- Pilih Nama --'}
                            </option>
                            {(namaByDusun[dusunForm] ?? []).map(n => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        )}
                        {dusunForm && (
                          <button
                            type="button"
                            onClick={() => setRowManual(idx, !row.manual)}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 border-2 border-slate-300 bg-white hover:bg-slate-50 text-navy rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                            style={{ minHeight: '44px' }}
                          >
                            {row.manual ? <ArrowLeft size={16} strokeWidth={2.5} /> : <PenLine size={16} strokeWidth={2.5} />}
                            {row.manual ? 'Pilih dari daftar' : 'Ketik nama manual…'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Tombol tambah nama */}
                  <button
                    type="button"
                    onClick={tambahRow}
                    className="w-full bg-white hover:bg-slate-50 text-navy border-2 border-dashed border-navy/40 rounded-xl font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ minHeight: '52px' }}
                  >
                    <Plus size={18} strokeWidth={2.5} /> Tambah Nama
                  </button>
                </div>

                {/* Tombol submit */}
                <button
                  type="button"
                  onClick={handleSubmitMasuk}
                  disabled={!isFormValid || isSubmitting}
                  className="w-full bg-navy hover:bg-navy-hover text-white rounded-xl font-black text-xl sm:text-2xl tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
              </>
            )}
          </div>
        )}

        {/* ─── SUCCESS ─── */}
        {flowState === 'success' && successRecords.length > 0 && (
          <SuccessScreen
            records={successRecords}
            onBack={handleReset}
            onTambahNama={jenisAbsen === 'masuk' ? () => { setSuccessRecords([]); setRows([{ nama: '' }]); setFlowState('form'); } : undefined}
            onLanjutPulang={demo && jenisAbsen === 'masuk' ? () => mulaiCek('pulang') : undefined}
          />
        )}

      </div>
    </main>
  );
}

type JamStatusDisplay = 'masuk' | 'pulang' | 'tutup' | null;
