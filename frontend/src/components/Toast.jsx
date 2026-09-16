import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isError = toast.type === 'error';
  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-bounce-short">
      <div className={`flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
        isError
          ? 'bg-rose-950/90 border-rose-800 text-rose-100 shadow-rose-950/40'
          : isSuccess
          ? 'bg-emerald-950/90 border-emerald-800 text-emerald-100 shadow-emerald-950/40'
          : 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-slate-950/40'
      }`}>
        <div className="shrink-0 mt-0.5">
          {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
          {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {!isError && !isSuccess && <Info className="w-5 h-5 text-sky-400" />}
        </div>
        <div className="flex-1 text-xs font-medium leading-relaxed">
          {toast.message}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-slate-400 hover:text-white transition p-0.5 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

