import React from 'react';
import { RefreshCw, Download, Trash2, ShieldCheck, Layers, Package, Sparkles } from 'lucide-react';

export default function Navbar({ stats, onRefreshAll, onExportCsv, onClearDb, isRefreshingAll, onOpenConfig, isBackendConnected }) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-rose-500/25 ring-2 ring-white">
            K
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Kapas
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200/60">
                <Sparkles className="w-3 h-3 text-rose-500" /> Analytics
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Аналитическая платформа для Kaspi Магазина
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="hidden lg:flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/60 text-xs flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">Товаров:</span>
            <span className="font-bold text-slate-900">{stats?.total_products || 0}</span>
          </div>
          
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs flex items-center gap-2 text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">Эксклюзивов:</span>
            <span className="font-extrabold text-emerald-900">{stats?.exclusive_products || 0}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/60 text-xs flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">Категорий:</span>
            <span className="font-bold text-slate-900">{stats?.categories_count || 0}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshAll}
            disabled={isRefreshingAll}
            title="Обновить данные по всем товарам в базе"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAll ? 'animate-spin text-rose-600' : 'text-slate-600'}`} />
            <span className="hidden sm:inline">Обновить всё</span>
          </button>

          <button
            onClick={onExportCsv}
            title="Скачать таблицу в CSV для Excel"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-xl hover:bg-emerald-100/80 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Экспорт CSV</span>
          </button>

          <button
            onClick={onOpenConfig}
            title={isBackendConnected ? "Бэкенд подключен" : "Настроить подключение к бэкенду"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition shadow-xs ${
              isBackendConnected
                ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 animate-pulse'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="hidden md:inline">API</span>
          </button>

          <button
            onClick={onClearDb}
            title="Очистить базу данных"
            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition border border-transparent hover:border-rose-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

