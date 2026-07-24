# Absensi Ronda — Desa Kawunglarang

Sistem absensi ronda malam berbasis web untuk **Desa Kawunglarang**, dikembangkan oleh **KKN 46 Universitas Kuningan**.

> **Dibuat untuk:** Pemerintah Desa Kawunglarang  
> **Oleh:** KKN 46 UNIKU  
> **Tahun:** 2026

---

## 📋 Daftar Isi

- [Fitur](#-fitur)
- [Tech Stack](#-tech-stack)
- [Struktur Database](#-struktur-database)
- [Alur Absen](#-alur-absen)
- [Cara Develop Lokal](#-cara-develop-lokal)
- [Cara Deploy](#-cara-deploy)
- [Struktur Folder](#-struktur-folder)
- [Konfigurasi](#-konfigurasi)
- [Untuk KKN Selanjutnya](#-untuk-kkn-selanjutnya)

---

## ✨ Fitur

| Fitur | Deskripsi |
|-------|-----------|
| **Absen Masuk** | Warga scan QR, cek GPS (radius 150m dari Bale Desa), absen masuk (20:00–23:39 WIB) |
| **Absen Pulang** | Warga scan QR lagi, absen pulang (23:40–01:00 WIB) — wajib sudah absen masuk |
| **Jadwal Harian Tetap** | Admin atur jadwal ronda per hari (Senin–Minggu) |
| **Dashboard Admin** | Rekap kehadiran per dusun, persentase 30 hari, filter/search |
| **Export Excel** | Export rekap + detail absensi per bulan ke file `.xlsx` |
| **QR Code** | Download QR Code untuk ditempel di Bale Desa |
| **1 HP 1 Nama** | Mencegah absen bergantian dalam 1 HP |

---

## 🛠 Tech Stack

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

## 🗄 Struktur Database

### Tabel `warga`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | text (PK) | ID warga (format: WG-XXX) |
| `nama` | text | Nama lengkap |
| `dusun` | text | Dusun (Dusun 1–6) |

### Tabel `dusun_list`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | int8 (PK) | Auto increment |
| `nama` | text | Nama dusun |

### Tabel `jadwal_ronda`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | uuid (PK) | Auto generate |
| `hari` | text | Senin–Minggu |
| `warga_id` | text | FK ke warga.id |
| `shift` | text | Selalu "malam" |
| `keterangan` | text | Opsional (tidak dipakai lagi) |
| `created_at` | timestamptz | Auto timestamp |

### Tabel `absen_records`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | text (PK) | Generate dari frontend |
| `warga_id` | text | FK ke warga.id |
| `nama` | text | Nama (denormalized) |
| `dusun` | text | Dusun (denormalized) |
| `tanggal` | date | Tanggal absen |
| `jam_absen` | time | Jam absen |
| `jarak_meter` | int8 | Jarak dari Bale Desa (meter) |
| `koordinat_lat` | float8 | Latitude GPS |
| `koordinat_lng` | float8 | Longitude GPS |
| `status` | text | "hadir" |
| `jenis` | text | "masuk" atau "pulang" |

---

## 🔄 Alur Absen

### Absen Masuk (20:00–23:39 WIB)
1. Warga scan QR Code di Bale Desa
2. Sistem cek jadwal — hanya warga terjadwal bisa absen
3. Sistem cek GPS — harus dalam radius 150m dari Bale Desa
4. Warga tekan **MULAI ABSEN** → **KIRIM ABSEN**
5. Data tersimpan dengan `jenis: 'masuk'`

### Absen Pulang (23:40–01:00 WIB)
1. Warga scan QR Code yang sama
2. Sistem cek apakah sudah absen masuk hari ini — jika belum, ditolak
3. Sistem cek GPS — harus dalam radius 150m dari Bale Desa
4. Warga tekan **ABSEN PULANG** → **KIRIM ABSEN PULANG**
5. Data tersimpan dengan `jenis: 'pulang'`

### Perhitungan Kehadiran
- **1 hari dihitung hadir** hanya jika warga melakukan **masuk + pulang** di hari yang sama
- Jika hanya masuk tanpa pulang → tidak dihitung sebagai hadir
- Persentase = (jumlah hari hadir / jumlah jadwal dalam 30 hari) × 100%

---

## 🚀 Cara Develop Lokal

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
# Buat file .env.local (lihat contoh di .env.example)
# Isi dengan credential Supabase Anda:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# 4. Setup database
# Jalankan SQL migration di folder supabase/ secara berurutan:
# - migration_rt_to_dusun.sql
# - migration_tanggal_to_hari.sql
# - migration_add_jenis.sql

# 5. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## 🌐 Cara Deploy

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

## 📁 Struktur Folder

```
src/
├── app/
│   ├── absen/[wargaId]/    # Halaman absen warga (scan QR)
│   ├── admin/
│   │   ├── page.tsx         # Login admin
│   │   ├── dashboard/       # Dashboard utama
│   │   ├── jadwal/          # Manajemen jadwal
│   │   └── warga/           # Manajemen warga
│   └── api/
│       ├── absen/           # CRUD absensi
│       ├── auth/            # Login/logout admin
│       ├── dusun/           # CRUD dusun
│       ├── jadwal/          # CRUD jadwal
│       ├── migrasi/         # Migrasi RT→Dusun
│       ├── qr/              # Download QR Code
│       └── warga/           # CRUD warga
├── components/
│   ├── admin/               # Komponen dashboard admin
│   └── citizen/             # Komponen halaman warga
└── lib/
    ├── config.ts            # Konfigurasi (jam absen, radius, dll)
    ├── data.ts              # Helper functions
    ├── supabase.ts          # Supabase client
    └── types.ts             # Type definitions
supabase/
├── migration_rt_to_dusun.sql
├── migration_tanggal_to_hari.sql
└── migration_add_jenis.sql
```

---

## ⚙️ Konfigurasi

Semua konfigurasi ada di `src/lib/config.ts`:

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

  // Jam absen masuk: 20:00 - 23:39
  jamBukaAbsen: 20,
  menitBukaAbsen: 0,
  jamTutupAbsen: 23,
  menitTutupAbsen: 39,

  // Jam absen pulang: 23:40 - 01:00
  jamBukaPulang: 23,
  menitBukaPulang: 40,
  jamTutupPulang: 1,
  menitTutupPulang: 0,
};
```

**Yang bisa diubah tanpa coding:**
- Koordinat Bale Desa (jika pindah lokasi)
- Radius GPS (meter)
- Jam buka/tutup absen masuk & pulang

---

## 📝 Untuk Continue the Development

### Cara menambah fitur baru

1. **Tambah halaman baru** → buat folder di `src/app/` (contoh: `src/app/admin/laporan/page.tsx`)
2. **Tambah API baru** → buat folder di `src/app/api/` (contoh: `src/app/api/laporan/route.ts`)
3. **Tambah komponen** → buat file di `src/components/`
4. **Tambah kolom database** → buat SQL migration di `supabase/` dan jalankan di Supabase dashboard

### Catatan penting

- **Database:** Semua operasi database melalui Supabase client (`src/lib/supabase.ts`)
- **Auth admin:** Menggunakan cookie `admin_token` dengan JWT sederhana (`src/lib/auth.ts`)
- **1 HP 1 Nama:** Menggunakan localStorage — tidak 100% aman tapi cukup untuk preventif dasar
- **Validasi GPS:** Dilakukan 2x (client-side + server-side) untuk keamanan
- **Jam absen:** Menggunakan waktu server/client — pastikan zona waktu sudah sesuai (WIB)

### Kontak

Jika ada pertanyaan atau perlu bantuan, hubungi:
- **KKN 46 UNIKU** — Desa Kawunglarang, Kecamatan Jalaksana, Kabupaten Kuningan

---

*Dibuat dengan ❤️ oleh KKN 46 Universitas Kuningan untuk Desa Kawunglarang*