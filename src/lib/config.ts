export const CONFIG = {
  namaDesa: 'Desa Kawunglarang',
  namaBalai: 'BALE DESA KAWUNGLARANG',
  subtitleAbsen: 'Absensi Ronda',

  baleDesaLat: -7.166841,
  baleDesaLng: 108.481306,

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

  // Daftar dusun
  dusunList: ['Dusun Bungbulang', 'Dusun Cibangkong', 'Dusun Desa', 'Dusun Gudang', 'Dusun Cibuluh', 'Dusun Cihaurgeulis'],

  // Daftar petugas ronda (6 dusun + perangkat desa)
  petugasList: ['Dusun Bungbulang', 'Dusun Cibangkong', 'Dusun Desa', 'Dusun Gudang', 'Dusun Cibuluh', 'Dusun Cihaurgeulis', 'Perangkat Desa'],

  // Daftar hari
  hariList: ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'],
} as const;

export type JenisAbsen = 'masuk' | 'pulang';
export type Hari = 'senin' | 'selasa' | 'rabu' | 'kamis' | 'jumat' | 'sabtu' | 'minggu';