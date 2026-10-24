from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_get_algorithms():
    resp = client.get("/api/algorithms")
    assert resp.status_code == 200
    body = resp.json()
    assert set(body["algorithms"].keys()) == {"fifo", "static_priority", "adaptive_priority"}
    assert "alpha" in body["algorithms"]["adaptive_priority"]["formula"]


def test_get_config_defaults():
    resp = client.get("/api/config/defaults")
    assert resp.status_code == 200
    body = resp.json()
    assert set(body["scenarios"].keys()) == {"light", "moderate", "heavy"}
    assert len(body["traffic_classes"]) == 6
    assert body["default_scheduler"] == "adaptive_priority"


def test_simulate_with_builtin_scenario():
    resp = client.post(
        "/api/simulate",
        json={"scenario": "moderate", "scheduler": "adaptive_priority", "alpha": 0.5, "seed": 1},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["config"]["scenario"] == "moderate"
    assert body["summary"]["scheduler"] == "adaptive_priority"
    assert body["summary"]["packets_generated"] >= 0
    assert len(body["packet_samples"]) <= 200
    assert len(body["queue_utilisation_history"]) == body["config"]["duration"]


def test_simulate_with_custom_scenario():
    rates = {
        "voice": 0.1, "gaming": 0.1, "video": 0.1,
        "normal_data": 0.1, "file_transfer": 0.1, "background": 0.1,
    }
    resp = client.post(
        "/api/simulate",
        json={
            "scenario": "custom",
            "arrival_rates": rates,
            "queue_capacity": 10,
            "service_rate": 1,
            "duration": 50,
            "scheduler": "fifo",
            "seed": 1,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["config"]["queue_capacity"] == 10
    assert body["config"]["duration"] == 50


def test_simulate_custom_scenario_missing_rates_is_rejected():
    resp = client.post("/api/simulate", json={"scenario": "custom"})
    assert resp.status_code == 422


def test_simulate_invalid_arrival_rate_is_rejected():
    resp = client.post(
        "/api/simulate",
        json={"scenario": "custom", "arrival_rates": {"voice": 1.5}},
    )
    assert resp.status_code == 422


def test_simulate_invalid_queue_capacity_is_rejected():
    resp = client.post("/api/simulate", json={"scenario": "moderate", "queue_capacity": 0})
    assert resp.status_code == 422


def test_compare_scheduling_only_builtin_scenario():
    resp = client.post("/api/compare", json={"mode": "scheduling_only", "scenario": "heavy", "seed": 2})
    assert resp.status_code == 200
    body = resp.json()
    assert set(body["results"].keys()) == {"fifo", "static_priority", "adaptive_priority"}
    # Mode A: all three must report the same drop policy (tail_drop) and
    # same number of generated packets (same trace).
    generated = {r["packets_generated"] for r in body["results"].values()}
    assert len(generated) == 1
    assert all(r["drop_policy"] == "tail_drop" for r in body["results"].values())


def test_compare_congestion_protection_builtin_scenario():
    resp = client.post("/api/compare", json={"mode": "congestion_protection", "scenario": "heavy", "seed": 3})
    assert resp.status_code == 200
    body = resp.json()
    assert set(body["results"].keys()) == {"tail_drop", "priority_displace"}
    assert all(r["scheduler"] == "adaptive_priority" for r in body["results"].values())


def test_compare_custom_scenario_missing_rates_is_rejected():
    resp = client.post("/api/compare", json={"mode": "scheduling_only", "scenario": "custom"})
    assert resp.status_code == 422
