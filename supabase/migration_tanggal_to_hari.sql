-- ============================================================
-- MIGRASI: Jadwal Ronda — kolom tanggal → hari
-- Sistem Absensi Ronda Desa Kawunglarang
-- ============================================================
-- Jalankan SQL ini di Supabase SQL Editor (https://supabase.com/dashboard)
-- Hanya jika tabel jadwal_ronda masih punya kolom 'tanggal' (date) bukan 'hari' (text)
-- ============================================================

-- 1. Tambah kolom hari (text)
ALTER TABLE jadwal_ronda ADD COLUMN IF NOT EXISTS hari text;

-- 2. Isi hari dari tanggal (konversi tanggal ke nama hari Indonesia)
UPDATE jadwal_ronda SET hari =
  CASE EXTRACT(DOW FROM tanggal)
    WHEN 0 THEN 'Minggu'
    WHEN 1 THEN 'Senin'
    WHEN 2 THEN 'Selasa'
    WHEN 3 THEN 'Rabu'
    WHEN 4 THEN 'Kamis'
    WHEN 5 THEN 'Jumat'
    WHEN 6 THEN 'Sabtu'
  END;

-- 3. Hapus kolom tanggal (sudah tidak dipakai)
ALTER TABLE jadwal_ronda DROP COLUMN IF EXISTS tanggal;
