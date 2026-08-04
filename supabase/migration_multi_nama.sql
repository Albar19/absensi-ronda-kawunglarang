-- ============================================================
-- MIGRASI: Identitas Multi-Nama per Perangkat + Index Baru
-- Sistem Absensi Ronda Desa Kawunglarang
-- ============================================================
-- Perubahan aturan:
--   1. Satu perangkat (device_id) bisa dipakai banyak warga karena
--      keterbatasan perangkat → identitas absen berbasis NAMA + DUSUN.
--   2. Key upsert & validasi di kode sekarang (nama_warga, dusun,
--      tanggal_ronda, jenis_absen).
--   3. Tambah index untuk mempercepat query per nama + dusun.
--
-- CATATAN: Tidak ada perubahan struktur kolom / tipe data.
-- Data lama tetap valid (device_id masih tersimpan di setiap record).
-- ============================================================

-- Index untuk query upsert & validasi per nama + dusun
CREATE INDEX IF NOT EXISTS idx_absen_nama_dusun_tanggal_jenis
  ON absen_records(nama_warga, dusun, tanggal_ronda, jenis_absen);
