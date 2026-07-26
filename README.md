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
| **Absen Masuk** | Warga buka halaman, cek GPS (radius 150m dari Bale Desa), absen masuk (20:00–23:40 WIB) |
| **Absen Pulang** | Warga absen pulang (23:40–01:00 WIB) — wajib sudah absen masuk malam ini |
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
| `id` | text (PK) | Generate dari frontend |
| `device_id` | text | ID perangkat unik (localStorage) |
| `nama` | text | Nama warga (denormalized) |
| `dusun` | text | Dusun warga (denormalized) |
| `tanggal` | date | Tanggal ronda |
| `tanggal_ronda` | text | Tanggal ronda (format YYYY-MM-DD, indexed) |
| `jam_absen` | text | Jam absen HH:MM:SS |
| `jenis_absen` | text | `"masuk"` atau `"pulang"` (indexed) |
| `latitude` | float8 | Latitude GPS |
| `longitude` | float8 | Longitude GPS |
| `jarak_meter` | int8 | Jarak dari Bale Desa (meter) |
| `created_at` | timestamptz | Auto timestamp |

Unique constraint: `(device_id, tanggal_ronda, jenis_absen)` — 1 device 1 absen per jenis per malam.

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

### Sesi Masuk (20:00 – 23:40 WIB)
1. Warga buka halaman absen (scan QR atau buka URL)
2. Sistem cek jam — jika dalam sesi masuk, tombol aktif
3. Sistem cek GPS — harus dalam radius **150m** dari Bale Desa
4. Warga isi Nama dan pilih Dusun
5. Data tersimpan dengan `jenis_absen: 'masuk'`

### Sesi Pulang (23:40 – 01:00 WIB — melewati tengah malam)
1. Warga buka halaman yang sama
2. Sistem cek jam — otomatis mendeteksi sesi pulang
3. Sistem verifikasi apakah sudah absen masuk hari ini — jika belum, absen ditolak
4. Sistem cek GPS — harus dalam radius **150m** dari Bale Desa
5. Data tersimpan dengan `jenis_absen: 'pulang'`

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
# Buat file .env.local dengan credential Supabase Anda:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# 4. Setup database
# Jalankan SQL migration di folder supabase/ secara berurutan:
# - migration_relawan.sql
# - migration_jadwal.sql

# 5. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

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
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

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
│       ├── absen/             # POST absen + GET hari-ini + cek-masuk + semua
│       ├── auth/              # Login/logout admin (cookie JWT)
│       ├── jadwal/            # GET/PUT jadwal ronda + hari-ini
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
└── migration_jadwal.sql       # Tabel jadwal_ronda + seed 7 hari
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

  // Sesi Masuk: 20:00 - 23:40 WIB
  jamBukaMasuk: 20,
  menitBukaMasuk: 0,
  jamTutupMasuk: 23,
  menitTutupMasuk: 40,

  // Sesi Pulang: 23:40 - 01:00 WIB (melewati tengah malam)
  jamBukaPulang: 23,
  menitBukaPulang: 40,
  jamTutupPulang: 1,
  menitTutupPulang: 0,

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

- **Database:** Semua operasi database melalui Supabase client (`src/lib/supabase.ts`)
- **Auth admin:** Menggunakan cookie `admin_token` dengan JWT sederhana (via `src/app/api/auth/`)
- **Device ID:** Menggunakan localStorage untuk upsert — mencegah absen ganda dari device sama
- **Validasi GPS:** Dilakukan 2x (client-side + server-side) untuk keamanan
- **Jam absen:** Menggunakan waktu client — pastikan zona waktu sudah sesuai (WIB)

### Kontak

Jika ada pertanyaan atau perlu bantuan, hubungi:
- **KKN 46 UNIKU** — Desa Kawunglarang, Kecamatan Jalaksana, Kabupaten Kuningan

---

*Dibuat oleh KKN 46 Universitas Kuningan untuk Desa Kawunglarang*
