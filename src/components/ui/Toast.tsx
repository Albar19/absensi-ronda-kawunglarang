'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  leaving: boolean;
}

interface ToastContextValue {
  push: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam <ToastProvider>');
  return ctx;
}

const STYLE: Record<ToastType, { bar: string; box: string; icon: ReactNode }> = {
  success: {
    bar: 'bg-green-500',
    box: 'bg-white border-slate-200',
    icon: <CheckCircle size={20} className="text-green-600" strokeWidth={2.2} />,
  },
  error: {
    bar: 'bg-red-500',
    box: 'bg-white border-slate-200',
    icon: <XCircle size={20} className="text-red-600" strokeWidth={2.2} />,
  },
  info: {
    bar: 'bg-blue-500',
    box: 'bg-white border-slate-200',
    icon: <Info size={20} className="text-blue-600" strokeWidth={2.2} />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 250);
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev.slice(-3), { id, type, message, leaving: false }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}

      {/* Toast container — tengah atas, di bawah navbar */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 space-y-2 pointer-events-none" aria-live="polite">
        {toasts.map(t => {
          const s = STYLE[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto relative flex items-start gap-3 rounded-xl border shadow-lg overflow-hidden transition-all duration-250 ${
                s.box
              } ${t.leaving ? 'opacity-0 translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}
              style={{ minHeight: '56px' }}
            >
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />
              <span className="pl-4 pt-3.5 pb-3.5 flex-shrink-0">{s.icon}</span>
              <p className="flex-1 min-w-0 pt-3.5 pb-3.5 pr-2 text-sm font-semibold text-slate-800 leading-snug">
                {t.message}
              </p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label="Tutup notifikasi"
                className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                style={{ minWidth: '40px', minHeight: '40px' }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
