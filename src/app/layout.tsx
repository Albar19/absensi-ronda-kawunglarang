import type { Metadata, Viewport } from 'next';
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
      <body className="font-sans antialiased bg-slate-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
