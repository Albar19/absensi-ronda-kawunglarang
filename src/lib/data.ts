// ============================================================
// DATA LAYER - Helpers, Haversine, Device ID, LocalStorage
// ============================================================

import { CONFIG, type JenisAbsen } from './config';

// ----------------------------------------------------------
// HAVERSINE FORMULA - hitung jarak 2 titik GPS dalam meter
// ----------------------------------------------------------
export function hitungJarak(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// ----------------------------------------------------------
// VALIDASI JAM ABSEN - 2 sesi
//   Masuk : 20:00 - 23:40 WIB
//   Pulang: 23:40 - 01:00 WIB (melewati tengah malam)
// ----------------------------------------------------------
export type JamStatus = 'masuk' | 'pulang' | 'belum-buka' | 'ditutup';

function totalMenitSekarang(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

const MASUK_MULAI = CONFIG.jamBukaMasuk * 60 + CONFIG.menitBukaMasuk;       // 1200
const MASUK_SELESAI = CONFIG.jamTutupMasuk * 60 + CONFIG.menitTutupMasuk;   // 1420
const PULANG_MULAI = CONFIG.jamBukaPulang * 60 + CONFIG.menitBukaPulang;     // 1420
const PULANG_SELESAI = CONFIG.jamTutupPulang * 60 + CONFIG.menitTutupPulang; // 60

export function cekJamStatus(): JamStatus {
  const t = totalMenitSekarang();

  // Sesi pulang: 23:40 - 01:00 (melewati tengah malam)
  if (t >= PULANG_MULAI || t < PULANG_SELESAI) return 'pulang';
  // Sesi masuk: 20:00 - 23:40
  if (t >= MASUK_MULAI && t < MASUK_SELESAI) return 'masuk';
  // Di luar jam (01:00 - 19:59)
  if (t < MASUK_MULAI) return 'belum-buka';
  return 'ditutup';
}

export function getJenisAbsenSaatIni(): JenisAbsen {
  const status = cekJamStatus();
  if (status === 'masuk') return 'masuk';
  if (status === 'pulang') return 'pulang';
  // Fallback — seharusnya tidak dipanggil saat jam tutup
  return 'masuk';
}

export function formatJamSesi(jenis: JenisAbsen): string {
  if (jenis === 'masuk') {
    const b = `${String(CONFIG.jamBukaMasuk).padStart(2,'0')}:${String(CONFIG.menitBukaMasuk).padStart(2,'0')}`;
    const t = `${String(CONFIG.jamTutupMasuk).padStart(2,'0')}:${String(CONFIG.menitTutupMasuk).padStart(2,'0')}`;
    return `${b} - ${t} WIB`;
  }
  const b = `${String(CONFIG.jamBukaPulang).padStart(2,'0')}:${String(CONFIG.menitBukaPulang).padStart(2,'0')}`;
  const t = `${String(CONFIG.jamTutupPulang).padStart(2,'0')}:${String(CONFIG.menitTutupPulang).padStart(2,'0')}`;
  return `${b} - ${t} WIB`;
}

// ----------------------------------------------------------
// Dapatkan tanggal hari ini format YYYY-MM-DD
// ----------------------------------------------------------
export function getTanggalHariIni(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// ----------------------------------------------------------
// Format tanggal ke bahasa Indonesia
// ----------------------------------------------------------
export function formatTanggalIndo(tanggalStr: string): string {
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const d = new Date(tanggalStr + 'T00:00:00');
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

// ----------------------------------------------------------
// Dapatkan nama hari dalam bahasa Indonesia
// ----------------------------------------------------------
export function getHariIniIndonesia(): string {
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return hari[new Date().getDay()];
}

// ----------------------------------------------------------
// GENERATE UNIQUE ID
// ----------------------------------------------------------
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ----------------------------------------------------------
// DEVICE ID - identifikasi unik per HP (disimpan di localStorage)
// ----------------------------------------------------------
const DEVICE_KEY = 'absensi_device_id';
const WARGA_KEY = 'absensi_warga_data';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = generateId() + '-' + Date.now().toString(36);
    localStorage.setItem(DEVICE_KEY, deviceId);
  }
  return deviceId;
}

// ----------------------------------------------------------
// CEK & SET SUDAH ABSEN — cegah absen ganda di sesi yg sama
// ----------------------------------------------------------
const SUDAH_ABSEN_PREFIX = 'absensi_sudah_';

export function setSudahAbsen(deviceId: string, tanggal: string, jenis: JenisAbsen): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${SUDAH_ABSEN_PREFIX}${deviceId}_${tanggal}_${jenis}`, 'true');
}

export function cekSudahAbsen(deviceId: string, tanggal: string, jenis: JenisAbsen): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`${SUDAH_ABSEN_PREFIX}${deviceId}_${tanggal}_${jenis}`) === 'true';
}

export function clearSudahAbsen(deviceId: string, tanggal: string, jenis: JenisAbsen): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${SUDAH_ABSEN_PREFIX}${deviceId}_${tanggal}_${jenis}`);
}

// ----------------------------------------------------------
// Simpan & muat data warga (nama + dusun) ke localStorage
// untuk auto-fill di kunjungan berikutnya
// ----------------------------------------------------------
export interface WargaData {
  nama: string;
  dusun: string;
}

export function simpanDataWarga(nama: string, dusun: string): void {
  if (typeof window === 'undefined') return;
  const data: WargaData = { nama, dusun };
  localStorage.setItem(WARGA_KEY, JSON.stringify(data));
}

export function muatDataWarga(): WargaData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WARGA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WargaData;
  } catch {
    return null;
  }
}