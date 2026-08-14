-- ============================================================
-- MIGRASI: Row Level Security (RLS) + Index + Daftar Bulan
-- Sistem Absensi Ronda Desa Kawunglarang
-- ============================================================
-- Aplikasi memakai service role key (bypass RLS) sebagai satu-satunya
-- jalur akses dari API route. RLS diaktifkan agar anon key / akses
-- langsung ke Supabase REST tidak bisa membaca atau menulis data.
-- Kebijakan: anon = deny all (tidak ada policy yang mengizinkan).
-- ============================================================

ALTER TABLE absen_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE warga          ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_ronda   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits    ENABLE ROW LEVEL SECURITY;

-- Deny all untuk anon & authenticated (aplikasi tidak memakai Supabase Auth)
-- DROP POLICY IF EXISTS membuat skrip idempotent — aman dijalankan ulang.
DROP POLICY IF EXISTS deny_anon_absen ON absen_records;
DROP POLICY IF EXISTS deny_auth_absen ON absen_records;
DROP POLICY IF EXISTS deny_anon_warga  ON warga;
DROP POLICY IF EXISTS deny_auth_warga  ON warga;
DROP POLICY IF EXISTS deny_anon_jadwal ON jadwal_ronda;
DROP POLICY IF EXISTS deny_auth_jadwal ON jadwal_ronda;
DROP POLICY IF EXISTS deny_anon_rate   ON rate_limits;
DROP POLICY IF EXISTS deny_auth_rate   ON rate_limits;

CREATE POLICY deny_anon_absen ON absen_records FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY deny_anon_warga  ON warga          FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY deny_anon_jadwal ON jadwal_ronda   FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY deny_anon_rate   ON rate_limits    FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY deny_auth_absen ON absen_records FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY deny_auth_warga  ON warga          FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY deny_auth_jadwal ON jadwal_ronda   FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY deny_auth_rate   ON rate_limits    FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Index untuk query absen per tanggal + jenis (cek-masuk, hari-ini, rekap)
CREATE INDEX IF NOT EXISTS idx_absen_tanggal_jenis
  ON absen_records(tanggal_ronda, jenis_absen);

-- Daftar bulan yang punya data absen (dropdown filter dashboard).
-- Fallback ke kolom 'tanggal' bila schema lama belum punya 'tanggal_ronda'.
CREATE OR REPLACE FUNCTION public.daftar_bulan_absen()
RETURNS TABLE(bulan TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    RETURN QUERY
      SELECT DISTINCT TO_CHAR(tanggal_ronda, 'YYYY-MM') AS bulan
      FROM absen_records
      WHERE tanggal_ronda IS NOT NULL
      ORDER BY 1 DESC;
  EXCEPTION WHEN undefined_column THEN
    RETURN QUERY
      SELECT DISTINCT TO_CHAR(tanggal, 'YYYY-MM') AS bulan
      FROM absen_records
      WHERE tanggal IS NOT NULL
      ORDER BY 1 DESC;
  END;
END;
$$;

-- Hanya service role (aplikasi) yang boleh memanggil fungsi ini
REVOKE ALL ON FUNCTION public.daftar_bulan_absen() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.daftar_bulan_absen() FROM anon;
REVOKE ALL ON FUNCTION public.daftar_bulan_absen() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.daftar_bulan_absen() TO service_role;