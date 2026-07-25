import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Absensi Ronda - Kawunglarang',
  description: 'Sistem absensi ronda malam resmi Desa Kawunglarang. Catat kehadiran ronda dengan mudah dan cepat.',
  keywords: 'absensi, ronda, desa kawunglarang, ronda malam, keamanan desa',
  authors: [{ name: 'KKN 46 Kawunglarang UNIKU' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className="font-sans antialiased bg-slate-50 min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>

        <footer className="bg-[#1e3a8a] text-white">
          {/* Gold top stripe */}
          <div className="h-1 bg-[#f59e0b]" />

          <div className="max-w-4xl mx-auto px-4 py-5">
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold">
              <Link
                href="/tentang"
                className="text-blue-200 hover:text-white transition-colors"
              >
                Tentang
              </Link>
              <Link
                href="/kontak"
                className="text-blue-200 hover:text-white transition-colors"
              >
                Kontak
              </Link>
              <a
                href="https://github.com/Albar19/absensi-ronda-kawunglarang"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-200 hover:text-white transition-colors inline-flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
            </nav>

            <p className="text-center text-[11px] text-blue-400 font-medium mt-3 tracking-wide">
              KKN 46 Kawunglarang — Universitas Kuningan
            </p>
          </div>

          {/* Shadow underline */}
          <div className="h-0.5 bg-blue-900/80" />
        </footer>
      </body>
    </html>
  );
}
