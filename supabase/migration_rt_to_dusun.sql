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

-- 4. Seed data: Dusun 1–6 (hanya jika tabel kosong)
INSERT INTO dusun_list (nama)
SELECT 'Dusun 1'
WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun 1');

INSERT INTO dusun_list (nama)
SELECT 'Dusun 2'
WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun 2');

INSERT INTO dusun_list (nama)
SELECT 'Dusun 3'
WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun 3');

INSERT INTO dusun_list (nama)
SELECT 'Dusun 4'
WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun 4');

INSERT INTO dusun_list (nama)
SELECT 'Dusun 5'
WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun 5');

INSERT INTO dusun_list (nama)
SELECT 'Dusun 6'
WHERE NOT EXISTS (SELECT 1 FROM dusun_list WHERE nama = 'Dusun 6');