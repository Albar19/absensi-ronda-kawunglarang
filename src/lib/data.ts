// ============================================================
// DATA LAYER — Warga, helpers, Haversine
// ============================================================

import { Warga } from './types';
import { CONFIG } from './config';

// ----------------------------------------------------------
// DAFTAR NAMA WARGA (edit sesuai data nyata)
// ----------------------------------------------------------
export const DAFTAR_WARGA: Warga[] = [
  // RT 01
  { id: 'rt01-001', nama: 'Ahmad Suryadi', rt: 'RT 01' },
  { id: 'rt01-002', nama: 'Budi Santoso', rt: 'RT 01' },
  { id: 'rt01-003', nama: 'Dede Rahmat', rt: 'RT 01' },
  { id: 'rt01-004', nama: 'Edi Suherman', rt: 'RT 01' },
  { id: 'rt01-005', nama: 'Fauzi Hidayat', rt: 'RT 01' },
  { id: 'rt01-006', nama: 'Gunawan Saputra', rt: 'RT 01' },
  { id: 'rt01-007', nama: 'Hendra Wijaya', rt: 'RT 01' },
  { id: 'rt01-008', nama: 'Iwan Setiawan', rt: 'RT 01' },
  { id: 'rt01-009', nama: 'Jajang Nurdin', rt: 'RT 01' },
  { id: 'rt01-010', nama: 'Karto Suwandi', rt: 'RT 01' },
  // RT 02
  { id: 'rt02-001', nama: 'Lukman Hakim', rt: 'RT 02' },
  { id: 'rt02-002', nama: 'Mamang Kusnadi', rt: 'RT 02' },
  { id: 'rt02-003', nama: 'Nana Suryana', rt: 'RT 02' },
  { id: 'rt02-004', nama: 'Opik Maulana', rt: 'RT 02' },
  { id: 'rt02-005', nama: 'Pipit Ruhimat', rt: 'RT 02' },
  { id: 'rt02-006', nama: 'Qodir Abdulloh', rt: 'RT 02' },
  { id: 'rt02-007', nama: 'Ridwan Effendi', rt: 'RT 02' },
  { id: 'rt02-008', nama: 'Sandi Priatna', rt: 'RT 02' },
  { id: 'rt02-009', nama: 'Tatang Mulyana', rt: 'RT 02' },
  { id: 'rt02-010', nama: 'Ujang Hermawan', rt: 'RT 02' },
  // RT 03
  { id: 'rt03-001', nama: 'Wahyu Purnama', rt: 'RT 03' },
  { id: 'rt03-002', nama: 'Xandy Surya', rt: 'RT 03' },
  { id: 'rt03-003', nama: 'Yayan Darsono', rt: 'RT 03' },
  { id: 'rt03-004', nama: 'Zaenal Abidin', rt: 'RT 03' },
  { id: 'rt03-005', nama: 'Asep Komarudin', rt: 'RT 03' },
  { id: 'rt03-006', nama: 'Barep Sulaeman', rt: 'RT 03' },
  { id: 'rt03-007', nama: 'Cecep Rustandi', rt: 'RT 03' },
  { id: 'rt03-008', nama: 'Dadang Sujana', rt: 'RT 03' },
  { id: 'rt03-009', nama: 'Ending Sopandi', rt: 'RT 03' },
  { id: 'rt03-010', nama: 'Firman Nugraha', rt: 'RT 03' },
  // RT 04
  { id: 'rt04-001', nama: 'Ganda Permana', rt: 'RT 04' },
  { id: 'rt04-002', nama: 'Hadi Kusuma', rt: 'RT 04' },
  { id: 'rt04-003', nama: 'Ijal Miftahudin', rt: 'RT 04' },
  { id: 'rt04-004', nama: 'Jamal Usman', rt: 'RT 04' },
  { id: 'rt04-005', nama: 'Karman Suherlan', rt: 'RT 04' },
  { id: 'rt04-006', nama: 'Lili Supriatna', rt: 'RT 04' },
  { id: 'rt04-007', nama: 'Maman Suherman', rt: 'RT 04' },
  { id: 'rt04-008', nama: 'Nanang Hidayat', rt: 'RT 04' },
  { id: 'rt04-009', nama: 'Oman Suhanda', rt: 'RT 04' },
  { id: 'rt04-010', nama: 'Parman Saepudin', rt: 'RT 04' },
];

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
export function isJamAbsenBuka(): boolean {
  const now = new Date();
  const jam = now.getHours();
  const menit = now.getMinutes();
  const totalMenit = jam * 60 + menit;
  const buka = CONFIG.jamBukaAbsen * 60 + CONFIG.menitBukaAbsen;
  const tutup = CONFIG.jamTutupAbsen * 60 + CONFIG.menitTutupAbsen;
  return totalMenit >= buka && totalMenit <= tutup;
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
// GENERATE UNIQUE ID
// ----------------------------------------------------------
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
