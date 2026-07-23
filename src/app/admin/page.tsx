'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, User, Eye, EyeOff, Shield } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/admin/dashboard');
      } else {
        setError(data.error || 'Username atau password salah.');
        setLoading(false);
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

          {/* Header */}
          <div className="bg-[#1e3a8a] px-6 py-7 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-4">
              <Shield size={30} className="text-white" strokeWidth={1.8} />
            </div>
            <h1 className="text-xl font-black tracking-wide text-white">ADMIN LOGIN</h1>
            <p className="text-sm text-blue-300 mt-1 font-medium">Bale Desa Kawunglarang</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-6 py-6 space-y-4">

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-xs font-black tracking-widest uppercase text-slate-400 mb-2">
                Username
              </label>
              <div className="relative">
                <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2} />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  autoComplete="username"
                  required
                  className="w-full pl-11 pr-4 border-2 border-slate-200 rounded-xl text-base font-semibold text-slate-900 placeholder:text-slate-300 focus:border-[#1e3a8a] focus:outline-none transition-colors"
                  style={{ minHeight: '52px', paddingTop: '14px', paddingBottom: '14px' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-black tracking-widest uppercase text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-11 pr-12 border-2 border-slate-200 rounded-xl text-base font-semibold text-slate-900 placeholder:text-slate-300 focus:border-[#1e3a8a] focus:outline-none transition-colors"
                  style={{ minHeight: '52px', paddingTop: '14px', paddingBottom: '14px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  style={{ minHeight: 'unset' }}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <span className="text-red-500 text-base mt-0.5 flex-shrink-0">⚠️</span>
                <p className="text-sm font-bold text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-xl font-black text-lg tracking-wide transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ minHeight: '54px' }}
            >
              {loading ? '⏳ Masuk…' : 'MASUK'}
            </button>

            <div className="text-center pt-1">
              <Link href="/" className="text-xs text-slate-400 underline hover:text-slate-600 transition-colors">
                ← Kembali ke Halaman Absen
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          Sistem Absensi Ronda — Bale Desa Kawunglarang
        </p>
      </div>
    </main>
  );
}