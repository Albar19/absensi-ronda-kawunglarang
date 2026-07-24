-- ============================================================
-- MIGRASI: Tanggal → Hari (Jadwal Harian Tetap)
-- Sistem Absensi Ronda Desa Kawunglarang
-- ============================================================
-- Jalankan SQL ini di Supabase SQL Editor (https://supabase.com/dashboard)

-- 1. Rename kolom tanggal → hari
ALTER TABLE IF EXISTS jadwal_ronda RENAME COLUMN tanggal TO hari;

-- 2. Ubah tipe dari date ke text
ALTER TABLE IF EXISTS jadwal_ronda ALTER COLUMN hari TYPE text;

-- 3. Konversi data existing: ubah tanggal ke nama hari
UPDATE jadwal_ronda SET hari = (
  CASE
    WHEN EXTRACT(DOW FROM hari::date) = 0 THEN 'Minggu'
    WHEN EXTRACT(DOW FROM hari::date) = 1 THEN 'Senin'
    WHEN EXTRACT(DOW FROM hari::date) = 2 THEN 'Selasa'
    WHEN EXTRACT(DOW FROM hari::date) = 3 THEN 'Rabu'
    WHEN EXTRACT(DOW FROM hari::date) = 4 THEN 'Kamis'
    WHEN EXTRACT(DOW FROM hari::date) = 5 THEN 'Jumat'
    WHEN EXTRACT(DOW FROM hari::date) = 6 THEN 'Sabtu'
  END
) WHERE hari IS NOT NULL;
