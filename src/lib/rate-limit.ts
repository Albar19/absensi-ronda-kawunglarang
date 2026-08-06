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