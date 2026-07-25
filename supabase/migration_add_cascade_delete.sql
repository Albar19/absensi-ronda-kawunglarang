-- ============================================================
-- MIGRASI: Add ON DELETE CASCADE ke Foreign Key Constraints
-- Sistem Absensi Ronda Desa Kawunglarang
-- ============================================================
-- Jalankan SQL ini di Supabase SQL Editor
-- (https://supabase.com/dashboard)
-- ============================================================
-- Masalah: Delete warga gagal karena FK violation di
-- absen_records / jadwal_ronda.
-- Solusi: Tambah ON DELETE CASCADE agar data anak otomatis
-- terhapus saat warga dihapus.
-- ============================================================

ALTER TABLE IF EXISTS absen_records
  DROP CONSTRAINT IF EXISTS absen_records_warga_id_fkey,
  ADD CONSTRAINT absen_records_warga_id_fkey
  FOREIGN KEY (warga_id)
  REFERENCES warga (id)
  ON DELETE CASCADE;

ALTER TABLE IF EXISTS jadwal_ronda
  DROP CONSTRAINT IF EXISTS jadwal_ronda_warga_id_fkey,
  ADD CONSTRAINT jadwal_ronda_warga_id_fkey
  FOREIGN KEY (warga_id)
  REFERENCES warga (id)
  ON DELETE CASCADE;
