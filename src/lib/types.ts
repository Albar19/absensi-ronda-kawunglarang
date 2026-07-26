// ============================================================
// TYPE DEFINITIONS — Sistem Absensi Ronda Kawunglarang
// Model Relawan / Open-Input (tanpa master data warga)
// ============================================================

export interface AbsenRecord {
  id: string;
  nama: string;
  dusun: string;
  tanggal: string;       // format: "YYYY-MM-DD"
  jamAbsen: string;      // format: "HH:MM:SS"
  latitude: number;
  longitude: number;
  jarakMeter: number;
  deviceId: string;
}

export type FlowState =
  | 'idle'
  | 'checking'
  | 'rejected'
  | 'form'
  | 'success';
