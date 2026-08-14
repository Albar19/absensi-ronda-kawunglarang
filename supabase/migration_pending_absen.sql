-- ============================================================
-- MIGRASI: Absen Tertunda (Pending) — Auto-Catat saat Didaftarkan
-- Sistem Absensi Ronda Desa Kawunglarang
-- ============================================================
-- Saat warga BELUM terdaftar mencoba absen, absennya (yang sudah
-- lolos validasi jam + GPS) disimpan di sini. Saat admin mendaftarkan
-- warga (terdaftar=true), record pending dipindah ke absen_records
-- sehingga warga TIDAK perlu absen ulang.
-- Record pending otomatis dihapus setelah 30 hari (lihat
-- migration_pending_cleanup.sql) untuk menghemat ukuran database.
-- ============================================================

DROP TABLE IF EXISTS pending_absen CASCADE;

CREATE TABLE pending_absen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_warga TEXT NOT NULL,
  dusun TEXT NOT NULL,
  tanggal_ronda DATE NOT NULL,
  jam_absen TEXT NOT NULL DEFAULT '',
  jenis_absen TEXT NOT NULL DEFAULT 'masuk',   -- 'masuk' | 'pulang'
  latitude FLOAT8 NOT NULL,
  longitude FLOAT8 NOT NULL,
  jarak_meter INT4 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_absen_nama ON pending_absen(nama_warga, dusun);

-- RLS: deny anon & authenticated (hanya service role yang akses)
ALTER TABLE pending_absen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon_pending ON pending_absen;
DROP POLICY IF EXISTS deny_auth_pending ON pending_absen;
CREATE POLICY deny_anon_pending ON pending_absen FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY deny_auth_pending ON pending_absen FOR ALL TO authenticated USING (false) WITH CHECK (false);