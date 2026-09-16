import os
import csv
import io
import threading
from typing import Optional
from fastapi import FastAPI, BackgroundTasks, Query, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.database import (
    get_products, get_categories, get_stats, get_product,
    get_product_reviews, get_product_reviews_stats,
    delete_all, init_db
)
from backend.scraper import scraper
from backend.coordinator import coordinator

init_db()

app = FastAPI(title="Kapas Analytics", version="1.0.0")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
STATIC_DIR = os.path.join(BASE_DIR, "static")

# Mount React build assets if built, otherwise mount static
if os.path.exists(os.path.join(FRONTEND_DIST, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

class ScanRequest(BaseModel):
    query: Optional[str] = ""
    mode: str = "query"  # "query" (определенный товар) или "all_kaspi" (все товары подряд)
    pages: Optional[int] = 0  # 0 или None = БЕЗ ОГРАНИЧЕНИЙ (все страницы до упора)

@app.get("/", response_class=HTMLResponse)
async def read_index():
    """Serves the React frontend application."""
    react_index = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(react_index):
        return FileResponse(react_index)
    
    static_index = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(static_index):
        return FileResponse(static_index)

    return "<h1>Kapas: Фронтенд не найден. Запустите: cd frontend && npm run build</h1>"

@app.get("/api/products")
def api_get_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_reviews: Optional[int] = None,
    max_reviews: Optional[int] = None,
    min_sellers: Optional[int] = None,
    max_sellers: Optional[int] = None,
    is_exclusive: Optional[bool] = None,
    sort_by: str = Query("reviews_month", pattern="^(reviews_month|price|sellers_count|reviews_total|title|updated_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    limit: int = 100,
    offset: int = 0
):
    """Returns filtered and sorted products list with pagination."""
    return get_products(
        search=search,
        category=category,
        min_price=min_price,
        max_price=max_price,
        min_reviews=min_reviews,
        max_reviews=max_reviews,
        min_sellers=min_sellers,
        max_sellers=max_sellers,
        is_exclusive=is_exclusive,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset
    )

@app.get("/api/categories")
def api_get_categories():
    """Returns unique product categories in database."""
    return {"categories": get_categories()}

@app.get("/api/stats")
def api_get_stats():
    """Returns general database stats."""
    return get_stats()

@app.post("/api/scan")
def api_start_scan(req: ScanRequest, background_tasks: BackgroundTasks):
    """Starts streaming background scanning without limits or by query."""
    if scraper.is_scanning:
        return {"ok": False, "message": "Сканирование уже выполняется"}
    
    mode = req.mode if req.mode in ["query", "all_kaspi"] else "query"
    query = (req.query or "").strip()

    if mode == "query" and not query:
        raise HTTPException(status_code=400, detail="Укажите поисковый запрос или выберите режим 'Парсить весь Kaspi'")

    thread = threading.Thread(
        target=scraper.run_scan_job,
        kwargs={
            "query": query,
            "mode": mode,
            "max_pages": req.pages or 0
        },
        daemon=True
    )
    thread.start()
    return {
        "ok": True,
        "message": "Парсинг запущен: " + ("все товары Kaspi" if mode == "all_kaspi" else f"товар '{query}'")
    }

@app.get("/api/scan/status")
def api_scan_status():
    """Returns live scanning status."""
    return scraper.status

@app.post("/api/scan/cancel")
def api_cancel_scan():
    """Cancels ongoing scan."""
    scraper.cancel_requested = True
    return {"ok": True, "message": "Запрос на остановку отправлен"}

@app.post("/api/refresh/{product_id}")
def api_refresh_product(product_id: str):
    """Refreshes a specific product immediately (button 'Обновить')."""
    res = scraper.refresh_product(product_id)
    if not res:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return {"ok": True, "product": res}

@app.get("/api/products/{product_id}/reviews")
def api_get_product_reviews(product_id: str, is_last_month: Optional[bool] = None):
    """Returns stored reviews for a product."""
    prod = get_product(product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Товар не найден")
    reviews = get_product_reviews(product_id, is_last_month=is_last_month)
    stats = get_product_reviews_stats(product_id)
    return {
        "product": prod,
        "stats": stats,
        "reviews": reviews
    }

@app.get("/api/products/{product_id}/reviews/export")
def api_export_product_reviews(product_id: str, is_last_month: Optional[bool] = None):
    """Exports product reviews into CSV file."""
    prod = get_product(product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Товар не найден")
    reviews = get_product_reviews(product_id, is_last_month=is_last_month)
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["ID Отзыва", "Товар", "Автор", "Оценка", "Дата", "За последний месяц", "Комментарий", "Плюсы", "Минусы"])
    for r in reviews:
        writer.writerow([
            r["id"],
            prod["title"],
            r.get("author", ""),
            r.get("rating", 5),
            r.get("date", ""),
            "Да" if r.get("is_last_month") else "Нет",
            r.get("comment_text", ""),
            r.get("comment_plus", ""),
            r.get("comment_minus", "")
        ])
    
    csv_bytes = output.getvalue().encode("utf-8-sig")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=reviews_{product_id}.csv"}
    )


@app.post("/api/refresh-all")
def api_refresh_all():
    """Triggers refresh for all products currently in DB."""
    if scraper.is_scanning:
        return {"ok": False, "message": "Система занята другим процессом сканирования"}
    
    def refresh_worker():
        scraper.is_scanning = True
        scraper.cancel_requested = False
        items_data = get_products(limit=5000)
        items = items_data.get("items", [])
        scraper.status = {
            "is_running": True,
            "mode": "refresh",
            "query": "Обновление базы",
            "pages_scanned": 0,
            "processed": 0,
            "total_found": len(items),
            "current_step": "Обновление существующих товаров...",
            "last_error": None
        }
        for idx, it in enumerate(items):
            if scraper.cancel_requested:
                break
            p_id = it["id"]
            scraper.status["current_step"] = f"Обновление {idx + 1}/{len(items)}: {it.get('title', '')[:30]}..."
            scraper.refresh_product(p_id)
            scraper.status["processed"] = idx + 1
        scraper.status["is_running"] = False
        scraper.is_scanning = False
        scraper.status["current_step"] = "Обновление завершено"

    thread = threading.Thread(target=refresh_worker, daemon=True)
    thread.start()
    return {"ok": True, "message": "Обновление всех товаров запущено"}

@app.post("/api/clear")
def api_clear_database():
    """Clears all products from local DB."""
    delete_all()
    return {"ok": True, "message": "База данных очищена"}

@app.get("/api/export/csv")
def api_export_csv(
    search: Optional[str] = None,
    category: Optional[str] = None,
    is_exclusive: Optional[bool] = None,
    sort_by: str = "reviews_month",
    sort_order: str = "desc"
):
    """Exports filtered products into CSV file."""
    data = get_products(
        search=search,
        category=category,
        is_exclusive=is_exclusive,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=10000
    )
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow([
        "Артикул", "Название", "Бренд", "Категория", "Цена (₸)",
        "Продавцов", "Отзывов всего", "Отзывов за месяц", "Эксклюзивный", "Ссылка"
    ])
    for item in data.get("items", []):
        writer.writerow([
            item["id"],
            item["title"],
            item.get("brand", ""),
            item.get("category", ""),
            item["price"],
            item["sellers_count"],
            item["reviews_total"],
            item["reviews_month"],
            "Да" if item["is_exclusive"] else "Нет",
            item["url"]
        ])
    
    csv_bytes = output.getvalue().encode("utf-8-sig")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=kaspi_products.csv"}
    )

# --- TURBO 8-CATEGORY COORDINATOR ENDPOINTS ---

@app.get("/api/turbo/status")
def api_turbo_status():
    """Returns live status of all 8 parallel category lanes."""
    return coordinator.get_status()

@app.post("/api/turbo/start-all")
def api_turbo_start_all():
    """Starts all 8 category lanes concurrently."""
    coordinator.start_all()
    return {"ok": True, "message": "Все 8 категорий запущены в параллельный турбо-режим"}

@app.post("/api/turbo/stop-all")
def api_turbo_stop_all():
    """Stops all active category lanes."""
    coordinator.stop_all()
    return {"ok": True, "message": "Все потоки остановлены"}

@app.post("/api/turbo/start/{lane_id}")
def api_turbo_start_lane(lane_id: str):
    """Starts an individual category lane."""
    coordinator.start_lane(lane_id)
    return {"ok": True, "message": f"Поток '{lane_id}' запущен"}

@app.post("/api/turbo/stop/{lane_id}")
def api_turbo_stop_lane(lane_id: str):
    """Stops an individual category lane."""
    coordinator.stop_lane(lane_id)
    return {"ok": True, "message": f"Поток '{lane_id}' остановлен"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
