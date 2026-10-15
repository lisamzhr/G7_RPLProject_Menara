"""Tests for zone status endpoint vs botanical threshold profiles."""

from app.models.plant_zone import PlantZone


def test_zone_status_ok(client, db_session):
    zone = db_session.query(PlantZone).first()

    # Post an ideal reading for the node in this zone (leafy: moisture 76-98, temp 22-27)
    payload = {
        "node_id": "esp32-node-test",
        "soil_moisture_pct": 85.0,
        "temperature_c": 24.5,
        "humidity_pct": 70.0,
        "lux": 15000.0,
    }
    client.post(
        "/api/v1/ingest/readings", json=payload, headers={"X-Node-Key": "valid-secret-key-123"}
    )

    res = client.get(f"/api/v1/zones/{zone.id}/status")
    assert res.status_code == 200
    data = res.json()
    assert data["zone_id"] == zone.id
    assert data["overall_status"] == "normal"
    assert data["parameter_status"]["moisture"]["status"] == "ok"
    assert data["parameter_status"]["temperature"]["status"] == "ok"


def test_zone_status_low_moisture_warning(client, db_session):
    zone = db_session.query(PlantZone).first()

    # Post a low moisture reading (65% < 76% min)
    payload = {
        "node_id": "esp32-node-test",
        "soil_moisture_pct": 65.0,
        "temperature_c": 25.0,
        "humidity_pct": 70.0,
        "lux": 15000.0,
    }
    client.post(
        "/api/v1/ingest/readings", json=payload, headers={"X-Node-Key": "valid-secret-key-123"}
    )

    res = client.get(f"/api/v1/zones/{zone.id}/status")
    assert res.status_code == 200
    data = res.json()
    assert data["overall_status"] == "warning"
    assert data["parameter_status"]["moisture"]["status"] == "low"


def test_zone_status_404(client):
    res = client.get("/api/v1/zones/non-existent-zone-id/status")
    assert res.status_code == 404
