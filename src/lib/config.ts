export const CONFIG = {
  namaDesa: 'Desa Kawunglarang',
  namaBalai: 'BALE DESA KAWUNGLARANG',
  subtitleAbsen: 'Absensi Ronda',

  baleDesaLat: -7.166841,
  baleDesaLng: 108.481306,

  radiusMeter: 50,

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

  // Daftar dusun (6 dusun + Perangkat Desa untuk absen)
  dusunList: ['Dusun Bungbulang', 'Dusun Cibangkong', 'Dusun Desa', 'Dusun Gudang', 'Dusun Cibuluh', 'Dusun Cihaurgeulis', 'Perangkat Desa'],

  // Daftar petugas ronda (6 dusun + perangkat desa)
  petugasList: ['Dusun Bungbulang', 'Dusun Cibangkong', 'Dusun Desa', 'Dusun Gudang', 'Dusun Cibuluh', 'Dusun Cihaurgeulis', 'Perangkat Desa'],

  // Daftar hari
  hariList: ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'],
} as const;

export type JenisAbsen = 'masuk' | 'pulang';