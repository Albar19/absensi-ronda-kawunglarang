import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';

// Proteksi server-side: halaman dashboard hanya bisa diakses admin yang login.
// (Lapisan tambahan di atas proteksi client-side di page.tsx)
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload || payload.role !== 'admin') {
    redirect('/admin');
  }

  return <>{children}</>;
}