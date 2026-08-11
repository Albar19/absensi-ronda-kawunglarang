import type { AbsenRecord } from './types';

export interface HitungKehadiran {
  totalMasuk: number;
  totalPulang: number;
  totalLengkap: number;
  perDusun: Map<string, { masuk: number; pulang: number; lengkap: number }>;
  perTanggal: Map<string, Map<string, { masuk: number; pulang: number; lengkap: number }>>;
}

// Aturan kehadiran: HADIR (lengkap) hanya jika orang yang sama (nama+dusun)
// melakukan absen MASUK dan PULANG pada tanggal yang sama.
// Semua hitungan memakai ORANG UNIK per tanggal (bukan jumlah record) agar tidak
// terpengaruh record ganda (upsert absen yang sama berulang kali).
export function hitungKehadiran(records: AbsenRecord[]): HitungKehadiran {
  const masukSet = new Set<string>();
  const pulangSet = new Set<string>();
  const masukByDusun = new Map<string, Set<string>>();
  const pulangByDusun = new Map<string, Set<string>>();
  const perTanggalRaw = new Map<string, Map<string, { masuk: Set<string>; pulang: Set<string> }>>();

  for (const r of records) {
    if (!r.tanggal) continue;
    const key = `${r.nama}|${r.dusun}|${r.tanggal}`;
    if (r.jenisAbsen === 'masuk') {
      masukSet.add(key);
      let s = masukByDusun.get(r.dusun);
      if (!s) { s = new Set(); masukByDusun.set(r.dusun, s); }
      s.add(key);
    } else if (r.jenisAbsen === 'pulang') {
      pulangSet.add(key);
      let s = pulangByDusun.get(r.dusun);
      if (!s) { s = new Set(); pulangByDusun.set(r.dusun, s); }
      s.add(key);
    }

    let dm = perTanggalRaw.get(r.tanggal);
    if (!dm) { dm = new Map(); perTanggalRaw.set(r.tanggal, dm); }
    let ds = dm.get(r.dusun);
    if (!ds) { ds = { masuk: new Set(), pulang: new Set() }; dm.set(r.dusun, ds); }
    if (r.jenisAbsen === 'masuk') ds.masuk.add(key);
    else if (r.jenisAbsen === 'pulang') ds.pulang.add(key);
  }

  const lengkapSet = new Set([...masukSet].filter(k => pulangSet.has(k)));

  const perDusun = new Map<string, { masuk: number; pulang: number; lengkap: number }>();
  const allDusun = new Set([...masukByDusun.keys(), ...pulangByDusun.keys()]);
  allDusun.forEach(dusun => {
    const masuk = masukByDusun.get(dusun)?.size ?? 0;
    const pulang = pulangByDusun.get(dusun)?.size ?? 0;
    const lengkap = [...(masukByDusun.get(dusun) ?? [])].filter(k => pulangSet.has(k)).length;
    perDusun.set(dusun, { masuk, pulang, lengkap });
  });

  const perTanggal = new Map<string, Map<string, { masuk: number; pulang: number; lengkap: number }>>();
  perTanggalRaw.forEach((dm, t) => {
    const out = new Map<string, { masuk: number; pulang: number; lengkap: number }>();
    dm.forEach((ds, dusun) => {
      const lengkap = [...ds.masuk].filter(k => ds.pulang.has(k)).length;
      out.set(dusun, { masuk: ds.masuk.size, pulang: ds.pulang.size, lengkap });
    });
    perTanggal.set(t, out);
  });

  return {
    totalMasuk: masukSet.size,
    totalPulang: pulangSet.size,
    totalLengkap: lengkapSet.size,
    perDusun,
    perTanggal,
  };
}
