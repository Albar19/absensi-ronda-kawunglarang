'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/admin/dashboard');
      } else {
        setError(data.error || 'Username atau password salah. Coba lagi.');
        setLoading(false);
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e3a8a] px-6 py-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock size={30} className="text-white" strokeWidth={2} />
          </div>
          <h1 className="text-xl font-black tracking-wide">ADMIN LOGIN</h1>
          <p className="text-sm text-blue-200 mt-1">Bale Desa Kawunglarang</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="px-6 py-6 space-y-5">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Username
            </label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                autoComplete="username"
                required
                className="w-full pl-11 pr-4 py-4 border-2 border-slate-300 rounded-xl text-base font-semibold text-slate-900 focus:border-[#1e3a8a] focus:outline-none transition-colors"
                style={{ minHeight: '56px' }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                required
                className="w-full pl-11 pr-12 py-4 border-2 border-slate-300 rounded-xl text-base font-semibold text-slate-900 focus:border-[#1e3a8a] focus:outline-none transition-colors"
                style={{ minHeight: '56px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600"
                style={{ minHeight: 'auto' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-2 border-red-400 rounded-xl px-4 py-3">
              <p className="text-sm font-bold text-red-700">⚠️ {error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e3a8a] text-white rounded-xl py-4 text-lg font-black tracking-wide transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ minHeight: '56px' }}
          >
            {loading ? '⏳ Masuk...' : 'MASUK'}
          </button>

          {/* Back */}
          <div className="text-center">
            <Link href="/" className="text-sm text-slate-400 underline hover:text-slate-600">
              ← Kembali ke Halaman Absen
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}