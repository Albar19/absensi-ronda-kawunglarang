'use client';

import { AlertTriangle, X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export default function ConfirmModal({ open, title, children, onClose }: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Kartu */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-5 pt-5 flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} strokeWidth={2} />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-slate-900 leading-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            style={{ minWidth: '36px', minHeight: '36px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-3 pb-5 text-sm text-slate-600 font-medium leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}