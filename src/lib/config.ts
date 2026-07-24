export const CONFIG = {
  namaDesa: 'Desa Kawunglarang',
  namaBalai: 'BALE DESA KAWUNGLARANG',
  subtitleAbsen: 'Absensi Ronda',

  baleDesaLat: -7.166841,
  baleDesaLng: 108.481306,

  radiusMeter: 150,

  // Absen Masuk: 20:00 - 23:39
  jamBukaAbsen: 20,
  menitBukaAbsen: 0,
  jamTutupAbsen: 23,
  menitTutupAbsen: 39,

  // Absen Pulang: 23:40 - 01:00
  jamBukaPulang: 23,
  menitBukaPulang: 40,
  jamTutupPulang: 1,
  menitTutupPulang: 0,
} as const;