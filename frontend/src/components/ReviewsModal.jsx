import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Download,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Sparkles,
  Loader2
} from 'lucide-react';

export default function ReviewsModal({ product, onClose }) {
  const [activeTab, setActiveTab] = useState('month'); // 'month' | 'all'
  const [ratingFilter, setRatingFilter] = useState('all'); // 'all' | '5' | '4' | 'low'
  const [reviewsData, setReviewsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!product) return;
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products/${product.id}/reviews`);
        const data = await res.json();
        setReviewsData(data);
      } catch (e) {
        console.error('Error fetching reviews:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [product]);

  if (!product) return null;

  const allReviews = reviewsData?.reviews || [];
  const monthReviews = allReviews.filter((r) => r.is_last_month === 1);
  const currentList = activeTab === 'month' ? monthReviews : allReviews;

  const filteredReviews = currentList.filter((r) => {
    if (ratingFilter === '5') return r.rating === 5;
    if (ratingFilter === '4') return r.rating === 4;
    if (ratingFilter === 'low') return r.rating <= 3;
    return true;
  });

  const handleExportCsv = () => {
    const isMonthParam = activeTab === 'month' ? '?is_last_month=true' : '';
    window.location.href = `/api/products/${product.id}/reviews/export${isMonthParam}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3 min-w-0">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt=""
                className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0"
              />
            ) : null}
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1" title={product.title}>
                {product.title}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{product.brand || 'Kaspi'}</span>
                <span>•</span>
                <span>Артикул: {product.id}</span>
                <span>•</span>
                <span className="font-bold text-slate-900">
                  {new Intl.NumberFormat('ru-RU').format(Math.round(product.price))} ₸
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection & Star Filters */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          {/* Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'month'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>За последний месяц ({monthReviews.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>За всё время ({allReviews.length})</span>
            </button>
          </div>

          {/* Rating filter & CSV Export */}
          <div className="flex items-center gap-2">
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">Все оценки</option>
              <option value="5">Только 5 ★</option>
              <option value="4">Только 4 ★</option>
              <option value="low">1 - 3 ★ (Низкие)</option>
            </select>

            <button
              onClick={handleExportCsv}
              title="Скачать отзывы в CSV"
              className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1 text-xs font-bold px-2.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* Reviews List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
              <span>Загрузка отзывов из базы...</span>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">Отзывы не найдены</p>
              <p className="text-[11px] text-slate-400">
                {activeTab === 'month'
                  ? 'За последние 30 дней новых отзывов не было или они еще не собраны'
                  : 'По данному товару пока нет сохраненных отзывов'}
              </p>
            </div>
          ) : (
            filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs"
              >
                {/* Author, Stars, Date, Badge */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{rev.author}</span>
                    <div className="flex items-center text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {rev.is_last_month === 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-200">
                        <Sparkles className="w-2.5 h-2.5 text-amber-600" /> За месяц
                      </span>
                    )}
                    <span className="text-slate-400 font-medium text-[11px]">{rev.date}</span>
                  </div>
                </div>

                {/* Comment Text */}
                {rev.comment_text && (
                  <p className="text-slate-700 leading-relaxed font-normal">
                    {rev.comment_text}
                  </p>
                )}

                {/* Plus */}
                {rev.comment_plus && (
                  <div className="flex items-start gap-2 bg-emerald-50/80 border border-emerald-200/60 p-2 rounded-xl text-emerald-900 text-[11px]">
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong className="font-bold">Достоинства:</strong> {rev.comment_plus}</span>
                  </div>
                )}

                {/* Minus */}
                {rev.comment_minus && (
                  <div className="flex items-start gap-2 bg-rose-50/80 border border-rose-200/60 p-2 rounded-xl text-rose-900 text-[11px]">
                    <ThumbsDown className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span><strong className="font-bold">Недостатки:</strong> {rev.comment_minus}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Показано: <strong className="text-slate-900">{filteredReviews.length}</strong> из {currentList.length}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

