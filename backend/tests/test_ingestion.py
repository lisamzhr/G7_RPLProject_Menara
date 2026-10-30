"""Unit & integration tests for sensor telemetry ingestion endpoint."""

from app.models.sensor_node import SensorNode


def test_ingest_valid_reading(client, db_session):
    payload = {
        "node_id": "esp32-node-test",
        "soil_moisture_pct": 82.5,
        "temperature_c": 25.4,
        "humidity_pct": 72.0,
        "lux": 15000.0,
        "battery_v": 3.9,
    }
    headers = {"X-Node-Key": "valid-secret-key-123"}
    res = client.post("/api/v1/ingest/readings", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "success"
    assert data["is_valid"] is True
    assert data["node_id"] == "esp32-node-test"

    # Verify node last_seen_at updated
    node = db_session.query(SensorNode).filter(SensorNode.id == "esp32-node-test").first()
    assert node.last_seen_at is not None


def test_ingest_out_of_range_reading_marked_invalid(client):
    # Moisture > 100% and temperature > 70C
    payload = {
        "node_id": "esp32-node-test",
        "soil_moisture_pct": 145.0,  # Out of range!
        "temperature_c": 85.0,  # Out of range!
        "humidity_pct": 72.0,
        "lux": 15000.0,
    }
    headers = {"X-Node-Key": "valid-secret-key-123"}
    res = client.post("/api/v1/ingest/readings", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["is_valid"] is False


def test_ingest_duplicate_reading_dropped(client):
    fixed_ts = "2026-10-13T12:00:00Z"
    payload = {
        "node_id": "esp32-node-test",
        "ts": fixed_ts,
        "soil_moisture_pct": 80.0,
        "temperature_c": 26.0,
        "humidity_pct": 70.0,
        "lux": 15000.0,
    }
    headers = {"X-Node-Key": "valid-secret-key-123"}

    # First ingestion
    res1 = client.post("/api/v1/ingest/readings", json=payload, headers=headers)
    assert res1.status_code == 201
    assert res1.json()["status"] == "success"

    # Duplicate ingestion with same node_id and timestamp
    res2 = client.post("/api/v1/ingest/readings", json=payload, headers=headers)
    assert res2.status_code == 201
    assert res2.json()["status"] == "duplicate_dropped"


def test_ingest_unauthorized_key(client):
    payload = {
        "node_id": "esp32-node-test",
        "soil_moisture_pct": 80.0,
        "temperature_c": 26.0,
        "humidity_pct": 70.0,
        "lux": 15000.0,
    }
    headers = {"X-Node-Key": "wrong-secret-key"}
    res = client.post("/api/v1/ingest/readings", json=payload, headers=headers)
    assert res.status_code == 401


def test_ingest_missing_header(client):
    payload = {
        "node_id": "esp32-node-test",
        "soil_moisture_pct": 80.0,
        "temperature_c": 26.0,
        "humidity_pct": 70.0,
        "lux": 15000.0,
    }
    res = client.post("/api/v1/ingest/readings", json=payload)
    assert res.status_code == 401
