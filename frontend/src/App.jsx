import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import TurboDashboard from './components/TurboDashboard';
import Scanner from './components/Scanner';
import Filters from './components/Filters';
import ProductTable from './components/ProductTable';
import Toast from './components/Toast';
import ReviewsModal from './components/ReviewsModal';
import BackendConfigModal from './components/BackendConfigModal';
import { apiFetch, getApiBase } from './api';

export default function App() {
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [scanStatus, setScanStatus] = useState(null);
  const [turboStatus, setTurboStatus] = useState(null);
  const [refreshingIds, setRefreshingIds] = useState([]);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedProductForReviews, setSelectedProductForReviews] = useState(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(true);

  const [sortBy, setSortBy] = useState('reviews_month');
  const [sortOrder, setSortOrder] = useState('desc');

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    min_price: '',
    max_price: '',
    min_sellers: '',
    max_sellers: '',
    min_reviews: '',
    max_reviews: '',
    is_exclusive: false,
  });

  const pollTimerRef = useRef(null);
  const turboTimerRef = useRef(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchStats = async () => {
    try {
      const data = await apiFetch('/api/stats');
      setStats(data);
      setIsBackendConnected(true);
    } catch (e) {
      console.error('Stats error:', e);
      setIsBackendConnected(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiFetch('/api/categories');
      setCategories(data.categories || []);
      setIsBackendConnected(true);
    } catch (e) {
      console.error('Categories error:', e);
      setIsBackendConnected(false);
    }
  };

  const fetchTurboStatus = async () => {
    try {
      const data = await apiFetch('/api/turbo/status');
      setTurboStatus(data);
      setIsBackendConnected(true);
    } catch (e) {
      console.error('Turbo status error:', e);
      setIsBackendConnected(false);
    }
  };

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams({
      sort_by: sortBy,
      sort_order: sortOrder,
      limit: '100',
    });

    if (filters.search.trim()) params.append('search', filters.search.trim());
    if (filters.category) params.append('category', filters.category);
    if (filters.min_price) params.append('min_price', filters.min_price);
    if (filters.max_price) params.append('max_price', filters.max_price);
    if (filters.min_sellers) params.append('min_sellers', filters.min_sellers);
    if (filters.max_sellers) params.append('max_sellers', filters.max_sellers);
    if (filters.min_reviews) params.append('min_reviews', filters.min_reviews);
    if (filters.max_reviews) params.append('max_reviews', filters.max_reviews);
    if (filters.is_exclusive) params.append('is_exclusive', 'true');

    try {
      const data = await apiFetch(`/api/products?${params.toString()}`);
      setProducts(data.items || []);
      setTotalCount(data.total || 0);
      setIsBackendConnected(true);
    } catch (e) {
      console.error('Products error:', e);
      setIsBackendConnected(false);
      showToast('Ошибка загрузки товаров: ' + e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortBy, sortOrder]);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchCategories();
    fetchTurboStatus();
  }, []);

  // Reload products when filters or sorting changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // Turbo polling when active
  useEffect(() => {
    const hasActiveLane = turboStatus?.lanes?.some((l) => l.is_active);
    if (hasActiveLane) {
      if (!turboTimerRef.current) {
        turboTimerRef.current = setInterval(async () => {
          try {
            const data = await apiFetch('/api/turbo/status');
            setTurboStatus(data);
            fetchStats();
            fetchCategories();
            fetchProducts();
          } catch (err) {
            console.error(err);
          }
        }, 1500);
      }
    } else {
      if (turboTimerRef.current) {
        clearInterval(turboTimerRef.current);
        turboTimerRef.current = null;
      }
    }
    return () => {
      if (turboTimerRef.current) clearInterval(turboTimerRef.current);
    };
  }, [turboStatus?.lanes, fetchProducts]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchProducts]);

  // Turbo Actions
  const handleStartAllTurbo = async () => {
    try {
      const data = await apiFetch('/api/turbo/start-all', { method: 'POST' });
      if (data.ok) {
        showToast('Все 8 категорий запущены в Турбо-режим!', 'success');
        fetchTurboStatus();
      }
    } catch (e) {
      showToast('Ошибка запуска: ' + e.message, 'error');
    }
  };

  const handleStopAllTurbo = async () => {
    try {
      await apiFetch('/api/turbo/stop-all', { method: 'POST' });
      showToast('Все 8 потоков остановлены', 'info');
      fetchTurboStatus();
      fetchStats();
      fetchCategories();
      fetchProducts();
    } catch (e) {
      showToast('Ошибка остановки: ' + e.message, 'error');
    }
  };

  const handleStartLane = async (laneId) => {
    try {
      const data = await apiFetch(`/api/turbo/start/${laneId}`, { method: 'POST' });
      if (data.ok) {
        showToast(`Поток '${laneId}' запущен!`, 'success');
        fetchTurboStatus();
      }
    } catch (e) {
      showToast('Ошибка запуска: ' + e.message, 'error');
    }
  };

  const handleStopLane = async (laneId) => {
    try {
      await apiFetch(`/api/turbo/stop/${laneId}`, { method: 'POST' });
      showToast(`Поток '${laneId}' остановлен`, 'info');
      fetchTurboStatus();
      fetchStats();
      fetchProducts();
    } catch (e) {
      showToast('Ошибка остановки: ' + e.message, 'error');
    }
  };

  // Custom Search Scanner
  const handleStartScan = async (query, pages, mode = 'query') => {
    try {
      const data = await apiFetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, pages, mode }),
      });
      if (data.ok) {
        showToast('Парсинг запущен в фоновом режиме', 'success');
        const status = await apiFetch('/api/scan/status');
        setScanStatus(status);
        if (!pollTimerRef.current) {
          pollTimerRef.current = setInterval(async () => {
            try {
              const s = await apiFetch('/api/scan/status');
              setScanStatus(s);
              if (!s.is_running) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
                fetchStats();
                fetchCategories();
                fetchProducts();
                showToast('Сбор данных завершен!', 'success');
              }
            } catch (pollErr) {
              console.error(pollErr);
            }
          }, 1200);
        }
      } else {
        showToast(data.message || 'Ошибка запуска', 'error');
      }
    } catch (e) {
      showToast('Ошибка сети: ' + e.message, 'error');
    }
  };

  const handleCancelScan = async () => {
    try {
      await apiFetch('/api/scan/cancel', { method: 'POST' });
      showToast('Запрос на отмену отправлен', 'info');
    } catch (e) {
      showToast('Ошибка отмены: ' + e.message, 'error');
    }
  };

  const handleRefreshProduct = async (productId) => {
    setRefreshingIds((prev) => [...prev, productId]);
    try {
      const data = await apiFetch(`/api/refresh/${productId}`, { method: 'POST' });
      if (data.ok) {
        showToast(`Товар ${productId} успешно обновлен`, 'success');
        fetchStats();
        fetchProducts();
      } else {
        showToast(data.message || 'Сбой обновления', 'error');
      }
    } catch (e) {
      showToast('Ошибка сети: ' + e.message, 'error');
    } finally {
      setRefreshingIds((prev) => prev.filter((id) => id !== productId));
    }
  };

  const handleRefreshAll = async () => {
    if (!window.confirm('Обновить данные по всем товарам в базе?')) return;
    setIsRefreshingAll(true);
    try {
      const data = await apiFetch('/api/refresh-all', { method: 'POST' });
      if (data.ok) {
        showToast('Обновление всей базы запущено', 'success');
      } else {
        showToast(data.message || 'Не удалось запустить', 'error');
      }
    } catch (e) {
      showToast('Ошибка сети: ' + e.message, 'error');
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const handleClearDb = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить все сохраненные товары?')) return;
    try {
      await apiFetch('/api/clear', { method: 'POST' });
      showToast('База данных очищена', 'info');
      fetchStats();
      fetchCategories();
      fetchProducts();
    } catch (e) {
      showToast('Ошибка: ' + e.message, 'error');
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams({
      sort_by: sortBy,
      sort_order: sortOrder,
    });
    if (filters.search.trim()) params.append('search', filters.search.trim());
    if (filters.category) params.append('category', filters.category);
    if (filters.is_exclusive) params.append('is_exclusive', 'true');

    const base = getApiBase();
    window.open(`${base}/api/export/csv?${params.toString()}`, '_blank');
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: '',
      min_price: '',
      max_price: '',
      min_sellers: '',
      max_sellers: '',
      min_reviews: '',
      max_reviews: '',
      is_exclusive: false,
    });
    setSortBy('reviews_month');
    setSortOrder('desc');
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
  };

  const handleToggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleSortByHeader = (col) => {
    if (sortBy === col) {
      handleToggleSortOrder();
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  const handleConfigSaved = () => {
    fetchStats();
    fetchCategories();
    fetchTurboStatus();
    fetchProducts();
    showToast('Настройки бэкенда обновлены', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Navbar
        stats={stats}
        onRefreshAll={handleRefreshAll}
        onExportCsv={handleExportCsv}
        onClearDb={handleClearDb}
        isRefreshingAll={isRefreshingAll}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        isBackendConnected={isBackendConnected}
      />

      {!isBackendConnected && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-center text-xs text-rose-800 flex items-center justify-center gap-2">
          <span>⚠️ Бэкенд Kapas не отвечает. Если сайт открыт на Vercel, укажите ссылку на ваш запущенный сервер:</span>
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="font-bold underline text-rose-900 hover:text-rose-950 ml-1 cursor-pointer"
          >
            Настроить подключение API
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* 1. TURBO 8-CATEGORY COORDINATOR */}
        <TurboDashboard
          turboStatus={turboStatus}
          onStartAll={handleStartAllTurbo}
          onStopAll={handleStopAllTurbo}
          onStartLane={handleStartLane}
          onStopLane={handleStopLane}
        />

        {/* 2. CUSTOM SINGLE-ITEM SEARCH SCANNER */}
        <Scanner
          onStartScan={handleStartScan}
          onCancelScan={handleCancelScan}
          scanStatus={scanStatus}
        />

        {/* 3. FILTERS & METRICS */}
        <Filters
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          categories={categories}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onToggleSortOrder={handleToggleSortOrder}
        />

        {/* 4. PRODUCTS DATA TABLE */}
        <ProductTable
          products={products}
          totalCount={totalCount}
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortByHeader={handleSortByHeader}
          onRefreshProduct={handleRefreshProduct}
          refreshingIds={refreshingIds}
          onOpenReviews={(p) => setSelectedProductForReviews(p)}
        />
      </main>

      {/* REVIEWS INSPECTION MODAL */}
      {selectedProductForReviews && (
        <ReviewsModal
          product={selectedProductForReviews}
          onClose={() => setSelectedProductForReviews(null)}
        />
      )}

      {/* BACKEND CONFIG MODAL */}
      <BackendConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSave={handleConfigSaved}
        isConnected={isBackendConnected}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
