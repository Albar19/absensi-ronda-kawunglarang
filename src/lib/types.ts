// ============================================================
// TYPE DEFINITIONS — Sistem Absensi Ronda Kawunglarang
// ============================================================

export interface Warga {
  id: string;
  nama: string;
  dusun: string;
}

export interface AbsenRecord {
  id: string;
  wargaId: string;
  nama: string;
  dusun: string;
  tanggal: string;       // format: "YYYY-MM-DD"
  jamAbsen: string;      // format: "HH:MM:SS"
  jarakMeter: number;
  koordinatLat: number;
  koordinatLng: number;
  status: 'hadir';
}

export type StatusJam = 'buka' | 'tutup';
export type StatusJarak = 'dekat' | 'jauh' | 'loading' | 'error';

export interface ValidationResult {
  statusJam: StatusJam;
  statusJarak: StatusJarak;
  jarakMeter: number | null;
  pesanError: string | null;
}

export type FlowState =
  | 'idle'
  | 'checking'
  | 'rejected'
  | 'form'
  | 'submitting'
  | 'success';

export type FilterType = 'semua' | 'sudah' | 'belum';