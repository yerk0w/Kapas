import sys
sys.path.append("/Users/aldik/Downloads/kasp-pars")

from starlette.testclient import TestClient
from app import app
from backend.database import upsert_product, upsert_reviews_batch, get_product_reviews

client = TestClient(app)

def test_reviews():
    # 1. Insert dummy product
    prod_id = "test_review_prod_1"
    upsert_product({
        "id": prod_id,
        "title": "Тестовый товар для проверки отзывов",
        "brand": "Apple",
        "category": "Наушники",
        "price": 49990.0,
        "sellers_count": 5,
        "reviews_total": 2,
        "reviews_month": 1,
        "is_exclusive": False,
        "url": "https://kaspi.kz/shop/p/test",
        "image_url": ""
    })

    # 2. Insert dummy reviews (1 in last month, 1 older)
    upsert_reviews_batch([
        {
            "id": "rev_test_1",
            "product_id": prod_id,
            "author": "Арман",
            "date": "15.09.2026",
            "rating": 5,
            "comment_text": "Отличные наушники, звук топ!",
            "comment_plus": "Бас, удобство",
            "comment_minus": "Нет",
            "is_last_month": 1
        },
        {
            "id": "rev_test_2",
            "product_id": prod_id,
            "author": "Данияр",
            "date": "10.01.2025",
            "rating": 4,
            "comment_text": "Хорошие, но провод короткий",
            "comment_plus": "Звук",
            "comment_minus": "Кабель",
            "is_last_month": 0
        }
    ])

    print("1. Testing GET /api/products/{id}/reviews...")
    r = client.get(f"/api/products/{prod_id}/reviews")
    assert r.status_code == 200
    data = r.json()
    assert len(data["reviews"]) == 2
    assert data["stats"]["month_count"] == 1
    assert data["stats"]["total_stored"] == 2
    print("  -> Reviews endpoint OK, stored count:", data["stats"])

    print("2. Testing GET /api/products/{id}/reviews with is_last_month=true...")
    r_m = client.get(f"/api/products/{prod_id}/reviews?is_last_month=true")
    assert r_m.status_code == 200
    m_data = r_m.json()
    assert len(m_data["reviews"]) == 1
    assert m_data["reviews"][0]["author"] == "Арман"
    print("  -> Filter is_last_month OK, found author:", m_data["reviews"][0]["author"])

    print("3. Testing GET /api/products/{id}/reviews/export (CSV)...")
    r_csv = client.get(f"/api/products/{prod_id}/reviews/export")
    assert r_csv.status_code == 200
    csv_content = r_csv.content.decode("utf-8-sig")
    assert "Арман" in csv_content
    assert "Данияр" in csv_content
    print("  -> CSV export OK")

    print("ALL REVIEWS STORAGE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_reviews()

