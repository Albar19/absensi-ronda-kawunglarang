import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      await supabase
        .from('admin_users')
        .update({ active_session: null })
        .eq('username', payload.username);
    }
  }

  cookieStore.delete('admin_token');
  return NextResponse.json({ success: true });
}