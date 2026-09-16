import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import TurboDashboard from './components/TurboDashboard';
import Scanner from './components/Scanner';
import Filters from './components/Filters';
import ProductTable from './components/ProductTable';
import Toast from './components/Toast';
import ReviewsModal from './components/ReviewsModal';

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
    }, 3500);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Stats error:', e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (e) {
      console.error('Categories error:', e);
    }
  };

  const fetchTurboStatus = async () => {
    try {
      const res = await fetch('/api/turbo/status');
      const data = await res.json();
      setTurboStatus(data);
    } catch (e) {
      console.error('Turbo status error:', e);
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
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      setProducts(data.items || []);
      setTotalCount(data.total || 0);
    } catch (e) {
      console.error('Products error:', e);
      showToast('Ошибка загрузки списка товаров', 'error');
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

  // Polling for 8-category turbo status
  useEffect(() => {
    const checkTurbo = async () => {
      try {
        const res = await fetch('/api/turbo/status');
        const data = await res.json();
        setTurboStatus(data);
        if (data.is_any_running) {
          fetchStats();
          fetchCategories();
          fetchProducts();
        }
      } catch (e) {
        console.error('Turbo check error:', e);
      }
    };

    turboTimerRef.current = setInterval(checkTurbo, 1200);
    return () => {
      if (turboTimerRef.current) clearInterval(turboTimerRef.current);
    };
  }, [fetchProducts]);

  // Polling single query scanner status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/scan/status');
        const status = await res.json();
        setScanStatus(status);

        if (status.is_running) {
          if (!pollTimerRef.current) {
            pollTimerRef.current = setInterval(checkStatus, 1200);
          }
        } else {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            fetchStats();
            fetchCategories();
            fetchProducts();
          }
        }
      } catch (e) {
        console.error('Scan status error:', e);
      }
    };

    checkStatus();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchProducts]);

  // Turbo Actions
  const handleStartAllTurbo = async () => {
    try {
      const res = await fetch('/api/turbo/start-all', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showToast('Все 8 категорий запущены в Турбо-режим!', 'success');
        fetchTurboStatus();
      }
    } catch (e) {
      showToast(`Ошибка запуска: ${e}`, 'error');
    }
  };

  const handleStopAllTurbo = async () => {
    try {
      await fetch('/api/turbo/stop-all', { method: 'POST' });
      showToast('Все 8 потоков остановлены', 'info');
      fetchTurboStatus();
      fetchStats();
      fetchCategories();
      fetchProducts();
    } catch (e) {
      showToast(`Ошибка остановки: ${e}`, 'error');
    }
  };

  const handleStartLane = async (laneId) => {
    try {
      const res = await fetch(`/api/turbo/start/${laneId}`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showToast(`Поток '${laneId}' запущен!`, 'success');
        fetchTurboStatus();
      }
    } catch (e) {
      showToast(`Ошибка запуска: ${e}`, 'error');
    }
  };

  const handleStopLane = async (laneId) => {
    try {
      await fetch(`/api/turbo/stop/${laneId}`, { method: 'POST' });
      showToast(`Поток '${laneId}' остановлен`, 'info');
      fetchTurboStatus();
      fetchStats();
      fetchProducts();
    } catch (e) {
      showToast(`Ошибка остановки: ${e}`, 'error');
    }
  };

  // Custom Search Scanner
  const handleStartScan = async (query, pages, mode = 'query') => {
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, pages, mode }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Парсинг запущен в фоновом режиме', 'success');
        const sRes = await fetch('/api/scan/status');
        const status = await sRes.json();
        setScanStatus(status);
        if (!pollTimerRef.current) {
          pollTimerRef.current = setInterval(async () => {
            const r = await fetch('/api/scan/status');
            const s = await r.json();
            setScanStatus(s);
            if (!s.is_running) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              fetchStats();
              fetchCategories();
              fetchProducts();
              showToast('Сбор данных завершен!', 'success');
            }
          }, 1200);
        }
      } else {
        showToast(data.message || 'Ошибка запуска', 'error');
      }
    } catch (e) {
      showToast(`Ошибка сети: ${e}`, 'error');
    }
  };

  const handleCancelScan = async () => {
    try {
      await fetch('/api/scan/cancel', { method: 'POST' });
      showToast('Запрос на отмену отправлен', 'info');
    } catch (e) {
      showToast(`Ошибка отмены: ${e}`, 'error');
    }
  };

  const handleRefreshProduct = async (productId) => {
    setRefreshingIds((prev) => [...prev, productId]);
    try {
      const res = await fetch(`/api/refresh/${productId}`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showToast(`Товар ${productId} успешно обновлен`, 'success');
        fetchStats();
        fetchProducts();
      } else {
        showToast(data.message || 'Сбой обновления', 'error');
      }
    } catch (e) {
      showToast(`Ошибка сети: ${e}`, 'error');
    } finally {
      setRefreshingIds((prev) => prev.filter((id) => id !== productId));
    }
  };

  const handleRefreshAll = async () => {
    if (!window.confirm('Обновить данные по всем товарам в базе?')) return;
    setIsRefreshingAll(true);
    try {
      const res = await fetch('/api/refresh-all', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showToast('Обновление всей базы запущено', 'success');
      } else {
        showToast(data.message || 'Не удалось запустить', 'error');
      }
    } catch (e) {
      showToast(`Ошибка сети: ${e}`, 'error');
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const handleClearDb = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить все сохраненные товары?')) return;
    try {
      await fetch('/api/clear', { method: 'POST' });
      showToast('База данных очищена', 'info');
      fetchStats();
      fetchCategories();
      fetchProducts();
    } catch (e) {
      showToast(`Ошибка: ${e}`, 'error');
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

    window.location.href = `/api/export/csv?${params.toString()}`;
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

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Navbar
        stats={stats}
        onRefreshAll={handleRefreshAll}
        onExportCsv={handleExportCsv}
        onClearDb={handleClearDb}
        isRefreshingAll={isRefreshingAll}
      />

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

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
