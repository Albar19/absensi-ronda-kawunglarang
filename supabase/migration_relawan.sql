-- ============================================================
-- MIGRASI: Relawan / Open-Input Model
-- Sistem Absensi Ronda Desa Kawunglarang
-- ============================================================
-- Menghapus tabel lama (warga, jadwal_ronda, dusun_list, admin_users)
-- dan membuat tabel absen_records baru dengan schema relawan.
-- ============================================================

-- Hapus dependensi dulu (hapus FK, then tabel)
DROP TABLE IF EXISTS jadwal_ronda CASCADE;
DROP TABLE IF EXISTS warga CASCADE;
DROP TABLE IF EXISTS dusun_list CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Hapus tabel absen_records lama jika ada, buat ulang
DROP TABLE IF EXISTS absen_records CASCADE;

-- Tabel utama - 1 tabel saja, tanpa FK constraint
CREATE TABLE absen_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_warga TEXT NOT NULL,
  dusun TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tanggal_ronda DATE DEFAULT CURRENT_DATE,
  jam_absen TEXT NOT NULL DEFAULT '',
  jenis_absen TEXT NOT NULL DEFAULT 'masuk',   -- 'masuk' | 'pulang'
  latitude FLOAT8 NOT NULL,
  longitude FLOAT8 NOT NULL,
  jarak_meter INT4 NOT NULL,
  device_id TEXT NOT NULL
);

-- Index untuk query cepat
CREATE INDEX idx_absen_tanggal_dusun  ON absen_records(tanggal_ronda, dusun);
CREATE INDEX idx_absen_device_jenis  ON absen_records(device_id, tanggal_ronda, jenis_absen);