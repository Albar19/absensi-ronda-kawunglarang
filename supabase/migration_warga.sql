-- ============================================================
-- MIGRASI: Master Daftar Warga (whitelist)
-- Sistem Absensi Ronda Desa Kawunglarang
-- ============================================================
-- - terdaftar = false  : nama ketik manual oleh warga (antrean verifikasi admin)
-- - terdaftar = true   : disetujui admin, muncul di dropdown form absen
-- - aktif = false      : disembunyikan (soft delete / tolak)
-- Hanya warga terdaftar=true + aktif=true yang bisa absen (dicek di POST /api/absen).
-- Nama belum terdaftar masuk antrean; setelah disetujui, warga absen kembali.
-- ============================================================

DROP TABLE IF EXISTS warga CASCADE;

CREATE TABLE warga (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  dusun TEXT NOT NULL,
  terdaftar BOOLEAN NOT NULL DEFAULT FALSE,
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (nama, dusun)
);

-- Warga yang sudah pernah absen dianggap terdaftar agar antrean verifikasi tidak penuh
INSERT INTO warga (nama, dusun, terdaftar)
SELECT DISTINCT nama_warga, dusun, TRUE
FROM absen_records
WHERE nama_warga IS NOT NULL AND dusun IS NOT NULL
ON CONFLICT (nama, dusun) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_warga_nama ON warga(nama);
CREATE INDEX IF NOT EXISTS idx_warga_status ON warga(terdaftar, aktif);
