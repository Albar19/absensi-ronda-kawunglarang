# Absensi Ronda — Desa Kawunglarang

Sistem absensi ronda malam berbasis web untuk **Desa Kawunglarang**, dikembangkan oleh **KKN 46 Universitas Kuningan**.

> **Dibuat untuk:** Pemerintah Desa Kawunglarang  
> **Oleh:** KKN 46 UNIKU  
> **Tahun:** 2026

---

## Daftar Isi

- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Struktur Database](#struktur-database)
- [Alur Absen](#alur-absen)
- [Cara Develop Lokal](#cara-develop-lokal)
- [Cara Deploy](#cara-deploy)
- [Struktur Folder](#struktur-folder)
- [Konfigurasi](#konfigurasi)
- [Untuk KKN Selanjutnya](#untuk-kkn-selanjutnya)

---

## Fitur

| Fitur | Deskripsi |
|-------|-----------|
| **Absen Masuk** | Warga buka halaman, cek GPS (radius 150m dari Bale Desa), absen masuk (20:00–22:00 WIB) |
| **Absen Pulang** | Warga absen pulang (23:00–23:59 WIB) — wajib sudah absen masuk malam ini |
| **1 Perangkat Bisa Banyak Warga** | Karena keterbatasan perangkat, satu HP bisa dipakai absen banyak warga. Ada fitur "Tambah Nama" saat absen masuk. |
| **Checklist Absen Pulang** | Saat sesi pulang, semua nama yang sudah absen masuk dari perangkat tampil dengan centang. Nama yang pulang lebih awal bisa di-uncheck. |
| **Autocomplete Nama** | Saat ketik nama, otomatis muncul saran dari nama yang pernah absen sebelumnya. |
| **Jadwal Ronda Mingguan** | Admin atur petugas ronda per hari (Senin–Minggu) via dropdown di dashboard |
| **Dashboard Admin** | Log kehadiran real-time + leaderboard progress bar per dusun |
| **Export Excel** | Export rekap per dusun + detail absensi per bulan ke file `.xlsx` |
| **QR Code** | Download QR Code (biru #1e3a8a) untuk ditempel di Bale Desa |

Perhitungan kehadiran: hanya **absen pulang** yang dihitung sebagai hadir lengkap (masuk + pulang = 1).

---

## Tech Stack

| Teknologi | Kegunaan |
|-----------|----------|
| **Next.js 16** (App Router) | Framework web React fullstack |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling utility-first |
| **Supabase** | Database PostgreSQL + API |
| **Lucide React** | Icon library |
| **SheetJS (xlsx)** | Export Excel |
| **Vercel** | Hosting & deploy |

---

## Struktur Database

### Tabel `absen_records`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | uuid (PK) | Auto generate dari database |
| `nama_warga` | text | Nama warga (denormalized) |
| `dusun` | text | Dusun warga (denormalized) |
| `created_at` | timestamptz | Auto timestamp |
| `tanggal_ronda` | date | Tanggal ronda (indexed) |
| `jam_absen` | text | Jam absen HH:MM:SS |
| `jenis_absen` | text | `"masuk"` atau `"pulang"` (indexed) |
| `latitude` | float8 | Latitude GPS |
| `longitude` | float8 | Longitude GPS |
| `jarak_meter` | int4 | Jarak dari Bale Desa (meter) |
| `device_id` | text | ID perangkat unik (localStorage) |

Index: `idx_absen_tanggal_dusun` pada `(tanggal_ronda, dusun)`  
Index: `idx_absen_device_jenis` pada `(device_id, tanggal_ronda, jenis_absen)`

### Tabel `warga`

Master daftar warga (whitelist non-blocking). Nama yang diketik manual saat absen masuk antrean verifikasi admin.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | uuid (PK) | Auto generate |
| `nama` | text | Nama warga |
| `dusun` | text | Dusun warga |
| `terdaftar` | boolean | `false` = antrean verifikasi, `true` = disetujui admin |
| `aktif` | boolean | `false` = soft delete / disembunyikan |
| `created_at` | timestamptz | Auto timestamp |

Unique: `(nama, dusun)`. Warga yang sudah pernah absen otomatis `terdaftar=true` saat migrasi dijalankan.

### Tabel `rate_limits`

Counter rate limiter persisten (jalan di hosting serverless). Dipakai untuk batasi percobaan login & pengiriman absen per IP.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `key` | text (PK) | Contoh: `login:1.2.3.4` / `absen:1.2.3.4` |
| `count` | int | Jumlah request dalam jendela |
| `reset_at` | timestamptz | Waktu reset counter |

Fungsi `rate_limit_check(p_key, p_max, p_window_ms)` dikelola lewat RPC atomik (row lock `FOR UPDATE`).

### Tabel `jadwal_ronda`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | uuid (PK) | Auto generate |
| `hari` | text | `senin` – `minggu` (unique) |
| `petugas` | text | Nama petugas ronda (misal: "Dusun Bungbulang" / "Perangkat Desa") |
| `created_at` | timestamptz | Auto timestamp |
| `updated_at` | timestamptz | Auto timestamp |

---

## Alur Absen

### Sesi Masuk (20:00 – 22:00 WIB)
1. Warga buka halaman absen (scan QR atau buka URL)
2. Sistem cek jam — jika dalam sesi masuk, tombol aktif
3. Sistem cek GPS — harus dalam radius **150m** dari Bale Desa
4. Warga isi Nama dan pilih Dusun. Jika ada peserta lain di perangkat yang sama, tekan **"Tambah Nama"**
5. Data tersimpan dengan `jenis_absen: 'masuk'` untuk setiap nama

### Sesi Pulang (23:00 – 23:59 WIB)
1. Warga buka halaman yang sama
2. Sistem cek jam — otomatis mendeteksi sesi pulang
3. Sistem menampilkan semua nama yang sudah absen masuk dari perangkat ini
4. Hilangkan centang pada nama yang **pulang lebih awal**, lalu tekan SAYA PULANG RONDA
5. Sistem cek GPS — harus dalam radius **150m** dari Bale Desa
6. Data tersimpan dengan `jenis_absen: 'pulang'` untuk setiap nama yang dicentang

### Perhitungan Kehadiran
- **Hadir lengkap** = warga melakukan absen **masuk + pulang** di malam yang sama
- Hanya absen **pulang** yang dihitung sebagai kehadiran di leaderboard
- Tidak ada batasan jadwal — semua warga desa bebas absen

---

## Cara Develop Lokal

### Prasyarat
- Node.js 20+
- npm atau yarn
- Akun Supabase (gratis)

### Langkah-langkah

```bash
# 1. Clone repositori
git clone https://github.com/Albar19/absensi-ronda-kawunglarang.git
cd absensi-ronda-kawunglarang

# 2. Install dependencies
npm install

# 3. Setup environment variables
# Buat file .env.local dengan credential Supabase Anda (contoh ada di .env.local):
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx          # service_role key (server-only, JANGAN bocorkan)
JWT_SECRET=xxx                          # secret untuk token admin (sembarang string acak)
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=xxx                 # bcrypt hash password admin (lihat cara buat di bawah)
NEXT_PUBLIC_BASE_URL=https://xxx        # URL produksi untuk QR code (opsional, fallback ke domain saat dibuka)

# 4. Setup database
# Jalankan SQL migration di folder supabase/ SECARA BERURUTAN (urutan penting!):
#   1. migration_relawan.sql      # tabel absen_records + index
#   2. migration_multi_nama.sql   # index identitas nama+dusun
#   3. migration_jadwal.sql       # tabel jadwal_ronda + seed 7 hari
#   4. migration_warga.sql        # tabel warga (master, backfill dari absen_records)
#   5. migration_rate_limit.sql   # tabel + fungsi rate limiter persisten
# Jalankan lewat Supabase Dashboard → SQL Editor, satu per satu.

# 5. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

> **Membuat hash password admin (bcrypt):**
> ```bash
> node -e "const b=require('bcryptjs');const r=require('readline').createInterface({input:process.stdin,output:process.stdout});r.question('Password: ',p=>{console.log('ADMIN_PASSWORD_HASH='+b.hashSync(p,10));r.close()})"
> ```
> Salin hasilnya ke `.env.local` (dev) dan ke Vercel (produksi).
> **Catatan di `.env.local`:** tanda `$` di hash harus di-escape menjadi `\$` (di Vercel pakai nilai asli tanpa escape).

---

## Cara Deploy

### Deploy ke Vercel (rekomendasi)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Set environment variables di dashboard Vercel:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `NEXT_PUBLIC_BASE_URL` (opsional, untuk QR code)

### Deploy Manual
```bash
npm run build
npm start
```

---

## Struktur Folder

```
src/
├── app/
│   ├── page.tsx               # Halaman utama warga (absen masuk/pulang)
│   ├── layout.tsx             # Root layout + footer
│   ├── admin/
│   │   ├── page.tsx           # Login admin
│   │   └── dashboard/
│   │       └── page.tsx       # Dashboard admin (log + jadwal + leaderboard)
│   ├── tentang/
│   │   └── page.tsx           # Halaman tentang aplikasi
│   ├── kontak/
│   │   └── page.tsx           # Halaman kontak
│   └── api/
│       ├── absen/             # POST absen + GET (hari-ini, semua, cek-masuk, daftar-nama)
│       ├── auth/              # Login/logout admin (cookie JWT)
│       ├── jadwal/            # GET/PUT jadwal ronda + hari-ini + download
│       └── qr/                # GET QR Code (PNG)
├── components/
│   ├── admin/
│   │   └── ExportButton.tsx   # Tombol export Excel dengan modal bulan
│   └── citizen/
│       ├── HeaderBanner.tsx   # Header dengan jam real-time
│       ├── StatusCards.tsx    # Status jam + lokasi (masuk/pulang/tutup)
│       ├── SuccessScreen.tsx  # Tampilan sukses absen
│       └── RejectedScreen.tsx # Tampilan ditolak dengan alasan
└── lib/
    ├── config.ts              # Konfigurasi (jam, radius, dusun, petugas, hari)
    ├── data.ts                # Helper functions (cek jam, GPS, localStorage)
    ├── supabase.ts            # Supabase client
    └── types.ts               # Type definitions
supabase/
├── migration_relawan.sql      # Tabel absen_records + index
├── migration_multi_nama.sql   # Index identitas nama+dusun
├── migration_jadwal.sql       # Tabel jadwal_ronda + seed 7 hari
├── migration_warga.sql        # Tabel warga (master, backfill)
└── migration_rate_limit.sql   # Rate limiter persisten (tabel + fungsi)
```

---

## Konfigurasi

Semua konfigurasi di `src/lib/config.ts`:

```typescript
export const CONFIG = {
  namaDesa: 'Desa Kawunglarang',
  namaBalai: 'BALE DESA KAWUNGLARANG',
  subtitleAbsen: 'Absensi Ronda',

  // Koordinat Bale Desa (GPS)
  baleDesaLat: -7.166841,
  baleDesaLng: 108.481306,

  // Radius maksimal dari Bale Desa (meter)
  radiusMeter: 150,

  // Sesi Masuk: 20:00 - 22:00 WIB
  jamBukaMasuk: 20,
  menitBukaMasuk: 0,
  jamTutupMasuk: 22,
  menitTutupMasuk: 0,

  // Sesi Pulang: 23:00 - 23:59 WIB
  jamBukaPulang: 23,
  menitBukaPulang: 0,
  jamTutupPulang: 23,
  menitTutupPulang: 59,

  // 6 dusun
  dusunList: [
    'Dusun Bungbulang',
    'Dusun Cibangkong',
    'Dusun Desa',
    'Dusun Gudang',
    'Dusun Cibuluh',
    'Dusun Cihaurgeulis',
  ],

  // 6 dusun + Perangkat Desa (untuk jadwal ronda)
  petugasList: [
    'Dusun Bungbulang',
    'Dusun Cibangkong',
    'Dusun Desa',
    'Dusun Gudang',
    'Dusun Cibuluh',
    'Dusun Cihaurgeulis',
    'Perangkat Desa',
  ],

  // 7 hari
  hariList: ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'],
} as const;
```

**Yang bisa diubah tanpa coding:**
- Koordinat Bale Desa (jika pindah lokasi)
- Radius GPS (meter)
- Jam buka/tutup sesi masuk & pulang
- Daftar dusun
- Daftar petugas jadwal
- Daftar hari

---

## Untuk KKN Selanjutnya

### Cara menambah fitur baru

1. **Tambah halaman baru** → buat file di `src/app/` (contoh: `src/app/laporan/page.tsx`)
2. **Tambah API baru** → buat folder di `src/app/api/` (contoh: `src/app/api/laporan/route.ts`)
3. **Tambah komponen** → buat file di `src/components/`
4. **Tambah kolom database** → buat SQL migration di `supabase/` dan jalankan di Supabase dashboard

### Catatan penting

- **Database:** Semua operasi database melalui Supabase client (`src/lib/supabase.ts`) memakai `SUPABASE_SERVICE_ROLE_KEY` (server-only, tidak pernah dipakai di client).
- **Auth admin:** Menggunakan cookie `admin_token` dengan JWT sederhana (via `src/app/api/auth/`). Login WAJIB `ADMIN_PASSWORD_HASH` (bcrypt) — password plaintext tidak didukung. Tanpa env ini, login ditolak.
- **Validasi absen:** Jam sesi & tanggal ronda dihitung **server-side (WIB)**, GPS divalidasi 2x (client + server Haversine 150m).
- **Endpoint admin:** `/api/absen/semua`, `/api/absen/hari-ini`, `/api/jadwal*` butuh cookie admin (401 tanpa login).
- **Multi-nama per perangkat:** Karena keterbatasan perangkat, 1 HP bisa dipakai absen banyak warga. Saat sesi masuk ada tombol "Tambah Nama"; saat sesi pulang muncul checklist semua nama yang sudah absen masuk dari perangkat (yang pulang lebih awal bisa di-uncheck). Identitas absen berdasarkan **nama + dusun** (bukan device), sehingga dua orang dengan nama sama tapi dusun berbeda tetap dianggap berbeda.
- **Jam absen:** Server memakai waktu server WIB (UTC+7), bukan waktu client. Pastikan kelima tabel dibuat via migrasi di `supabase/` (urutan: `migration_relawan.sql` → `migration_multi_nama.sql` → `migration_jadwal.sql` → `migration_warga.sql` → `migration_rate_limit.sql`) di Supabase dashboard.

### Kontak

Jika ada pertanyaan atau perlu bantuan, hubungi:
- **KKN 46 UNIKU** — Desa Kawunglarang, Kecamatan Jalaksana, Kabupaten Kuningan

---

*Dibuat oleh KKN 46 Universitas Kuningan untuk Desa Kawunglarang*
