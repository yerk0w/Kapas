import sqlite3
from datetime import datetime
from typing import List, Optional, Dict, Any

DB_FILE = "kaspi_products.db"

def get_db():
    conn = sqlite3.connect(DB_FILE, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=10000;")
    return conn

def init_db():
    with get_db() as conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                brand TEXT,
                category TEXT,
                category_path TEXT,
                price REAL DEFAULT 0,
                sellers_count INTEGER DEFAULT 0,
                reviews_total INTEGER DEFAULT 0,
                reviews_month INTEGER DEFAULT 0,
                is_exclusive INTEGER DEFAULT 0,
                url TEXT,
                image_url TEXT,
                status TEXT DEFAULT 'ok',
                error_message TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Indexes for fast sorting and filtering
        conn.execute("CREATE INDEX IF NOT EXISTS idx_reviews_month ON products(reviews_month)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_price ON products(price)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sellers_count ON products(sellers_count)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_category ON products(category)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_is_exclusive ON products(is_exclusive)")

        # Table for storing individual reviews
        conn.execute("""
            CREATE TABLE IF NOT EXISTS product_reviews (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                author TEXT,
                date TEXT,
                rating INTEGER DEFAULT 5,
                comment_text TEXT,
                comment_plus TEXT,
                comment_minus TEXT,
                is_last_month INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_rev_product ON product_reviews(product_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_rev_month ON product_reviews(product_id, is_last_month)")
        conn.commit()

def upsert_product(prod: Dict[str, Any]):
    with get_db() as conn:
        conn.execute("""
            INSERT INTO products (
                id, title, brand, category, category_path, price, sellers_count,
                reviews_total, reviews_month, is_exclusive, url, image_url,
                status, error_message, updated_at
            ) VALUES (
                :id, :title, :brand, :category, :category_path, :price, :sellers_count,
                :reviews_total, :reviews_month, :is_exclusive, :url, :image_url,
                :status, :error_message, :updated_at
            )
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                brand = excluded.brand,
                category = excluded.category,
                category_path = excluded.category_path,
                price = excluded.price,
                sellers_count = excluded.sellers_count,
                reviews_total = excluded.reviews_total,
                reviews_month = excluded.reviews_month,
                is_exclusive = excluded.is_exclusive,
                url = excluded.url,
                image_url = excluded.image_url,
                status = excluded.status,
                error_message = excluded.error_message,
                updated_at = excluded.updated_at
        """, {
            "id": str(prod["id"]),
            "title": prod.get("title", "Без названия"),
            "brand": prod.get("brand", ""),
            "category": prod.get("category", "Разное"),
            "category_path": prod.get("category_path", ""),
            "price": float(prod.get("price", 0)),
            "sellers_count": int(prod.get("sellers_count", 0)),
            "reviews_total": int(prod.get("reviews_total", 0)),
            "reviews_month": int(prod.get("reviews_month", 0)),
            "is_exclusive": 1 if prod.get("is_exclusive") else 0,
            "url": prod.get("url", ""),
            "image_url": prod.get("image_url", ""),
            "status": prod.get("status", "ok"),
            "error_message": prod.get("error_message", None),
            "updated_at": datetime.now().isoformat()
        })
        conn.commit()

def upsert_products_batch(products_list: List[Dict[str, Any]]):
    if not products_list:
        return
    now = datetime.now().isoformat()
    records = []
    for prod in products_list:
        records.append({
            "id": str(prod["id"]),
            "title": prod.get("title", "Без названия"),
            "brand": prod.get("brand", ""),
            "category": prod.get("category", "Разное"),
            "category_path": prod.get("category_path", ""),
            "price": float(prod.get("price", 0)),
            "sellers_count": int(prod.get("sellers_count", 0)),
            "reviews_total": int(prod.get("reviews_total", 0)),
            "reviews_month": int(prod.get("reviews_month", 0)),
            "is_exclusive": 1 if prod.get("is_exclusive") else 0,
            "url": prod.get("url", ""),
            "image_url": prod.get("image_url", ""),
            "status": prod.get("status", "ok"),
            "error_message": prod.get("error_message", None),
            "updated_at": now
        })
    with get_db() as conn:
        conn.executemany("""
            INSERT INTO products (
                id, title, brand, category, category_path, price, sellers_count,
                reviews_total, reviews_month, is_exclusive, url, image_url,
                status, error_message, updated_at
            ) VALUES (
                :id, :title, :brand, :category, :category_path, :price, :sellers_count,
                :reviews_total, :reviews_month, :is_exclusive, :url, :image_url,
                :status, :error_message, :updated_at
            )
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                brand = excluded.brand,
                category = excluded.category,
                category_path = excluded.category_path,
                price = excluded.price,
                sellers_count = excluded.sellers_count,
                reviews_total = excluded.reviews_total,
                reviews_month = excluded.reviews_month,
                is_exclusive = excluded.is_exclusive,
                url = excluded.url,
                image_url = excluded.image_url,
                status = excluded.status,
                error_message = excluded.error_message,
                updated_at = excluded.updated_at
        """, records)
        conn.commit()

def get_product(product_id: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        if row:
            return dict(row)
        return None

def get_categories() -> List[str]:
    with get_db() as conn:
        rows = conn.execute("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category ASC").fetchall()
        return [r["category"] for r in rows]

def get_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_reviews: Optional[int] = None,
    max_reviews: Optional[int] = None,
    min_sellers: Optional[int] = None,
    max_sellers: Optional[int] = None,
    is_exclusive: Optional[bool] = None,
    sort_by: str = "reviews_month",
    sort_order: str = "desc",
    limit: int = 100,
    offset: int = 0
) -> Dict[str, Any]:
    with get_db() as conn:
        query = "SELECT * FROM products WHERE 1=1"
        params = []

        if search:
            query += " AND (title LIKE ? OR brand LIKE ? OR id LIKE ?)"
            s_param = f"%{search}%"
            params.extend([s_param, s_param, s_param])

        if category and category != "all":
            query += " AND (category = ? OR category_path LIKE ?)"
            params.extend([category, f"%{category}%"])

        if min_price is not None:
            query += " AND price >= ?"
            params.append(min_price)

        if max_price is not None:
            query += " AND price <= ?"
            params.append(max_price)

        if min_reviews is not None:
            query += " AND reviews_total >= ?"
            params.append(min_reviews)

        if max_reviews is not None:
            query += " AND reviews_total <= ?"
            params.append(max_reviews)

        if min_sellers is not None:
            query += " AND sellers_count >= ?"
            params.append(min_sellers)

        if max_sellers is not None:
            query += " AND sellers_count <= ?"
            params.append(max_sellers)

        if is_exclusive is not None:
            query += " AND is_exclusive = ?"
            params.append(1 if is_exclusive else 0)

        # Count total matching rows
        count_query = f"SELECT COUNT(*) as total FROM ({query})"
        total_count = conn.execute(count_query, params).fetchone()["total"]

        # Validate sorting column
        allowed_sort = {
            "reviews_month": "reviews_month",
            "price": "price",
            "sellers_count": "sellers_count",
            "reviews_total": "reviews_total",
            "title": "title",
            "updated_at": "updated_at"
        }
        sort_col = allowed_sort.get(sort_by, "reviews_month")
        direction = "ASC" if sort_order.lower() == "asc" else "DESC"

        query += f" ORDER BY {sort_col} {direction} LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = conn.execute(query, params).fetchall()
        items = [dict(r) for r in rows]

        return {
            "items": items,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }

def get_stats() -> Dict[str, Any]:
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) as c FROM products").fetchone()["c"]
        exclusive = conn.execute("SELECT COUNT(*) as c FROM products WHERE is_exclusive = 1").fetchone()["c"]
        categories = conn.execute("SELECT COUNT(DISTINCT category) as c FROM products").fetchone()["c"]
        last_updated = conn.execute("SELECT MAX(updated_at) as m FROM products").fetchone()["m"]
        return {
            "total_products": total,
            "exclusive_products": exclusive,
            "categories_count": categories,
            "last_updated": last_updated
        }

def delete_all():
    with get_db() as conn:
        conn.execute("DELETE FROM products")
        conn.execute("DELETE FROM product_reviews")
        conn.commit()

def upsert_reviews_batch(reviews_list: List[Dict[str, Any]]):
    if not reviews_list:
        return
    with get_db() as conn:
        conn.executemany("""
            INSERT INTO product_reviews (
                id, product_id, author, date, rating, comment_text, comment_plus, comment_minus, is_last_month
            ) VALUES (
                :id, :product_id, :author, :date, :rating, :comment_text, :comment_plus, :comment_minus, :is_last_month
            )
            ON CONFLICT(id) DO UPDATE SET
                author = excluded.author,
                date = excluded.date,
                rating = excluded.rating,
                comment_text = excluded.comment_text,
                comment_plus = excluded.comment_plus,
                comment_minus = excluded.comment_minus,
                is_last_month = excluded.is_last_month
        """, reviews_list)
        conn.commit()

def get_product_reviews(product_id: str, is_last_month: Optional[bool] = None) -> List[Dict[str, Any]]:
    with get_db() as conn:
        query = "SELECT * FROM product_reviews WHERE product_id = ?"
        params = [str(product_id)]
        if is_last_month is not None:
            query += " AND is_last_month = ?"
            params.append(1 if is_last_month else 0)
        query += " ORDER BY created_at DESC, id DESC"
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]

def get_product_reviews_stats(product_id: str) -> Dict[str, Any]:
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) as c FROM product_reviews WHERE product_id = ?", (str(product_id),)).fetchone()["c"]
        month = conn.execute("SELECT COUNT(*) as c FROM product_reviews WHERE product_id = ? AND is_last_month = 1", (str(product_id),)).fetchone()["c"]
        avg_rating = conn.execute("SELECT AVG(rating) as a FROM product_reviews WHERE product_id = ?", (str(product_id),)).fetchone()["a"] or 5.0
        return {
            "total_stored": total,
            "month_count": month,
            "avg_rating": round(avg_rating, 2)
        }

init_db()
