import React, { useState } from 'react';
import { Search, Play, X, Loader2, Globe, Layers, Infinity, Flame } from 'lucide-react';

export default function Scanner({ onStartScan, onCancelScan, scanStatus }) {
  const [mode, setMode] = useState('query'); // 'query' (определенный товар) | 'all_kaspi' (весь маркетплейс)
  const [query, setQuery] = useState('airpods');
  const [pages, setPages] = useState('0'); // '0' = БЕЗ ОГРАНИЧЕНИЙ (все страницы)

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'query' && !query.trim()) return;
    onStartScan(query.trim(), Number(pages), mode);
  };

  const isRunning = scanStatus?.is_running;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs relative overflow-hidden space-y-4">
      {/* Mode Selection Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-rose-600" />
            Режим сбора товаров с Kaspi.kz
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Парсинг без ограничений по страницам со сквозным сохранением в базу
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            disabled={isRunning}
            onClick={() => setMode('query')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              mode === 'query'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-rose-600" />
            <span>Определенный товар</span>
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={() => setMode('all_kaspi')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              mode === 'all_kaspi'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Парсить вообще ВСЁ на Kaspi</span>
          </button>
        </div>
      </div>

      {/* Form controls */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Query input (active only if mode === 'query') */}
          <div className="relative flex-1">
            {mode === 'query' ? (
              <>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={isRunning}
                  placeholder="Введите любой товар (напр. 'айфон', 'ноутбук', 'кроссовки')..."
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition font-medium"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
              </>
            ) : (
              <div className="w-full pl-11 pr-4 py-3 text-sm bg-rose-50/50 border border-rose-200 rounded-2xl text-rose-950 font-bold flex items-center gap-2">
                <Globe className="w-4 h-4 text-rose-600 absolute left-4 top-4" />
                <span>Глобальный сбор: парсинг абсолютно всех категорий и товаров маркетплейса подряд</span>
              </div>
            )}
          </div>

          {/* Pages control */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs">
              <span className="text-slate-500 font-semibold mr-2 whitespace-nowrap">Лимит страниц:</span>
              <select
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                disabled={isRunning}
                className="bg-transparent font-extrabold text-rose-600 focus:outline-none cursor-pointer"
              >
                <option value="0">⚡ ВСЕ страницы (без ограничений)</option>
                <option value="10">10 страниц (~120 товаров)</option>
                <option value="25">25 страниц (~300 товаров)</option>
                <option value="50">50 страниц (~600 товаров)</option>
                <option value="100">100 страниц (~1200 товаров)</option>
                <option value="300">300 страниц (~3600 товаров)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isRunning || (mode === 'query' && !query.trim())}
              className="px-6 py-3 text-sm font-black text-white badge-kaspi-gradient hover:opacity-95 rounded-2xl transition flex items-center justify-center gap-2 shadow-md shadow-rose-600/25 disabled:opacity-50 shrink-0"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Идёт сбор...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>{mode === 'all_kaspi' ? 'Собрать весь Kaspi' : 'Найти все товары'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick helper info */}
        {mode === 'query' && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-500">Примеры:</span>
            {['airpods', 'iphone 16', 'ноутбук', 'кофемашина', 'робот пылесос'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setQuery(item);
                  onStartScan(item, Number(pages), 'query');
                }}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-[11px] font-medium transition"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Live Streaming Progress Box */}
      {isRunning && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xl space-y-3 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping absolute"></div>
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              </div>
              <span className="font-bold text-slate-100 truncate">
                {scanStatus?.current_step || 'Парсинг страниц и товаров...'}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 text-[11px] font-mono">
                {scanStatus?.speed && (
                  <span className="bg-rose-950/80 text-rose-300 border border-rose-800/80 px-2 py-0.5 rounded-md font-extrabold flex items-center gap-1">
                    ⚡ {scanStatus.speed}
                  </span>
                )}
                <span className="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-md font-bold">
                  {scanStatus?.processed || 0} товаров сохранено
                </span>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                  Стр: {scanStatus?.pages_scanned || 1}
                </span>
              </div>
              <button
                type="button"
                onClick={onCancelScan}
                className="px-2.5 py-1 text-xs text-rose-300 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 rounded-lg font-bold transition"
              >
                Остановить
              </button>
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-rose-500 to-red-400 h-2 rounded-full transition-all duration-300 animate-pulse"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
