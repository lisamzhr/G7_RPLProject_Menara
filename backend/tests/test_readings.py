"""Tests for historical readings endpoint."""

from app.models.plant_zone import PlantZone


def test_zone_readings_query(client, db_session):
    zone = db_session.query(PlantZone).first()

    # Ingest 2 readings
    headers = {"X-Node-Key": "valid-secret-key-123"}
    client.post("/api/v1/ingest/readings", json={
        "node_id": "esp32-node-test",
        "soil_moisture_pct": 82.0,
        "temperature_c": 25.0,
        "humidity_pct": 70.0,
        "lux": 15000.0,
    }, headers=headers)

    client.post("/api/v1/ingest/readings", json={
        "node_id": "esp32-node-test",
        "soil_moisture_pct": 83.0,
        "temperature_c": 25.2,
        "humidity_pct": 71.0,
        "lux": 16000.0,
    }, headers=headers)

    res = client.get(f"/api/v1/zones/{zone.id}/readings?range=24h&agg=raw")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 2
    assert "soil_moisture_pct" in data[0]
