-- ============================================================
-- MIGRASI: Hapus device_id dari absen_records
-- Sistem Absensi Ronda Desa Kawunglarang
-- ============================================================
-- Latar: kode tidak lagi mengirim device_id (1 HP bisa dipakai
-- banyak warga). Kolom ini masih NOT NULL di database, sehingga
-- setiap INSERT absen gagal (constraint violation → 500).
-- ============================================================

-- Index memakai device_id, hapus dulu sebelum drop kolom
DROP INDEX IF EXISTS idx_absen_device_jenis;

ALTER TABLE absen_records DROP COLUMN IF EXISTS device_id;
