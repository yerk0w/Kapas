import React, { useState } from 'react';
import { Server, X, AlertTriangle } from 'lucide-react';
import { getApiBase, setApiBase } from '../api';

export default function BackendConfigModal({ isOpen, onClose, onSave, isConnected }) {
  const [url, setUrl] = useState(getApiBase());

  if (!isOpen) return null;

  const handleSave = () => {
    setApiBase(url);
    onSave();
    onClose();
  };

  const handleReset = () => {
    setUrl('');
    setApiBase('');
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Подключение к бэкенду Kapas</h3>
              <p className="text-xs text-slate-500">Адрес API сервера (FastAPI)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="flex items-center gap-2 text-xs">
            <span>Статус соединения:</span>
            {isConnected ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Подключено
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                <AlertTriangle className="w-3 h-3 text-rose-600" /> Нет связи с бэкендом
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              URL адрес бэкенда:
            </label>
            <input
              type="text"
              placeholder="https://kapas.onrender.com (или пусто для локального/текущего хоста)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Если фронтенд развернут на Vercel, вставьте сюда ссылку на ваш запущенный сервис Render или VPS.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={handleReset}
            type="button"
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Сбросить на авто
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              type="button"
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs"
            >
              Сохранить и подключиться
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
