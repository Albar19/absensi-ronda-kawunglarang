import Link from 'next/link';
import { ArrowLeft, MapPin, Clock, Smartphone, QrCode, ShieldCheck, Download, FileSpreadsheet, Calendar, BarChart3, List } from 'lucide-react';

const fiturList = [
  {
    icon: QrCode,
    title: 'Absen via QR Code',
    desc: 'Warga scan QR Code di Bale Desa untuk absen masuk dan pulang.',
  },
  {
    icon: MapPin,
    title: 'Verifikasi GPS',
    desc: 'Cek lokasi otomatis — hanya dalam radius 150m dari Bale Desa.',
  },
  {
    icon: Clock,
    title: 'Jam Absen Otomatis',
    desc: 'Absen masuk 20:00–23:40 WIB, absen pulang 23:40–01:00 WIB.',
  },
  {
    icon: ShieldCheck,
    title: '1 Perangkat = 1 Warga',
    desc: 'Setiap perangkat hanya bisa digunakan oleh 1 nama. Mencegah titip absen. Dusun bisa diubah langsung. Hubungi Admin jika ada kesalahan nama.',
  },
  {
    icon: Smartphone,
    title: 'Responsive Mobile',
    desc: 'Tampilan optimal di HP warga saat absen di lapangan.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Export Excel',
    desc: 'Download rekap hadir lengkap per bulan dalam format .xlsx dengan tampilan profesional.',
  },
  {
    icon: Download,
    title: 'Download QR Card',
    desc: 'Cetak QR Code untuk ditempel di Bale Desa.',
  },
  {
    icon: Calendar,
    title: 'Jadwal Ronda Mingguan',
    desc: 'Admin atur petugas ronda setiap hari (Senin — Minggu) via dropdown.',
  },
  {
    icon: BarChart3,
    title: 'Leaderboard Dusun',
    desc: 'Progress bar kehadiran per dusun, hanya absen pulang yang dihitung.',
  },
  {
    icon: List,
    title: 'Autocomplete Nama',
    desc: 'Saat ketik nama, otomatis muncul saran dari nama yang pernah absen sebelumnya.',
  },
];

const techStack = [
  { label: 'Next.js 16', desc: 'App Router fullstack' },
  { label: 'TypeScript', desc: 'Type safety' },
  { label: 'Tailwind CSS', desc: 'Utility-first styling' },
  { label: 'Supabase', desc: 'PostgreSQL database' },
  { label: 'Lucide React', desc: 'Icon library' },
  { label: 'ExcelJS', desc: 'Export Excel dengan styling' },
  { label: 'Vercel', desc: 'Hosting & deploy' },
];

export default function TentangPage() {
  return (
    <div className="min-h-screen bg-slate-100 sm:py-8 lg:py-12">
      <div className="w-full sm:max-w-2xl mx-auto bg-white sm:rounded-2xl sm:shadow-lg overflow-hidden">

        {/* Header */}
        <div className="bg-[#1e3a8a] text-white px-5 sm:px-8 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-blue-200 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black tracking-wide">Tentang Aplikasi</h1>
          <p className="text-blue-200 text-sm font-medium mt-1">
            Absensi Ronda — Desa Kawunglarang
          </p>
        </div>

        {/* Gold divider */}
        <div className="h-1.5 bg-[#f59e0b]" />

        <div className="px-5 sm:px-8 py-6 space-y-8">

          {/* ─── Deskripsi ─── */}
          <section>
            <h2 className="text-lg font-black text-slate-900 mb-3">Sistem Absensi Ronda Malam</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Aplikasi absensi ronda malam berbasis web untuk <strong>Desa Kawunglarang</strong>, 
              dikembangkan oleh <strong>KKN 46 Universitas Kuningan</strong>.
              Memudahkan pencatatan kehadiran ronda dengan verifikasi GPS dan QR Code,
              serta dashboard admin untuk rekap dan monitoring.
            </p>
          </section>

          {/* ─── Fitur ─── */}
          <section>
            <h2 className="text-lg font-black text-slate-900 mb-4">Fitur</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {fiturList.map((f, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#1e3a8a]/10 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-5 h-5 text-[#1e3a8a]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{f.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ─── Tech Stack ─── */}
          <section>
            <h2 className="text-lg font-black text-slate-900 mb-4">Tech Stack</h2>
            <div className="flex flex-wrap gap-2">
              {techStack.map((t, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {t.label}
                  <span className="text-slate-400 font-normal">— {t.desc}</span>
                </span>
              ))}
            </div>
          </section>

          {/* ─── Tim ─── */}
          <section className="bg-[#1e3a8a]/5 border border-[#1e3a8a]/10 rounded-xl p-5">
            <h2 className="text-lg font-black text-slate-900 mb-2">Tim Pengembang</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Dikembangkan oleh <strong>KKN 46 Universitas Kuningan</strong> untuk 
              Pemerintah Desa Kawunglarang, Kecamatan Jalaksana, Kabupaten Kuningan.
            </p>
            <a
              href="https://github.com/Albar19/absensi-ronda-kawunglarang"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-sm font-bold text-[#1e3a8a] hover:text-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Lihat di GitHub
            </a>
          </section>

          {/* ─── Link balik ─── */}
          <div className="text-center pb-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1e3a8a] hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Halaman Absen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
