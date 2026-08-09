# Kembali ke Produksi dari Demo

Panduan menonaktifkan semua jejak demo dan memastikan produksi hanya mencatat
absen asli sesuai jam sesi (masuk 20:00–22:00, pulang 23:00–23:59 WIB).

> **Kapan dipakai:** setelah sesi demo selesai, sebelum sistem dipakai resmi di lapangan.
> **Prinsip:** demo mode mati + data `[DEMO]` bersih + produksi ter-deploy dari commit terbaru.

---

## 0. Peta Kode Demo (Inventori Lengkap)

Demo diaktifkan oleh env `NEXT_PUBLIC_DEMO_MODE=true` dan kode yang
mengeceknya (`isDemoMode()`). Saat env dihapus, semua cabang `if (demo)` mati
— tapi kode ini wajib **dihapus permanen**, bukan dibiarkan, agar produksi
tidak bisa di-reaktivasi dari sisi kode.

| # | File | Isi demo | Aksi |
|---|------|----------|------|
| 1 | `src/lib/data.ts` | `isDemoMode()` (baris 44–46) + bypass di `cekJamStatus()` (baris 60) | Hapus fungsi + import; hapus bypass |
| 2 | `src/app/api/absen/route.ts` | 5 cabang `demo`: bypass rate-limit (38), skip validasi jam (82), skip whitelist warga (136), relaksasi pulang tanpa masuk (165), INSERT polos skip upsert (185) | Hapus semua cabang demo, kembalikan alur produksi |
| 3 | `src/app/api/absen/reset-demo/route.ts` | Route khusus demo (hapus data `[DEMO]%`) | Hapus seluruh folder |
| 4 | `src/app/page.tsx` | prefiks `[DEMO]` (221), deteksi `sudahMasuk` via `/api/absen/cek-masuk` (95–105), state `sudahMasuk` (52), tombol adaptif ABSEN/PULANG (416–418), `handleResetDemo` + tombol (388, 523–531), `onLanjutPulang` (795) | Hapus semua; produksi ikut `cekJamStatus()` |
| 5 | `src/components/citizen/HeaderBanner.tsx` | Badge "MODE DEMO" (29–34) | Hapus |
| 6 | `src/components/citizen/SuccessScreen.tsx` | Tombol "LANJUT ABSEN PULANG" (72–81) via prop `onLanjutPulang` | Hapus tombol + prop |
| 7 | `src/lib/kehadiran.ts` | Komentar "record ganda saat demo" (14) | Update komentar (opsional, kosmetik) |

### ⚠️ Jangan Terhapus — Ini Fitur Produksi

| Kode | Alasan |
|------|--------|
| `POST /api/absen` → auto-register `warga` upsert (route.ts baris 245–250) | Antrean verifikasi admin (warga ketik manual → `terdaftar=false`). Wajib di produksi |
| `GET /api/absen/cek-masuk` (folder `cek-masuk/`) | Endpoint produksi untuk checklist absen pulang. Yang dihapus hanya **pemanggilan deteksi demo** di `page.tsx`, bukan endpointnya |
| Rate-limit (`src/lib/rate-limit.ts`) + whitelist warga | Bagian dari alur produksi; cabang `if (demo)`-nya saja yang dihapus |
| `src/app/api/absen/daftar-nama` | Dropdown nama warga terdaftar (produksi) |

---

## 1. Matikan Demo Mode di Kode

Hapus / perbaiki sesuai inventori di atas. Berikut rincian per file:

### 1a. `src/lib/data.ts`
- Hapus fungsi `isDemoMode()` (baris 44–46) dan komentar demo di atasnya.
- Hapus bypass `if (isDemoMode()) return 'masuk';` di dalam `cekJamStatus()` (baris 60) —
  produksi mengikuti jam sesi asli.

### 1b. `src/app/api/absen/route.ts`
- Hapus `import { isDemoMode }` dan variabel `const demo = isDemoMode()`.
- Rate-limit: selalu aktifkan → `if (!(await rateLimit(...)))`.
- Validasi jam: hapus cabang `if (isDemoMode())`, gunakan logika normal (masuk 20–22, pulang 23–23:59 + grace 5 menit).
- Whitelist: hapus `if (!demo)` → cek warga selalu jalan.
- Pulang wajib masuk: hapus `if (!demo && ...)` → selalu wajib sudah absen masuk.
- Upsert: hapus `demo ? { data: null } : ...` → selalu cek record existing (update jika ada, insert jika belum).

### 1c. `src/app/api/absen/reset-demo/route.ts`
- Hapus seluruh folder. Endpoint ini hanya ada untuk demo; di produksi tidak dipakai.

### 1d. `src/app/page.tsx`
- Hapus `isDemoMode` dari import.
- Hapus state `sudahMasuk` + blok deteksi `/api/absen/cek-masuk` di `useEffect` (baris 95–105).
- Hapus prefiks `[DEMO]` di `handleSubmitMasuk` (baris 221–223) → kirim nama polos.
- Hapus `setSudahMasuk(true/false)` (baris 277, 334).
- Hapus `handleResetDemo` + tombol "Bersihkan Data Test ([DEMO])" (baris 388–397, 523–531).
- Sesi adaptif (baris 416–418): produksi selalu `jamStatus === 'masuk'|'pulang' ? jamStatus : null` — tanpa cabang demo.
- `onLanjutPulang` (baris 795): hapus prop (lihat 1f).

### 1e. `src/components/citizen/HeaderBanner.tsx`
- Hapus import `isDemoMode` + badge "MODE DEMO" (baris 29–34).

### 1f. `src/components/citizen/SuccessScreen.tsx`
- Hapus prop `onLanjutPulang` dan tombol "LANJUT ABSEN PULANG" (baris 72–81).

### 1g. `src/lib/kehadiran.ts`
- Update komentar baris 14 (contoh: "tidak terpengaruh record ganda") — kosmetik.

### Gate wajib sebelum commit
```bash
npm run lint && npm run build
```
Build harus hijau. Commit dan push ke `main`.

---

## 2. Matikan Env Demo (Lokal & Vercel)

### Lokal
1. Di `.env.local`, hapus baris `NEXT_PUBLIC_DEMO_MODE=true` (atau set `false`).
2. Restart dev server (`npm run dev`) — `NEXT_PUBLIC_*` di-inline saat build/dev.

### Vercel
3. Buka project di [vercel.com/dashboard](https://vercel.com/dashboard) → **Settings → Environment Variables**.
4. Hapus / set kosong `NEXT_PUBLIC_DEMO_MODE` untuk semua environment (Preview & Production).
   > `NEXT_PUBLIC_*` di-inline saat build, jadi env harus sudah bersih **sebelum** build.
5. **Redeploy Production** dari commit terbaru `main` (bukan preview).
6. Konfirmasi Production Deployment = commit terbaru. Arahkan QR/domain ke domain produksi, bukan URL `.vercel.app` preview.

---

## 3. Bersihkan Data Demo

7. Cek sisa data demo di **Supabase Dashboard → SQL Editor**:
   ```sql
   SELECT nama_warga, count(*) FROM absen_records WHERE nama_warga LIKE '[DEMO]%' GROUP BY nama_warga;
   SELECT nama, dusun FROM warga WHERE nama LIKE '[DEMO]%';
   ```
8. Hapus via Dashboard → tab **Daftar Warga** → filter **Semua** → cari nama `[DEMO]` →
   **Hapus + Data Absen** (fitur `hapus_absen=1` sudah tersedia).
9. Ulangi query di (7) → hasil harus kosong.

---

## 4. Verifikasi Produksi

| No | Cek | Harapan |
|----|-----|---------|
| 10 | `GET /api/auth/me` (dengan cookie admin) | `authenticated: true` |
| 11 | `GET /api/absen/hari-ini` (admin) | Tidak error, tidak ada nama `[DEMO]` |
| 12 | `GET /api/jadwal` (admin) | 7 baris jadwal normal |
| 13 | Halaman utama di luar jam sesi | Tombol "ABSEN DITUTUP", bukan "MULAI ABSEN MASUK" |
| 14 | `POST /api/absen` di luar jam 20–22 / 23–00 WIB | Ditolak `403 waktu tertutup` → bukti demo mati |
| 15 | Sesi masuk: `POST /api/absen` dengan nama belum terdaftar | Ditolak `BELUM_TERDAFTAR` (antrean verifikasi) |
| 16 | Sesi pulang tanpa absen masuk | Ditolak `403` ("Anda belum absen masuk malam ini.") |
| 17 | Absen berulang dari 1 perangkat | Rate-limit 150/jendela 15 menit berlaku, bukan INSERT polos |
| 18 | Record yang masuk setelah verifikasi | Data asli warga (tanpa prefiks `[DEMO]`) |

---

## 5. Kembali ke Demo (Untuk Sesi Demo Berikutnya)

Jika suatu saat perlu demo lagi:
1. Kembalikan kode demo (restore dari commit `00677d7` / `db73602` / `99caaa5` atau diff balik).
2. Set `NEXT_PUBLIC_DEMO_MODE=true` di `.env.local` (lokal) & Vercel (Preview saja).
3. Jangan pernah set demo di **Production** environment — cukup Preview.

---

## Troubleshoot Cepat

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| Sesi selalu terbuka | Demo mode masih aktif di env produksi | Ulangi langkah 2–6 |
| Bisa absen pulang tanpa absen masuk | Relaksasi pulang demo masih ada di kode | Hapus cabang demo di `absen/route.ts`, redeploy |
| Absen berulang dari 1 perangkat | Bypass rate-limit + INSERT polos masih ada | Hapus cabang demo di `absen/route.ts`, redeploy |
| Nama baru langsung bisa absen | Skip whitelist demo masih ada | Hapus cabang demo di `absen/route.ts`, redeploy |
| `[DEMO]` masih muncul di log | DB belum dibersihkan | Langkah 7–9 |
| Login admin ditolak | `ADMIN_PASSWORD_HASH` / `JWT_SECRET` bermasalah | Cek env produksi di Vercel |
| QR menunjuk ke preview | `NEXT_PUBLIC_BASE_URL` salah | Set ke domain produksi, redeploy |

---

## Catatan Keamanan

- File `.env*` tidak pernah di-commit ke git. `ADMIN_PASSWORD_HASH`, `JWT_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY` hanya ada di env pribadi (Vercel), bukan di repo.
- `NEXT_PUBLIC_DEMO_MODE` juga tidak boleh ada di commit — hanya env.
- Selalu verifikasi Production Deployment sebelum dipakai di lapangan.
