"""Tests for historical readings endpoint."""

from app.models.plant_zone import PlantZone


def test_zone_readings_query(client, db_session):
    zone = db_session.query(PlantZone).first()

    # Ingest 2 readings
    headers = {"X-Node-Key": "valid-secret-key-123"}
    client.post(
        "/api/v1/ingest/readings",
        json={
            "node_id": "esp32-node-test",
            "soil_moisture_pct": 82.0,
            "temperature_c": 25.0,
            "humidity_pct": 70.0,
            "lux": 15000.0,
        },
        headers=headers,
    )

    client.post(
        "/api/v1/ingest/readings",
        json={
            "node_id": "esp32-node-test",
            "soil_moisture_pct": 83.0,
            "temperature_c": 25.2,
            "humidity_pct": 71.0,
            "lux": 16000.0,
        },
        headers=headers,
    )

    res = client.get(f"/api/v1/zones/{zone.id}/readings?range=24h&agg=raw")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 2
    assert "soil_moisture_pct" in data[0]


def test_zone_readings_hourly_aggregation(client, db_session):
    zone = db_session.query(PlantZone).first()
    headers = {"X-Node-Key": "valid-secret-key-123"}

    # Ingest 2 readings in the same current hour
    client.post(
        "/api/v1/ingest/readings",
        json={
            "node_id": "esp32-node-test",
            "soil_moisture_pct": 80.0,
            "temperature_c": 24.0,
            "humidity_pct": 70.0,
            "lux": 10000.0,
        },
        headers=headers,
    )

    client.post(
        "/api/v1/ingest/readings",
        json={
            "node_id": "esp32-node-test",
            "soil_moisture_pct": 90.0,
            "temperature_c": 26.0,
            "humidity_pct": 80.0,
            "lux": 20000.0,
        },
        headers=headers,
    )

    res = client.get(f"/api/v1/zones/{zone.id}/readings?range=24h&agg=hourly")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1  # Both readings in same hour bucketed together
    assert data[0]["soil_moisture_pct"] == 85.0  # Average of 80 and 90
    assert data[0]["temperature_c"] == 25.0  # Average of 24 and 26
    assert data[0]["humidity_pct"] == 75.0  # Average of 70 and 80
    assert data[0]["lux"] == 15000.0  # Average of 10000 and 20000
