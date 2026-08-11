import { supabase } from '@/lib/supabase';

// Rate limiter persisten berbasis Supabase (jalan di serverless).
// Mengembalikan true jika request diizinkan, false jika melewati batas.
// Fail-open bila tabel/fungsi belum ada agar absen tidak terblokir total.
export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('rate_limit_check', {
    p_key: key,
    p_max: max,
    p_window_ms: windowMs,
  });

  if (error) {
    console.error(`[rate-limit] ${key}:`, error.message);
    return true;
  }

  return data === true;
}

// Ambil IP client dari header yang dipercaya platform hosting (Vercel/Cloudflare).
// x-forwarded-for bisa dipalsukan client, jadi hanya dipakai sebagai fallback.
export function getClientIp(request: Request): string {
  const vercel = request.headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0]?.trim() || 'unknown';
  const cloudflare = request.headers.get('cf-connecting-ip');
  if (cloudflare) return cloudflare.trim() || 'unknown';
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return 'unknown';
}