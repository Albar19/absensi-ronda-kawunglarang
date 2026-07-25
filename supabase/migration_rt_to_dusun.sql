-- ============================================================
-- MIGRASI: RT → Dusun
-- Sistem Absensi Ronda Desa Kawunglarang
-- ============================================================
-- Jalankan SQL ini di Supabase SQL Editor (https://supabase.com/dashboard)

-- 1. Rename tabel rt_list → dusun_list
ALTER TABLE IF EXISTS rt_list RENAME TO dusun_list;

-- 2. Rename kolom rt → dusun di tabel warga
ALTER TABLE IF EXISTS warga RENAME COLUMN rt TO dusun;

-- 3. Rename kolom rt → dusun di tabel absen_records
ALTER TABLE IF EXISTS absen_records RENAME COLUMN rt TO dusun;

-- 4. Seed data: Nama Dusun asli Desa Kawunglarang (hanya jika tabel kosong)
INSERT INTO dusun_list (nama)
SELECT 'Dusun Cibangkong'
WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun Cibangkong');

INSERT INTO dusun_list (nama)
SELECT 'Dusun Cibuluh'
WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun Cibuluh');

INSERT INTO dusun_list (nama)
SELECT 'Dusun Bungbulang'
WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun Bungbulang');

INSERT INTO dusun_list (nama)
SELECT 'Dusun Gudang'
WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun Gudang');

INSERT INTO dusun_list (nama)
SELECT 'Dusun Chargelis'
WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun Chargelis');

INSERT INTO dusun_list (nama)
SELECT 'Dusun Desa Carta'
WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun Desa Carta');