import time
import re
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Callable
from curl_cffi import requests
from backend.database import upsert_products_batch, upsert_product, get_product, upsert_reviews_batch

logger = logging.getLogger("kaspi_scraper")
logging.basicConfig(level=logging.INFO)

CITY_ALMATY = "750000000"

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://kaspi.kz/shop/",
}

class KaspiScraper:
    def __init__(self):
        self.session = requests.Session(impersonate="chrome120")
        self.session.headers.update(DEFAULT_HEADERS)
        self.is_scanning = False
        self.cancel_requested = False
        self.status = {
            "is_running": False,
            "mode": "query",
            "query": "",
            "pages_scanned": 0,
            "processed": 0,
            "total_found": 0,
            "current_step": "idle",
            "speed": "0 тов/сек",
            "last_error": None
        }

    def _get_worker_session(self) -> requests.Session:
        """Creates a dedicated impersonated session for parallel worker threads."""
        s = requests.Session(impersonate="chrome120")
        s.headers.update(DEFAULT_HEADERS)
        return s

    def _normalize_query(self, query: Optional[str]) -> str:
        """Parses URL if pasted, or returns query string."""
        if not query:
            return ""
        q = query.strip()
        if "kaspi.kz/shop/search" in q:
            match = re.search(r'text=([^&]+)', q)
            if match:
                return requests.utils.unquote(match.group(1))
        elif "kaspi.kz/shop/c/" in q:
            match = re.search(r'/shop/c/([^/?#]+)', q)
            if match:
                cat_slug = match.group(1)
                return f":category:{cat_slug.capitalize()}"
        return q

    def fetch_search_page(self, query: Optional[str] = "", page: int = 0) -> List[Dict[str, Any]]:
        """
        Fetches one page of catalog results from Kaspi PL API.
        Takes only ~0.2s.
        """
        url = "https://kaspi.kz/yml/product-view/pl/results"
        norm_q = self._normalize_query(query)
        params = {"page": page, "all": "false"}
        if norm_q:
            params["q"] = norm_q

        try:
            resp = self.session.get(url, params=params, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("data", [])
            else:
                logger.warning(f"Kaspi search returned HTTP {resp.status_code} for query='{query}' page={page}")
                return []
        except Exception as e:
            logger.error(f"Error fetching search page {page} for '{query}': {e}")
            return []

    def fetch_offers_fast(self, s: requests.Session, product_id: str, city_id: str = CITY_ALMATY) -> Dict[str, Any]:
        """Fast parallel fetch of seller offers."""
        url = f"https://kaspi.kz/yml/offer-view/offers/{product_id}"
        payload = {"cityId": city_id, "id": str(product_id)}
        headers = {"Content-Type": "application/json;charset=UTF-8"}

        try:
            resp = s.post(url, json=payload, headers=headers, timeout=6)
            if resp.status_code == 200:
                data = resp.json()
                total_sellers = data.get("total", 0)
                offers = data.get("offers", [])
                min_price = None
                if offers:
                    prices = [o.get("price") for o in offers if o.get("price") is not None]
                    if prices:
                        min_price = min(prices)
                return {
                    "sellers_count": total_sellers,
                    "min_offer_price": min_price
                }
        except Exception as e:
            pass

        return {"sellers_count": 0, "min_offer_price": None}

    def fetch_monthly_reviews_fast(self, s: requests.Session, product_id: str, reviews_total: int, days: int = 30) -> int:
        """
        Ultra-fast calculation of monthly reviews:
        - If reviews_total == 0: immediately returns 0 without any network call!
        - Fetches page 0 (10 latest reviews).
        - If all 10 are within 30 days and reviews_total > 10, quickly checks page 1.
        """
        if reviews_total <= 0:
            return 0

        cutoff_date = datetime.now() - timedelta(days=days)
        monthly_count = 0
        url = f"https://kaspi.kz/yml/review-view/api/v1/reviews/product/{product_id}"

        for page in range(2):  # Max 2 pages in fast mode (up to 20 reviews)
            try:
                resp = s.get(url, params={"page": page}, timeout=5)
                if resp.status_code != 200:
                    break
                data = resp.json()
                reviews = data.get("data", [])
                if not reviews:
                    break

                stop_paging = False
                for rev in reviews:
                    date_str = rev.get("date")
                    if date_str:
                        try:
                            rev_date = datetime.strptime(date_str, "%d.%m.%Y")
                            if rev_date >= cutoff_date:
                                monthly_count += 1
                            else:
                                stop_paging = True
                                break
                        except Exception:
                            continue

                if stop_paging or len(reviews) < 10:
                    break
            except Exception:
                break

        return monthly_count

    def enrich_product_task(self, raw_item: Dict[str, Any]) -> Dict[str, Any]:
        """Worker task to enrich a single product in parallel."""
        p_id = str(raw_item.get("id"))
        title = raw_item.get("title", "Без названия")
        brand = raw_item.get("brand", "")

        category_list = raw_item.get("categoryRu", raw_item.get("category", []))
        if isinstance(category_list, list) and category_list:
            category = category_list[-1]
            category_path = " / ".join(category_list)
        else:
            category = "Разное"
            category_path = "Разное"

        price = raw_item.get("unitSalePrice") or raw_item.get("unitPrice") or 0.0
        reviews_total = raw_item.get("reviewsQuantity", 0)
        shop_link = raw_item.get("shopLink", "")
        full_url = f"https://kaspi.kz/shop{shop_link}" if shop_link and not shop_link.startswith("http") else shop_link

        images = raw_item.get("previewImages", [])
        image_url = images[0].get("medium") if images and isinstance(images[0], dict) else ""

        # Worker session
        worker_session = self.session
        sellers_count = 0
        reviews_month = 0

        # 1. Fast offers
        offers_info = self.fetch_offers_fast(worker_session, p_id)
        sellers_count = offers_info.get("sellers_count", 0)
        if offers_info.get("min_offer_price"):
            price = offers_info["min_offer_price"]

        # 2. Fast reviews (skips if reviews_total == 0)
        reviews_to_save = []
        if reviews_total > 0:
            try:
                r_rev = worker_session.get(
                    f"https://kaspi.kz/yml/review-view/api/v1/reviews/product/{p_id}",
                    params={"page": 0},
                    timeout=5
                )
                if r_rev.status_code == 200:
                    revs = r_rev.json().get("data", [])
                    cutoff = datetime.now() - timedelta(days=30)
                    for rev in revs:
                        d_str = rev.get("date")
                        rev_id = str(rev.get("id") or f"{p_id}_{rev.get('orderNumber', 0)}")
                        is_month = 0
                        if d_str:
                            try:
                                rev_dt = datetime.strptime(d_str, "%d.%m.%Y")
                                if rev_dt >= cutoff:
                                    reviews_month += 1
                                    is_month = 1
                            except Exception:
                                pass
                        comm = rev.get("comment") or {}
                        reviews_to_save.append({
                            "id": rev_id,
                            "product_id": p_id,
                            "author": rev.get("author") or "Покупатель Kaspi",
                            "date": d_str or "",
                            "rating": rev.get("rating") or 5,
                            "comment_text": comm.get("text") or "",
                            "comment_plus": comm.get("plus") or "",
                            "comment_minus": comm.get("minus") or "",
                            "is_last_month": is_month
                        })
            except Exception:
                pass

        if reviews_to_save:
            try:
                upsert_reviews_batch(reviews_to_save)
            except Exception:
                pass

        is_exclusive = (sellers_count == 1)

        return {
            "id": p_id,
            "title": title,
            "brand": brand,
            "category": category,
            "category_path": category_path,
            "price": price,
            "sellers_count": sellers_count,
            "reviews_total": reviews_total,
            "reviews_month": reviews_month,
            "is_exclusive": is_exclusive,
            "url": full_url,
            "image_url": image_url,
            "status": "ok",
            "error_message": None
        }

    def refresh_product(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Refreshes a specific product (e.g. button 'Обновить')."""
        existing = get_product(product_id)
        if not existing:
            return None

        try:
            offers_info = self.fetch_offers_fast(self.session, product_id)
            sellers_count = offers_info.get("sellers_count", existing.get("sellers_count", 0))
            price = offers_info.get("min_offer_price") or existing.get("price", 0)

            rev_total = existing.get("reviews_total", 0)
            reviews_month = self.fetch_monthly_reviews_fast(self.session, product_id, rev_total)
            is_exclusive = (sellers_count == 1)

            updated_record = {
                **existing,
                "price": price,
                "sellers_count": sellers_count,
                "reviews_month": reviews_month,
                "is_exclusive": is_exclusive,
                "status": "ok",
                "error_message": None
            }
            upsert_product(updated_record)
            return updated_record
        except Exception as e:
            logger.error(f"Failed to refresh product {product_id}: {e}")
            return existing

    def run_scan_job(
        self,
        query: Optional[str] = "",
        mode: str = "query",
        max_pages: Optional[int] = 0,
        on_progress: Optional[Callable] = None
    ):
        """
        TURBO STREAMING ENGINE:
        - Crawls pages at ~1 second per page using ThreadPoolExecutor(max_workers=16).
        - Enriches all 12 items on each page simultaneously.
        - Commits to SQLite in 1 batch per page.
        - Streams updates live into the frontend.
        """
        self.is_scanning = True
        self.cancel_requested = False
        target_name = "Весь Kaspi Магазин" if mode == "all_kaspi" or not query else f"'{query}'"

        self.status = {
            "is_running": True,
            "mode": mode,
            "query": query or "",
            "pages_scanned": 0,
            "processed": 0,
            "total_found": 0,
            "current_step": f"Запуск Турбо-парсинга: {target_name}...",
            "speed": "запуск...",
            "last_error": None
        }

        page = 0
        consecutive_empty_pages = 0
        total_items_processed = 0
        unlimited_mode = (not max_pages or max_pages <= 0)
        start_time = time.time()

        try:
            # 16 concurrent workers for parallel requests
            with ThreadPoolExecutor(max_workers=16) as executor:
                while True:
                    if self.cancel_requested:
                        self.status["current_step"] = "Остановлено пользователем"
                        break

                    if not unlimited_mode and page >= max_pages:
                        break

                    t_page_start = time.time()
                    self.status["current_step"] = f"Загрузка каталога (стр. {page + 1})..."
                    items = self.fetch_search_page(query=query if mode != "all_kaspi" else "", page=page)

                    if not items:
                        consecutive_empty_pages += 1
                        if consecutive_empty_pages >= 2:
                            logger.info(f"Reached end of catalog at page {page}.")
                            break
                        page += 1
                        time.sleep(0.2)
                        continue

                    consecutive_empty_pages = 0
                    self.status["pages_scanned"] = page + 1
                    self.status["total_found"] += len(items)

                    # Parallel enrichment of all items on this page
                    self.status["current_step"] = f"Турбо-анализ стр. {page + 1} ({len(items)} товаров параллельно)..."
                    enriched_batch = list(executor.map(self.enrich_product_task, items))

                    # Immediate bulk database commit (<5ms)
                    upsert_products_batch(enriched_batch)

                    total_items_processed += len(enriched_batch)
                    t_page_end = time.time()
                    page_duration = max(0.1, t_page_end - t_page_start)
                    total_elapsed = max(0.1, t_page_end - start_time)

                    items_per_sec = total_items_processed / total_elapsed
                    speed_text = f"{items_per_sec:.1f} тов/сек (~{page_duration:.1f}с / стр)"

                    self.status["processed"] = total_items_processed
                    self.status["speed"] = speed_text
                    self.status["current_step"] = f"Стр. {page + 1} готова ({page_duration:.1f}с) | Всего: {total_items_processed} тов. | {speed_text}"

                    if on_progress:
                        on_progress(self.status)

                    page += 1

            elapsed = max(0.1, time.time() - start_time)
            avg_speed = total_items_processed / elapsed
            self.status["current_step"] = f"Завершено за {elapsed:.1f}с! Собрано: {total_items_processed} товаров (ср. скорость: {avg_speed:.1f} тов/сек)"
        except Exception as e:
            logger.error(f"Turbo scan error: {e}")
            self.status["last_error"] = str(e)
            self.status["current_step"] = f"Ошибка: {e}"
        finally:
            self.is_scanning = False
            self.status["is_running"] = False

scraper = KaspiScraper()
