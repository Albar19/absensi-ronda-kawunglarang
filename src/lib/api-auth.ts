import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

// Cek apakah request berasal dari admin yang sudah login (cookie admin_token valid).
// Hanya boleh dipanggil dari Route Handler (server-side).
export async function isAdminRequest(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload !== null && payload.role === 'admin';
}
