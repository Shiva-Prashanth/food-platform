import io
import os
import sys
import json
import time

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.model_api import app

def run_tests():
    print("=" * 70)
    print("STARTING TEST SUITE FOR FOOD PLATFORM MODEL API")
    print("=" * 70)

    client = app.test_client()

    # Test 1: GET /health
    print("\n--- TEST 1: GET /health ---")
    t0 = time.time()
    res = client.get("/health")
    print(f"Status: {res.status_code}, Response: {res.get_json()}, Time: {time.time()-t0:.3f}s")
    assert res.status_code == 200
    assert res.get_json()["success"] is True
    print(">>> TEST 1 PASSED")

    # Test 2: POST /analyze-food with no data (Validation test)
    print("\n--- TEST 2: POST /analyze-food (Empty request -> Expect 400) ---")
    res = client.post("/analyze-food")
    print(f"Status: {res.status_code}, Response: {res.get_json()}")
    assert res.status_code == 400
    assert res.get_json()["success"] is False
    print(">>> TEST 2 PASSED")

    # Test 3: POST /analyze-food with valid image file upload
    print("\n--- TEST 3: POST /analyze-food (Multipart Image Upload) ---")
    sample_img_path = os.path.join(PROJECT_ROOT, "uploads", "33b9be2bf59e4fab93990747b55ab48b.jpg")
    if not os.path.exists(sample_img_path):
        # Create a small valid test image if missing
        from PIL import Image
        img = Image.new("RGB", (224, 224), color=(200, 100, 50))
        os.makedirs(os.path.join(PROJECT_ROOT, "uploads"), exist_ok=True)
        img.save(sample_img_path)

    with open(sample_img_path, "rb") as f:
        img_bytes = f.read()

    data = {
        "image": (io.BytesIO(img_bytes), "test_food.jpg"),
        "preparationTime": "2026-09-29 10:00",
        "temperature": "28.0",
        "storage": "room",
        "smell": "normal"
    }

    t0 = time.time()
    res = client.post(
        "/analyze-food",
        data=data,
        content_type="multipart/form-data"
    )
    elapsed = time.time() - t0
    print(f"Status: {res.status_code}, Elapsed: {elapsed:.2f}s")
    json_data = res.get_json()
    print("Response keys:", list(json_data.keys()))
    if json_data.get("success"):
        result = json_data["result"]
        print(f"Food Identified: {result.get('food_name')} ({result.get('food_confidence'):.2f}%)")
        print(f"Visual Freshness: {result.get('visual_assessment')} (Good: {result.get('good_percentage'):.1f}%)")
        print(f"Condition Assessment: {result.get('final_assessment')}")
        print(f"Recovery Route: {result.get('primary_route')}")
        print(f"Animal Feed Status: {result.get('animal_feed_status')}")
        assert result.get("food_name") is not None
        assert result.get("visual_assessment") in ["GOOD", "BAD", "UNCERTAIN"]
        assert result.get("final_assessment") in ["low_concern", "moderate_concern", "high_concern", "manual_verification"]
    else:
        print("Error details:", json_data)

    assert res.status_code == 200
    assert json_data["success"] is True
    print(">>> TEST 3 PASSED")

    # Test 4: Second request to verify singleton model reuse (should be fast)
    print("\n--- TEST 4: POST /analyze-food (Subsequent Request - Singleton Reuse) ---")
    with open(sample_img_path, "rb") as f:
        img_bytes2 = f.read()

    t0 = time.time()
    res = client.post(
        "/analyze-food",
        data={
            "image": (io.BytesIO(img_bytes2), "test_food_2.jpg"),
            "preparationTime": "2026-09-29 12:00",
            "temperature": "25.0",
            "storage": "refrigerator",
            "smell": "normal"
        },
        content_type="multipart/form-data"
    )
    elapsed = time.time() - t0
    print(f"Status: {res.status_code}, Elapsed: {elapsed:.2f}s (Reused in-memory models)")
    assert res.status_code == 200
    assert res.get_json()["success"] is True
    print(">>> TEST 4 PASSED")

    # Test 5: GET /api/models/status
    print("\n--- TEST 5: GET /api/models/status ---")
    res = client.get("/api/models/status")
    print(f"Status: {res.status_code}, Response: {res.get_json()}")
    assert res.status_code == 200
    assert res.get_json()["food_model"]["loaded"] is True
    assert res.get_json()["freshness_model"]["loaded"] is True
    print(">>> TEST 5 PASSED")

    print("\n" + "=" * 70)
    print("ALL API TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
