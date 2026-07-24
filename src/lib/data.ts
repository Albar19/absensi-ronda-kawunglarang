// ============================================================
// DATA LAYER — Warga, helpers, Haversine
// ============================================================

import { Warga } from './types';
import { CONFIG } from './config';

// ----------------------------------------------------------
// HAVERSINE FORMULA — hitung jarak 2 titik GPS dalam meter
// ----------------------------------------------------------
export function hitungJarak(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // radius bumi dalam meter
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
// VALIDASI JAM ABSEN
// ----------------------------------------------------------
export type JamStatus = 'buka' | 'belum-buka' | 'ditutup';

export function isJamAbsenBuka(): boolean {
  const now = new Date();
  const jam = now.getHours();
  const menit = now.getMinutes();
  const totalMenit = jam * 60 + menit;
  const buka = CONFIG.jamBukaAbsen * 60 + CONFIG.menitBukaAbsen;
  const tutup = CONFIG.jamTutupAbsen * 60 + CONFIG.menitTutupAbsen;
  if (tutup <= buka) {
    return totalMenit >= buka || totalMenit < tutup;
  }
  return totalMenit >= buka && totalMenit <= tutup;
}

export function cekJamStatus(): JamStatus {
  const now = new Date();
  const totalMenit = now.getHours() * 60 + now.getMinutes();
  const buka = CONFIG.jamBukaAbsen * 60 + CONFIG.menitBukaAbsen;
  const tutup = CONFIG.jamTutupAbsen * 60 + CONFIG.menitTutupAbsen;

  if (tutup <= buka) {
    if (totalMenit >= buka) return 'buka';
    if (totalMenit < tutup) return 'buka';
    return 'belum-buka';
  }

  if (totalMenit < buka) return 'belum-buka';
  if (totalMenit > tutup) return 'ditutup';
  return 'buka';
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
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ----------------------------------------------------------
// 1 HP 1 NAMA — localStorage lock
// ----------------------------------------------------------
const STORAGE_KEY = 'absensi_hp';

export function simpanLockHP(wargaId: string, nama: string) {
  if (typeof window === 'undefined') return;
  const data = { tanggal: getTanggalHariIni(), wargaId, nama };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function cekLockHP(wargaId: string): { ok: boolean; pesan?: string } {
  if (typeof window === 'undefined') return { ok: true };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ok: true };
    const data = JSON.parse(raw);
    if (data.tanggal !== getTanggalHariIni()) return { ok: true };
    if (data.wargaId !== wargaId) {
      return { ok: false, pesan: `HP ini sudah dipakai untuk absen atas nama ${data.nama} hari ini. Ganti HP atau hubungi petugas.` };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}
