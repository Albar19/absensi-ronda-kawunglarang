// ============================================================
// TYPE DEFINITIONS - Sistem Absensi Ronda Kawunglarang
// Model Relawan / Open-Input (tanpa master data warga)
// ============================================================

export interface AbsenRecord {
  id: string;
  nama: string;
  dusun: string;
  tanggal: string;       // format: "YYYY-MM-DD"
  jamAbsen: string;      // format: "HH:MM:SS"
  jenisAbsen: 'masuk' | 'pulang';
  latitude: number;
  longitude: number;
  jarakMeter: number;
  deviceId: string;
}

export interface JadwalRonda {
  id: string;
  hari: string;       // 'senin','selasa',...,'minggu'
  petugas: string;    // nama dusun atau 'Perangkat Desa'
}

export interface Warga {
  id: string;
  nama: string;
  dusun: string;
  terdaftar: boolean; // true = disetujui admin, muncul di autocomplete
  aktif: boolean;     // false = soft delete / disembunyikan
  created_at: string;
}

export type FlowState =
  | 'idle'
  | 'checking'
  | 'rejected'
  | 'form'
  | 'success';