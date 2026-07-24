-- Tambah kolom jenis untuk absen masuk/pulang
ALTER TABLE IF EXISTS absen_records ADD COLUMN IF NOT EXISTS jenis text NOT NULL DEFAULT 'masuk';