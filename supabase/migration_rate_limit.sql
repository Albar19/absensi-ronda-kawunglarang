-- ============================================================
-- MIGRASI: Rate Limiter Persisten (Supabase)
-- Sistem Absensi Ronda Desa Kawunglarang
-- ============================================================
-- Mengganti rate limiter in-memory (Map) yang tidak efektif di
-- hosting serverless (Vercel) karena tiap request instance baru.
-- Counter disimpan di tabel + fungsi atomik (PostgRPC RPC).
-- ============================================================

DROP TABLE IF EXISTS rate_limits CASCADE;

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,          -- contoh: 'login:1.2.3.4' | 'absen:1.2.3.4'
  count INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

-- Fungsi atomik: kembalikan TRUE jika request diizinkan, FALSE jika kena limit.
-- Mengunci baris (FOR UPDATE) agar aman dari race condition.
CREATE OR REPLACE FUNCTION public.rate_limit_check(
  p_key TEXT,
  p_max INT,
  p_window_ms BIGINT
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
  v_reset TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT count, reset_at INTO v_count, v_reset
  FROM public.rate_limits
  WHERE key = p_key
  FOR UPDATE;

  -- Baris belum ada atau sudah lewat jendela → reset counter
  IF v_count IS NULL OR v_reset IS NULL OR v_reset <= v_now THEN
    INSERT INTO public.rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_now + (p_window_ms * INTERVAL '1 millisecond'))
    ON CONFLICT (key) DO UPDATE
      SET count = 1, reset_at = NOW() + (p_window_ms * INTERVAL '1 millisecond');
    RETURN TRUE;
  END IF;

  -- Sudah melewati batas
  IF v_count >= p_max THEN
    RETURN FALSE;
  END IF;

  UPDATE public.rate_limits SET count = count + 1 WHERE key = p_key;
  RETURN TRUE;
END;
$$;

-- Bersihkan baris kedaluwarsa agar tabel tidak membengkak
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);