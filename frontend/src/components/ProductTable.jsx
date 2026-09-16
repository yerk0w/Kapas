import React from 'react';
import { ExternalLink, RefreshCw, Package, ArrowDown, ArrowUp, Star, ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';

export default function ProductTable({
  products,
  totalCount,
  isLoading,
  sortBy,
  sortOrder,
  onSortByHeader,
  onRefreshProduct,
  refreshingIds,
  onOpenReviews
}) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-RU').format(Math.round(price)) + ' ₸';
  };

  const renderSortIndicator = (col) => {
    if (sortBy !== col) return null;
    return sortOrder === 'desc' ? (
      <ArrowDown className="w-3.5 h-3.5 text-rose-600 inline ml-1" />
    ) : (
      <ArrowUp className="w-3.5 h-3.5 text-rose-600 inline ml-1" />
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Table Header / Subnav */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-bold text-slate-900">Результаты анализа</h3>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-extrabold text-xs">
            {totalCount} товаров
          </span>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Загрузка данных...</span>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4 w-14 text-center">Фото</th>
              <th className="py-3.5 px-4 min-w-[220px]">Товар / Бренд</th>
              <th className="py-3.5 px-4">Категория</th>
              
              <th
                onClick={() => onSortByHeader('price')}
                className="py-3.5 px-4 cursor-pointer hover:text-slate-900 select-none"
              >
                Цена {renderSortIndicator('price')}
              </th>

              <th
                onClick={() => onSortByHeader('sellers_count')}
                className="py-3.5 px-4 cursor-pointer hover:text-slate-900 select-none text-center"
              >
                Продавцов {renderSortIndicator('sellers_count')}
              </th>

              <th
                onClick={() => onSortByHeader('reviews_total')}
                className="py-3.5 px-4 cursor-pointer hover:text-slate-900 select-none text-center"
              >
                Всего отзывов {renderSortIndicator('reviews_total')}
              </th>

              {/* Highlighted Monthly reviews column */}
              <th
                onClick={() => onSortByHeader('reviews_month')}
                className="py-3.5 px-4 cursor-pointer text-amber-900 bg-amber-50/60 hover:bg-amber-100/60 select-none text-center font-extrabold"
              >
                Отзывы за месяц {renderSortIndicator('reviews_month')}
              </th>

              <th className="py-3.5 px-4 text-center">Эксклюзив</th>
              <th className="py-3.5 px-4 text-center">Действие</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {products.map((p) => {
              const isRefreshing = refreshingIds.includes(p.id);

              return (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* Photo */}
                  <td className="py-3.5 px-4 text-center">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt=""
                        className="w-11 h-11 object-contain rounded-xl border border-slate-100 bg-white p-1 shadow-2xs group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                  </td>

                  {/* Title & Brand */}
                  <td className="py-3.5 px-4">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-slate-900 hover:text-rose-600 transition flex items-start gap-1 line-clamp-2"
                      title={p.title}
                    >
                      <span>{p.title}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 mt-0.5 group-hover:text-rose-500" />
                    </a>
                    <div className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-2">
                      {p.brand && <span className="font-semibold text-slate-600">{p.brand}</span>}
                      <span>SKU: {p.id}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      {p.category || '—'}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="py-3.5 px-4 font-black text-slate-900 text-sm whitespace-nowrap">
                    {formatPrice(p.price)}
                  </td>

                  {/* Sellers */}
                  <td className="py-3.5 px-4 text-center">
                    {p.sellers_count === 1 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                        1 продавец
                      </span>
                    ) : (
                      <span className="font-bold text-slate-700 text-xs">
                        {p.sellers_count}
                      </span>
                    )}
                  </td>

                  {/* Total Reviews */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onOpenReviews(p)}
                      title="Нажмите, чтобы просмотреть все сохраненные отзывы"
                      className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-rose-600 hover:bg-slate-100 px-2 py-1 rounded-lg transition group cursor-pointer"
                    >
                      <span>{p.reviews_total}</span>
                      <MessageSquare className="w-3 h-3 text-slate-400 group-hover:text-rose-500" />
                    </button>
                  </td>

                  {/* Monthly Reviews (Hero column) */}
                  <td className="py-3.5 px-4 bg-amber-50/20 text-center">
                    <button
                      type="button"
                      onClick={() => onOpenReviews(p)}
                      title="Нажмите, чтобы открыть отзывы за последний месяц"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-slate-900 font-black text-xs bg-amber-100 hover:bg-amber-200 border border-amber-200 shadow-2xs transition cursor-pointer hover:scale-105"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>{p.reviews_month}</span>
                    </button>
                  </td>

                  {/* Exclusive */}
                  <td className="py-3.5 px-4 text-center">
                    {p.is_exclusive ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-white text-[11px] font-bold badge-exclusive-gradient">
                        <Sparkles className="w-3 h-3" /> Эксклюзив
                      </span>
                    ) : (
                      <span className="text-slate-300 font-bold">—</span>
                    )}
                  </td>

                  {/* Refresh Button */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => onRefreshProduct(p.id)}
                      disabled={isRefreshing}
                      title="Обновить цену, отзывы и продавцов"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-rose-600 hover:border-slate-300 transition shadow-2xs disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-rose-600' : ''}`} />
                      <span>{isRefreshing ? '...' : 'Обновить'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {products.length === 0 && !isLoading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">Товары не найдены</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Попробуйте ослабить фильтры или соберите новые товары через форму поиска сверху
          </p>
        </div>
      )}
    </div>
  );
}

