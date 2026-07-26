// ============================================================
// DATA LAYER — Helpers, Haversine, Device ID, LocalStorage
// ============================================================

import { CONFIG } from './config';

// ----------------------------------------------------------
// HAVERSINE FORMULA — hitung jarak 2 titik GPS dalam meter
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
// VALIDASI JAM ABSEN — 20:00 - 00:00 WIB (1 sesi)
// ----------------------------------------------------------
export type JamStatus = 'buka' | 'belum-buka' | 'ditutup';

export function isJamAbsenBuka(): boolean {
  const now = new Date();
  const totalMenit = now.getHours() * 60 + now.getMinutes();
  const buka = CONFIG.jamBukaAbsen * 60 + CONFIG.menitBukaAbsen;       // 20:00 = 1200
  const tutup = CONFIG.jamTutupAbsen * 60 + CONFIG.menitTutupAbsen;   // 00:00 = 0
  // Rentang yang melewati tengah malam: 20:00 (1200) s.d. 00:00 (0 besok)
  if (totalMenit >= buka || totalMenit < tutup) return true;
  return false;
}

export function cekJamStatus(): JamStatus {
  const now = new Date();
  const totalMenit = now.getHours() * 60 + now.getMinutes();
  const buka = CONFIG.jamBukaAbsen * 60 + CONFIG.menitBukaAbsen;
  const tutup = CONFIG.jamTutupAbsen * 60 + CONFIG.menitTutupAbsen;

  // 00:00 - 19:59 => belum-buka (kecuali 00:00 yang masih dalam sesi)
  if (totalMenit >= tutup && totalMenit < buka) return 'belum-buka';
  // 20:00 - 23:59 => buka
  if (totalMenit >= buka) return 'buka';
  // 00:00 => masih dalam sesi (00:00 = tutup, batas akhir)
  if (totalMenit < tutup) return 'buka';
  return 'ditutup';
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
// DEVICE ID — identifikasi unik per HP (disimpan di localStorage)
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
