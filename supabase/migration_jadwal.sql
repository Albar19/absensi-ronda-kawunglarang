-- ============================================================
-- MIGRASI: Jadwal Ronda Mingguan
-- Sistem Absensi Ronda Desa Kawunglarang
-- ============================================================
-- Tabel jadwal_ronda: 7 baris (Senin - Minggu)
-- Opsi petugas: 6 dusun (Bungbulang, Cibangkong, Desa, Gudang,
-- Cibuluh, Cihaurgeulis) + Perangkat Desa (lihat src/lib/config.ts)
-- ============================================================

DROP TABLE IF EXISTS jadwal_ronda CASCADE;

CREATE TABLE jadwal_ronda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hari TEXT NOT NULL UNIQUE,        -- 'senin','selasa',...,'minggu'
  petugas TEXT NOT NULL,            -- nama dusun atau 'Perangkat Desa'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default (rotasi 6 dusun + perangkat desa)
INSERT INTO jadwal_ronda (hari, petugas) VALUES
  ('senin',    'Dusun Bungbulang'),
  ('selasa',   'Dusun Cibangkong'),
  ('rabu',     'Dusun Desa'),
  ('kamis',    'Dusun Gudang'),
  ('jumat',    'Dusun Cibuluh'),
  ('sabtu',    'Dusun Cihaurgeulis'),
  ('minggu',   'Perangkat Desa');