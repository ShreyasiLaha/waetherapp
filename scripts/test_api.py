"""
RituGrid API validation test suite.
Hits every endpoint defined in Schema.md §6 and reports PASS/FAIL.
Run with: python scripts/test_api.py
"""
import sys
import json
import time
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"
PASS = 0
FAIL = 0


def get(label, path, expect_keys):
    global PASS, FAIL
    url = BASE + path
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            body = json.loads(r.read())
        missing = [k for k in expect_keys if k not in body]
        if missing:
            print(f"[FAIL] {label} -> missing keys: {missing}")
            FAIL += 1
        else:
            print(f"[PASS] {label} -> keys OK: {list(body.keys())}")
            PASS += 1
    except Exception as e:
        print(f"[FAIL] {label} -> {e}")
        FAIL += 1


def post(label, path, payload, expect_keys):
    global PASS, FAIL
    url = BASE + path
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            body = json.loads(r.read())
        missing = [k for k in expect_keys if k not in body]
        if missing:
            print(f"[FAIL] {label} -> missing keys: {missing}")
            FAIL += 1
        else:
            dm = body.get("disabled_models", "?")
            ac = body.get("active_models", "?")
            print(f"[PASS] {label} -> disabled={dm} active={ac}")
            PASS += 1
    except Exception as e:
        print(f"[FAIL] {label} -> {e}")
        FAIL += 1


if __name__ == "__main__":
    print("=" * 55)
    print("RituGrid API Validation Suite")
    print("=" * 55)

    get("GET /health",
        "/health",
        ["status", "available_dates", "models_loaded"])

    get("GET /dates",
        "/dates",
        ["available_dates", "raw_dates"])

    get("GET /forecast (tp, 48h)",
        "/forecast?date=20230715&lead_time=48&variable=tp",
        ["date", "lead_time_hours", "variable", "units", "grid"])

    get("GET /weights (tp, 48h)",
        "/weights?date=20230715&lead_time=48&variable=tp",
        ["date", "lead_time_hours", "variable", "models", "grid"])

    get("GET /skill-scores (tp, 48h)",
        "/skill-scores?date=20230715&lead_time=48&variable=tp",
        ["count", "records"])

    get("GET /skill-scores (all)",
        "/skill-scores",
        ["count", "records"])

    get("GET /extreme-guidance (all LTs)",
        "/extreme-guidance?date=20230715",
        ["date", "alerts"])

    get("GET /extreme-guidance (lt=48h)",
        "/extreme-guidance?date=20230715&lead_time=48",
        ["date", "alerts"])

    # Edge case: unknown date → expect 404
    try:
        urllib.request.urlopen(BASE + "/forecast?date=99990101&lead_time=48&variable=tp", timeout=5)
        print("[FAIL] GET /forecast (bad date) -> should have returned 404 but got 200")
        FAIL += 1
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print("[PASS] GET /forecast (bad date) -> correctly returned 404")
            PASS += 1
        else:
            print(f"[FAIL] GET /forecast (bad date) -> unexpected HTTP {e.code}")
            FAIL += 1

    # Dropout simulation
    post("POST /simulate-dropout (disable ai1)",
         "/simulate-dropout",
         {"date": "20230715", "lead_time": 48, "variable": "tp",
          "disabled_models": ["model_ai1"]},
         ["date", "lead_time_hours", "variable", "disabled_models", "active_models", "grid"])

    # Dropout: disable 2 models
    post("POST /simulate-dropout (disable nwp2+ai1)",
         "/simulate-dropout",
         {"date": "20230715", "lead_time": 48, "variable": "tp",
          "disabled_models": ["model_nwp2", "model_ai1"]},
         ["active_models"])

    print("=" * 55)
    total = PASS + FAIL
    print(f"Results: {PASS}/{total} PASSED  |  {FAIL}/{total} FAILED")
    print("=" * 55)
    sys.exit(0 if FAIL == 0 else 1)
