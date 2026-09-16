import time
import random
import threading
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from curl_cffi import requests

from backend.database import upsert_products_batch, upsert_reviews_batch

logger = logging.getLogger("turbo_coordinator")
logging.basicConfig(level=logging.INFO)

CITY_ALMATY = "750000000"

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]

CATEGORIES_CONFIG = [
    {
        "id": "smartphones",
        "title": "Телефоны и гаджеты",
        "query": ":category:Smartphones",
        "icon": "Smartphone",
        "color": "rose",
    },
    {
        "id": "tv_audio",
        "title": "ТВ, Аудио, Видео",
        "query": ":category:TV_Audio",
        "icon": "Tv",
        "color": "sky",
    },
    {
        "id": "home_equipment",
        "title": "Бытовая техника",
        "query": "бытовая техника",
        "icon": "Home",
        "color": "amber",
    },
    {
        "id": "computers",
        "title": "Компьютеры",
        "query": ":category:Computers",
        "icon": "Laptop",
        "color": "indigo",
    },
    {
        "id": "auto",
        "title": "Автотовары",
        "query": "автотовары",
        "icon": "Car",
        "color": "emerald",
    },
    {
        "id": "furniture",
        "title": "Мебель",
        "query": ":category:Furniture",
        "icon": "Armchair",
        "color": "purple",
    },
    {
        "id": "beauty",
        "title": "Красота и здоровье",
        "query": "красота и здоровье",
        "icon": "Sparkles",
        "color": "pink",
    },
    {
        "id": "clothing",
        "title": "Одежда и обувь",
        "query": "одежда",
        "icon": "Shirt",
        "color": "orange",
    },
]

class TurboCategoryLane:
    def __init__(self, config: Dict[str, Any]):
        self.id = config["id"]
        self.title = config["title"]
        self.query = config["query"]
        self.icon = config["icon"]
        self.color = config["color"]

        self.thread: Optional[threading.Thread] = None
        self.is_running = False
        self.stop_requested = False

        self.status = "idle"  # idle, running, stopped, backing_off, completed, error
        self.current_page = 0
        self.total_collected = 0
        self.speed = 0.0  # items/sec
        self.current_item_title = ""
        self.last_error = None
        self.session: Optional[requests.Session] = None

    def _init_session(self):
        ua = random.choice(USER_AGENTS)
        self.session = requests.Session(impersonate="chrome120")
        self.session.headers.update({
            "User-Agent": ua,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://kaspi.kz/shop/",
        })

    def start(self):
        if self.is_running:
            return
        self.stop_requested = False
        self.is_running = True
        self.status = "running"
        self._init_session()
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.stop_requested = True
        self.status = "stopped"
        self.is_running = False

    def _fetch_page(self, page: int) -> List[Dict[str, Any]]:
        url = "https://kaspi.kz/yml/product-view/pl/results"
        params = {"q": self.query, "page": page, "all": "false"}
        try:
            resp = self.session.get(url, params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("data", [])
            elif resp.status_code == 429:
                self.status = "backing_off"
                logger.warning(f"[{self.title}] 429 Rate limited. Safe-backoff 15s...")
                time.sleep(15)
                self._init_session()
                self.status = "running"
                return []
            else:
                logger.warning(f"[{self.title}] HTTP {resp.status_code} on page {page}")
                return []
        except Exception as e:
            logger.error(f"[{self.title}] Page {page} fetch error: {e}")
            return []

    def _enrich_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        p_id = str(item.get("id"))
        title = item.get("title", "Без названия")
        brand = item.get("brand", "")

        category_list = item.get("categoryRu", item.get("category", []))
        if isinstance(category_list, list) and category_list:
            category = category_list[-1]
            category_path = " / ".join(category_list)
        else:
            category = self.title
            category_path = self.title

        price = item.get("unitSalePrice") or item.get("unitPrice") or 0.0
        reviews_total = item.get("reviewsQuantity", 0)
        shop_link = item.get("shopLink", "")
        full_url = f"https://kaspi.kz/shop{shop_link}" if shop_link and not shop_link.startswith("http") else shop_link

        images = item.get("previewImages", [])
        image_url = images[0].get("medium") if images and isinstance(images[0], dict) else ""

        sellers_count = 0
        reviews_month = 0

        # Fast offers
        try:
            r_off = self.session.post(
                f"https://kaspi.kz/yml/offer-view/offers/{p_id}",
                json={"cityId": CITY_ALMATY, "id": p_id},
                headers={"Content-Type": "application/json;charset=UTF-8"},
                timeout=5
            )
            if r_off.status_code == 200:
                d = r_off.json()
                sellers_count = d.get("total", 0)
                prices = [o.get("price") for o in d.get("offers", []) if o.get("price")]
                if prices:
                    price = min(prices)
        except Exception:
            pass

        # Fast reviews (only if reviews_total > 0)
        reviews_to_save = []
        if reviews_total > 0:
            try:
                r_rev = self.session.get(
                    f"https://kaspi.kz/yml/review-view/api/v1/reviews/product/{p_id}",
                    params={"page": 0},
                    timeout=5
                )
                if r_rev.status_code == 200:
                    revs = r_rev.json().get("data", [])
                    cutoff = datetime.now() - timedelta(days=30)
                    for rev in revs:
                        d_str = rev.get("date")
                        rev_id = str(rev.get("id") or f"{p_id}_{rev.get('orderNumber', random.randint(1000, 999999))}")
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
            except Exception as e:
                logger.error(f"Error saving reviews for {p_id}: {e}")

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

    def _run_loop(self):
        page = self.current_page
        consecutive_empty = 0
        start_time = time.time()
        initial_count = self.total_collected

        try:
            while not self.stop_requested:
                t0 = time.time()
                items = self._fetch_page(page)

                if not items:
                    consecutive_empty += 1
                    if consecutive_empty >= 3:
                        self.status = "completed"
                        break
                    page += 1
                    time.sleep(0.3)
                    continue

                consecutive_empty = 0
                self.current_page = page + 1

                # Enrich items in this page
                enriched_batch = []
                for it in items:
                    if self.stop_requested:
                        break
                    self.current_item_title = it.get("title", "")
                    enriched_batch.append(self._enrich_item(it))

                if enriched_batch:
                    upsert_products_batch(enriched_batch)
                    self.total_collected += len(enriched_batch)

                # Calculate speed
                t_dur = max(0.1, time.time() - t0)
                elapsed = max(0.1, time.time() - start_time)
                self.speed = round((self.total_collected - initial_count) / elapsed, 1)

                # Anti-ban safe micro-jitter (100-150ms)
                time.sleep(random.uniform(0.10, 0.15))
                page += 1

            if not self.stop_requested:
                self.status = "completed"
        except Exception as e:
            logger.error(f"[{self.title}] Loop error: {e}")
            self.last_error = str(e)
            self.status = "error"
        finally:
            self.is_running = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "query": self.query,
            "icon": self.icon,
            "color": self.color,
            "status": self.status,
            "is_running": self.is_running,
            "current_page": self.current_page,
            "total_collected": self.total_collected,
            "speed": self.speed,
            "current_item_title": self.current_item_title,
            "last_error": self.last_error
        }


class TurboCoordinator:
    def __init__(self):
        self.lanes: Dict[str, TurboCategoryLane] = {
            c["id"]: TurboCategoryLane(c) for c in CATEGORIES_CONFIG
        }

    def start_all(self):
        for lane in self.lanes.values():
            lane.start()

    def stop_all(self):
        for lane in self.lanes.values():
            lane.stop()

    def start_lane(self, lane_id: str):
        if lane_id in self.lanes:
            self.lanes[lane_id].start()

    def stop_lane(self, lane_id: str):
        if lane_id in self.lanes:
            self.lanes[lane_id].stop()

    def get_status(self) -> Dict[str, Any]:
        lanes_data = [l.to_dict() for l in self.lanes.values()]
        active_count = sum(1 for l in self.lanes.values() if l.is_running)
        total_collected = sum(l.total_collected for l in self.lanes.values())
        overall_speed = round(sum(l.speed for l in self.lanes.values() if l.is_running), 1)

        return {
            "is_any_running": active_count > 0,
            "active_lanes_count": active_count,
            "total_lanes": len(self.lanes),
            "total_collected": total_collected,
            "overall_speed": overall_speed,
            "lanes": lanes_data
        }

coordinator = TurboCoordinator()

