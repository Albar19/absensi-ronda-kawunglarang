import Link from 'next/link';
import { ArrowLeft, Mail, MapPin, ExternalLink } from 'lucide-react';

export default function KontakPage() {
  return (
    <div className="min-h-screen bg-slate-100 sm:py-8 lg:py-12">
      <div className="w-full sm:max-w-lg mx-auto bg-white sm:rounded-2xl sm:shadow-lg overflow-hidden">

        {/* Header */}
        <div className="bg-navy text-white px-5 sm:px-8 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-blue-200 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black tracking-wide">Kontak</h1>
          <p className="text-blue-200 text-sm font-medium mt-1">
            Hubungi pengembang untuk info lebih lanjut
          </p>
        </div>

        {/* Gold divider */}
        <div className="h-1.5 bg-gold" />

        <div className="px-5 sm:px-8 py-6 space-y-6">

          {/* ─── GitHub (main) ─── */}
          <section className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-slate-900">GitHub Repository</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Source code dan dokumentasi untuk pengembang selanjutnya.
                </p>
                <a
                  href="https://github.com/Albar19/absensi-ronda-kawunglarang"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-navy hover:text-blue-700 transition-colors bg-white border border-slate-200 rounded-lg px-3 py-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  github.com/Albar19/absensi-ronda-kawunglarang
                </a>
              </div>
            </div>
          </section>

          {/* ─── Tim ─── */}
          <section className="bg-navy/5 border border-navy/10 rounded-xl p-5">
            <h2 className="text-base font-black text-slate-900 mb-3">Tim Pengembang</h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-navy/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-navy" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Desa Kawunglarang</p>
                  <p className="text-xs text-slate-500">
                    Kecamatan Jalaksana, Kabupaten Kuningan, Jawa Barat
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-navy/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-navy" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">KKN 46 Universitas Kuningan</p>
                  <p className="text-xs text-slate-500">
                    Untuk melanjutkan pengembangan, kunjungi repository GitHub di atas.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ─── Link balik ─── */}
          <div className="text-center pb-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-navy hover:text-blue-700 transition-colors"
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
