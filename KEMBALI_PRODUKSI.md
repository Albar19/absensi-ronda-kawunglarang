# Kembali ke Produksi dari Demo

Panduan menonaktifkan semua jejak demo dan memastikan produksi hanya mencatat
absen asli sesuai jam sesi (masuk 20:00–22:00, pulang 23:00–23:59 WIB).

> **Kapan dipakai:** setelah sesi demo selesai, sebelum sistem dipakai resmi di lapangan.
> **Prinsip:** demo mode mati + data `[DEMO]` bersih + produksi ter-deploy dari commit terbaru.

---

## 1. Matikan Demo Mode di Kode

1. Pastikan kode demo sudah dihapus dari branch kerja:
   - `src/lib/data.ts` — fungsi `isDemoMode()` dan `cekJamStatus()` yang selalu return `'masuk'`
   - `src/app/api/absen/route.ts` — blok demo: bypass rate-limit, relaksasi cek "wajib masuk dulu" untuk pulang, dan `upsert` diganti INSERT polos (`{ data: null }`) saat demo
   - `src/app/page.tsx` — prefiks otomatis `[DEMO]` pada nama, state `sudahMasuk` + deteksi via `/api/absen/cek-masuk` (tombol adaptif ABSEN/PULANG), tombol "LANJUT ABSEN PULANG" di layar sukses, tombol "Bersihkan Data Test ([DEMO])" + handler `handleResetDemo`
   - `src/app/api/absen/reset-demo/route.ts` — hapus folder ini (khusus demo; di produksi hanya balas 403)
   - `src/components/citizen/SuccessScreen.tsx` — tombol "LANJUT ABSEN PULANG"
   - `src/components/citizen/HeaderBanner.tsx` — badge "MODE DEMO"
2. Commit dan push ke `main`.

## 2. Matikan Env Demo di Vercel

3. Buka project di [vercel.com/dashboard](https://vercel.com/dashboard) → **Settings → Environment Variables**.
4. Hapus / set kosong `NEXT_PUBLIC_DEMO_MODE` untuk semua environment (Preview & Production).
   > `NEXT_PUBLIC_*` di-inline saat build, jadi env harus sudah bersih **sebelum** build.
5. **Redeploy Production** dari commit terbaru `main` (bukan preview).
6. Konfirmasi Production Deployment = commit terbaru. Arahkan QR/domain ke domain produksi, bukan URL `.vercel.app` preview.

## 3. Bersihkan Data Demo

7. Cek sisa data demo di **Supabase Dashboard → SQL Editor**:
   ```sql
   SELECT nama_warga, count(*) FROM absen_records WHERE nama_warga LIKE '[DEMO]%' GROUP BY nama_warga;
   SELECT nama, dusun FROM warga WHERE nama LIKE '[DEMO]%';
   ```
8. Hapus via Dashboard → tab **Daftar Warga** → filter **Semua** → cari nama `[DEMO]` →
   **Hapus + Data Absen** (fitur `hapus_absen=1` sudah tersedia).
9. Ulangi query di (7) → hasil harus kosong.

## 4. Verifikasi Produksi

10. `/api/auth/me` → `authenticated: true` (login admin jalan).
11. `/api/absen/hari-ini` → tidak error, tidak ada nama `[DEMO]`.
12. `/api/jadwal` → 7 baris jadwal normal.
13. **Uji sesi tertutup:** di luar jam 20–22 / 23–00 WIB, `POST /api/absen` harus ditolak
    (`403 waktu tertutup`) → membuktikan demo mati. Tombol halaman utama juga kembali
    menampilkan "ABSEN DITUTUP" di luar jam sesi.
14. Record yang masuk setelah verifikasi adalah data asli warga.

---

## Troubleshoot Cepat

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| Sesi selalu terbuka | Demo mode masih aktif di env produksi | Ulangi langkah 3–5 |
| Bisa absen pulang tanpa absen masuk | Relaksasi pulang demo masih aktif | Hapus blok demo di `absen/route.ts`, redeploy |
| Absen berulang dari 1 perangkat | Bypass rate-limit + INSERT polos masih aktif | Hapus blok demo di `absen/route.ts`, redeploy |
| `[DEMO]` masih muncul di log | DB belum dibersihkan | Langkah 7–9 |
| Login admin ditolak | `ADMIN_PASSWORD_HASH` / `JWT_SECRET` bermasalah | Cek env produksi di Vercel |
| QR menunjuk ke preview | `NEXT_PUBLIC_BASE_URL` salah | Set ke domain produksi, redeploy |

---

## Catatan Keamanan

- File `.env*` tidak pernah di-commit ke git. `ADMIN_PASSWORD_HASH`, `JWT_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY` hanya ada di env pribadi (Vercel), bukan di repo.
- Selalu verifikasi Production Deployment sebelum dipakai di lapangan.