-- ============================================================
-- MIGRASI: Auto-Cleanup Absen Tertunda (Pending) — 30 Hari
-- Sistem Absensi Ronda Desa Kawunglarang
-- ============================================================
-- Menghemat ukuran database: absen tertunda (warga belum terdaftar)
-- yang sudah berumur > 30 hari dihapus otomatis setiap hari.
-- Warga yang belum didaftarkan dalam sebulan harus absen ulang.
-- Jalankan via Supabase Dashboard → SQL Editor (sekali saja).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Hapus pending > 30 hari, setiap hari 04:00 WIB (21:00 UTC).
-- Menjalankan ulang skrip ini aman: job dengan nama sama ditimpa.
SELECT cron.schedule(
  'hapus-pending-absen-lama',
  '0 21 * * *',
  $$DELETE FROM pending_absen WHERE created_at < NOW() - INTERVAL '30 days'$$
);
