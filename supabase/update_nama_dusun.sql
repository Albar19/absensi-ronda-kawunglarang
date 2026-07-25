-- ============================================================
-- UPDATE: Nama Dusun Default → Nama Asli Desa Kawunglarang
-- Sistem Absensi Ronda Desa Kawunglarang
-- ============================================================
-- Jalankan SQL ini di Supabase SQL Editor (https://supabase.com/dashboard)
-- Hanya untuk sistem yang sudah memiliki data "Dusun 1" s.d. "Dusun 6"
-- ============================================================

-- 1. Update tabel dusun_list
UPDATE dusun_list SET nama = 'Dusun Cibangkong' WHERE nama = 'Dusun 1';
UPDATE dusun_list SET nama = 'Dusun Cibuluh'    WHERE nama = 'Dusun 2';
UPDATE dusun_list SET nama = 'Dusun Bungbulang' WHERE nama = 'Dusun 3';
UPDATE dusun_list SET nama = 'Dusun Gudang'     WHERE nama = 'Dusun 4';
UPDATE dusun_list SET nama = 'Dusun Chargelis'  WHERE nama = 'Dusun 5';
UPDATE dusun_list SET nama = 'Dusun Desa Carta'  WHERE nama = 'Dusun 6';

-- 2. Update tabel warga
UPDATE warga SET dusun = 'Dusun Cibangkong' WHERE dusun = 'Dusun 1';
UPDATE warga SET dusun = 'Dusun Cibuluh'    WHERE dusun = 'Dusun 2';
UPDATE warga SET dusun = 'Dusun Bungbulang' WHERE dusun = 'Dusun 3';
UPDATE warga SET dusun = 'Dusun Gudang'     WHERE dusun = 'Dusun 4';
UPDATE warga SET dusun = 'Dusun Chargelis'  WHERE dusun = 'Dusun 5';
UPDATE warga SET dusun = 'Dusun Desa Carta'  WHERE dusun = 'Dusun 6';

-- 3. Update tabel absen_records
UPDATE absen_records SET dusun = 'Dusun Cibangkong' WHERE dusun = 'Dusun 1';
UPDATE absen_records SET dusun = 'Dusun Cibuluh'    WHERE dusun = 'Dusun 2';
UPDATE absen_records SET dusun = 'Dusun Bungbulang' WHERE dusun = 'Dusun 3';
UPDATE absen_records SET dusun = 'Dusun Gudang'     WHERE dusun = 'Dusun 4';
UPDATE absen_records SET dusun = 'Dusun Chargelis'  WHERE dusun = 'Dusun 5';
UPDATE absen_records SET dusun = 'Dusun Desa Carta'  WHERE dusun = 'Dusun 6';
