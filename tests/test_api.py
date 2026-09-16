import sys
import time
sys.path.append("/Users/aldik/Downloads/kasp-pars")

from starlette.testclient import TestClient
from app import app
from backend.coordinator import coordinator

client = TestClient(app)

def test_api():
    print("1. Testing GET / (React HTML)...")
    r = client.get("/")
    assert r.status_code == 200
    assert "<div id=\"root\"></div>" in r.text
    print("  -> React entry point OK")

    print("2. Testing GET /api/turbo/status...")
    r = client.get("/api/turbo/status")
    assert r.status_code == 200
    data = r.json()
    assert data["total_lanes"] == 8
    assert len(data["lanes"]) == 8
    print(f"  -> Found {data['total_lanes']} lanes: {[l['id'] for l in data['lanes']]}")

    print("3. Testing POST /api/turbo/start/smartphones...")
    r = client.post("/api/turbo/start/smartphones")
    assert r.status_code == 200
    assert r.json()["ok"] is True
    print("  -> Started lane 'smartphones'")

    print("4. Testing POST /api/turbo/stop/smartphones...")
    r = client.post("/api/turbo/stop/smartphones")
    assert r.status_code == 200
    assert r.json()["ok"] is True
    print("  -> Stopped lane 'smartphones'")

    print("5. Testing POST /api/turbo/start-all and stop-all...")
    r_start = client.post("/api/turbo/start-all")
    assert r_start.status_code == 200
    assert r_start.json()["ok"] is True
    
    r_stop = client.post("/api/turbo/stop-all")
    assert r_stop.status_code == 200
    assert r_stop.json()["ok"] is True
    print("  -> Start-all & Stop-all OK")

    print("6. Testing GET /api/products...")
    r = client.get("/api/products")
    assert r.status_code == 200
    print(f"  -> Total products in DB: {r.json()['total']}")

    print("ALL 8-CATEGORY TURBO TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_api()
