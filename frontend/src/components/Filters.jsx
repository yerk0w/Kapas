import React from 'react';
import { SlidersHorizontal, RotateCcw, Search, ArrowUpDown, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';

export default function Filters({
  filters,
  onFilterChange,
  onResetFilters,
  categories,
  sortBy,
  sortOrder,
  onSortChange,
  onToggleSortOrder
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-700" />
          Фильтры и критерии анализа
        </h3>
        <button
          onClick={onResetFilters}
          className="text-xs text-slate-500 hover:text-rose-600 font-semibold transition flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Сбросить фильтры
        </button>
      </div>

      {/* Grid of 5 filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
        
        {/* 1. Keyword search */}
        <div>
          <label className="block font-semibold text-slate-600 mb-1.5">
            1. Поиск по запросу
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="В названии, бренде..."
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500 font-medium text-xs transition"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* 2. Category */}
        <div>
          <label className="block font-semibold text-slate-600 mb-1.5">
            2. Категория товара
          </label>
          <select
            value={filters.category}
            onChange={(e) => onFilterChange('category', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500 font-medium text-xs transition cursor-pointer"
          >
            <option value="">Все категории</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* 3. Price range (от - до) */}
        <div>
          <label className="block font-semibold text-slate-600 mb-1.5">
            3. Цена (от — до ₸)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="от"
              value={filters.min_price}
              onChange={(e) => onFilterChange('min_price', e.target.value)}
              className="w-1/2 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500 text-xs font-medium"
            />
            <span className="text-slate-300 font-bold">—</span>
            <input
              type="number"
              placeholder="до"
              value={filters.max_price}
              onChange={(e) => onFilterChange('max_price', e.target.value)}
              className="w-1/2 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500 text-xs font-medium"
            />
          </div>
        </div>

        {/* 4. Sellers range (от - до) */}
        <div>
          <label className="block font-semibold text-slate-600 mb-1.5">
            4. Продавцов (от — до)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="от"
              value={filters.min_sellers}
              onChange={(e) => onFilterChange('min_sellers', e.target.value)}
              className="w-1/2 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500 text-xs font-medium"
            />
            <span className="text-slate-300 font-bold">—</span>
            <input
              type="number"
              placeholder="до"
              value={filters.max_sellers}
              onChange={(e) => onFilterChange('max_sellers', e.target.value)}
              className="w-1/2 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500 text-xs font-medium"
            />
          </div>
        </div>

        {/* 5. Total reviews range (от - до) */}
        <div>
          <label className="block font-semibold text-slate-600 mb-1.5">
            5. Отзывы (от — до)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="от"
              value={filters.min_reviews}
              onChange={(e) => onFilterChange('min_reviews', e.target.value)}
              className="w-1/2 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500 text-xs font-medium"
            />
            <span className="text-slate-300 font-bold">—</span>
            <input
              type="number"
              placeholder="до"
              value={filters.max_reviews}
              onChange={(e) => onFilterChange('max_reviews', e.target.value)}
              className="w-1/2 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500 text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* Exclusivity Toggle and Sorting Section */}
      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Exclusive filter checkbox */}
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none bg-emerald-50 text-emerald-900 px-3.5 py-2 rounded-xl border border-emerald-200/80 hover:bg-emerald-100/70 transition">
          <input
            type="checkbox"
            checked={filters.is_exclusive}
            onChange={(e) => onFilterChange('is_exclusive', e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <span className="font-bold">★ Эксклюзивный товар для продажи (1 продавец)</span>
        </label>

        {/* Sorting controls */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Сортировка:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="reviews_month">Отзывы за месяц</option>
            <option value="price">Цена</option>
            <option value="sellers_count">Количество продавцов</option>
            <option value="reviews_total">Всего отзывов</option>
            <option value="updated_at">Дата обновления</option>
          </select>

          <button
            type="button"
            onClick={onToggleSortOrder}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl font-bold text-slate-700 transition"
            title="Переключить направление сортировки"
          >
            <span>{sortOrder === 'desc' ? 'От большего к меньшему' : 'От меньшего к большему'}</span>
            {sortOrder === 'desc' ? (
              <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <ArrowUp className="w-3.5 h-3.5 text-rose-600" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

