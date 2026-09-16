import React from 'react';
import {
  Smartphone,
  Tv,
  Home,
  Laptop,
  Car,
  Armchair,
  Sparkles,
  Shirt,
  Play,
  Square,
  Zap,
  ShieldCheck,
  Activity,
  Layers
} from 'lucide-react';

const ICON_MAP = {
  Smartphone: Smartphone,
  Tv: Tv,
  Home: Home,
  Laptop: Laptop,
  Car: Car,
  Armchair: Armchair,
  Sparkles: Sparkles,
  Shirt: Shirt,
};

const COLOR_MAP = {
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-600',
    badge: 'bg-rose-500',
    lightText: 'text-rose-700',
  },
  sky: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-600',
    badge: 'bg-sky-500',
    lightText: 'text-sky-700',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-600',
    badge: 'bg-amber-500',
    lightText: 'text-amber-700',
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-600',
    badge: 'bg-indigo-500',
    lightText: 'text-indigo-700',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    badge: 'bg-emerald-500',
    lightText: 'text-emerald-700',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-600',
    badge: 'bg-purple-500',
    lightText: 'text-purple-700',
  },
  pink: {
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-600',
    badge: 'bg-pink-500',
    lightText: 'text-pink-700',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-600',
    badge: 'bg-orange-500',
    lightText: 'text-orange-700',
  },
};

export default function TurboDashboard({
  turboStatus,
  onStartAll,
  onStopAll,
  onStartLane,
  onStopLane
}) {
  const isAnyRunning = turboStatus?.is_any_running;
  const lanes = turboStatus?.lanes || [];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6 relative overflow-hidden">
      {/* Header with Top-Level Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  8-Поточный Турбо-Анализатор
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Safe Anti-Ban
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Одновременный сбор по 8 корневым категориям Kaspi с распределением нагрузки по IP
              </p>
            </div>
          </div>
        </div>

        {/* Global Summary & Master Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Speed */}
          <div className="px-3.5 py-2 rounded-2xl bg-slate-900 text-white flex items-center gap-2 shadow-xs">
            <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
            <div className="text-xs font-mono">
              <span className="text-slate-400 text-[10px] block uppercase font-bold leading-none">Скорость</span>
              <span className="font-extrabold text-amber-400 text-sm leading-tight">
                {turboStatus?.overall_speed || 0} тов/сек
              </span>
            </div>
          </div>

          {/* Active Lanes Counter */}
          <div className="px-3.5 py-2 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center gap-2 text-xs">
            <Layers className="w-4 h-4 text-slate-500" />
            <div>
              <span className="text-slate-400 text-[10px] block uppercase font-bold leading-none">Потоки</span>
              <span className="font-extrabold text-slate-800 text-sm leading-tight">
                {turboStatus?.active_lanes_count || 0} / 8 активны
              </span>
            </div>
          </div>

          {/* Master Start/Stop Button */}
          {isAnyRunning ? (
            <button
              onClick={onStopAll}
              className="px-5 py-2.5 rounded-2xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-2 shadow-md shadow-rose-600/25"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Остановить всё</span>
            </button>
          ) : (
            <button
              onClick={onStartAll}
              className="px-6 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 hover:opacity-95 transition flex items-center gap-2 shadow-lg shadow-rose-500/25"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>⚡ Запустить все 8 категорий</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of 8 Category Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {lanes.map((lane) => {
          const IconComp = ICON_MAP[lane.icon] || Layers;
          const colorTheme = COLOR_MAP[lane.color] || COLOR_MAP.rose;
          const isRunning = lane.is_running;
          const isBackingOff = lane.status === 'backing_off';

          return (
            <div
              key={lane.id}
              className={`rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between space-y-3 ${
                isRunning
                  ? 'bg-white border-slate-300 shadow-md ring-1 ring-slate-200'
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-white'
              }`}
            >
              {/* Card Top: Icon, Title, Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl ${colorTheme.bg} ${colorTheme.border} border flex items-center justify-center shrink-0`}>
                    <IconComp className={`w-4 h-4 ${colorTheme.text}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-extrabold text-slate-900 truncate" title={lane.title}>
                      {lane.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isRunning && !isBackingOff && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                          <span>В процессе</span>
                        </span>
                      )}
                      {isBackingOff && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          <span>Защита IP (15с)</span>
                        </span>
                      )}
                      {!isRunning && lane.status === 'completed' && (
                        <span className="text-[10px] font-bold text-slate-500">✅ Завершено</span>
                      )}
                      {!isRunning && lane.status !== 'completed' && (
                        <span className="text-[10px] font-medium text-slate-400">💤 В ожидании</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Individual Start/Stop Button */}
                <button
                  type="button"
                  onClick={() => (isRunning ? onStopLane(lane.id) : onStartLane(lane.id))}
                  title={isRunning ? 'Остановить категорию' : 'Запустить категорию'}
                  className={`p-2 rounded-xl text-xs font-bold transition shrink-0 ${
                    isRunning
                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {isRunning ? (
                    <Square className="w-3.5 h-3.5 fill-rose-600" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-slate-700" />
                  )}
                </button>
              </div>

              {/* Card Middle: Metrics */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100/60 rounded-xl p-2.5 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Собрано</span>
                  <span className="font-black text-slate-900 text-sm font-mono">
                    {lane.total_collected} тов.
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Скорость</span>
                  <span className="font-bold text-amber-600 text-xs font-mono">
                    {lane.speed} тов/с
                  </span>
                </div>
              </div>

              {/* Card Bottom: Current Page & Item Preview */}
              <div className="text-[11px] text-slate-500 truncate pt-1 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-400 font-mono">Стр. {lane.current_page}</span>
                {lane.current_item_title ? (
                  <span className="truncate max-w-[140px] text-slate-600 font-medium ml-2" title={lane.current_item_title}>
                    {lane.current_item_title}
                  </span>
                ) : (
                  <span className="text-slate-400">Готов к запуску</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

