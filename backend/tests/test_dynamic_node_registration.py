"""Tests for dynamic ESP32 sensor node registration via hardwired MAC addresses."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.plant_zone import PlantZone
from app.models.sensor_node import SensorNode
from app.models.sensor_reading import SensorReading
from app.models.user import User


def test_register_node_to_zone_success(client: TestClient, db_session: Session):
    """Registering a new ESP32 node via its hardwired MAC address succeeds."""
    zone = db_session.query(PlantZone).first()
    assert zone is not None

    mac = "34:85:18:AA:BB:CC"
    payload = {
        "mac_address": mac,
        "name": "Front Hydroponic Bed Probe",
    }
    res = client.post(f"/api/v1/zones/{zone.id}/nodes", json=payload)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["mac_address"] == mac
    assert data["name"] == "Front Hydroponic Bed Probe"
    assert data["zone_id"] == zone.id
    assert data["status"] == "active"
    assert data["id"].startswith("esp32-")

    # Verify persisted in database
    node = db_session.query(SensorNode).filter(SensorNode.mac_address == mac).first()
    assert node is not None
    assert node.zone_id == zone.id


def test_register_node_mac_normalization(client: TestClient, db_session: Session):
    """Lower-case and hyphenated MAC addresses are normalized to uppercase colon-separated format."""
    zone = db_session.query(PlantZone).first()
    assert zone is not None

    raw_mac = "34-85-18-dd-ee-ff"
    payload = {
        "mac_address": raw_mac,
        "name": "Normalized Probe",
    }
    res = client.post(f"/api/v1/zones/{zone.id}/nodes", json=payload)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["mac_address"] == "34:85:18:DD:EE:FF"


def test_register_node_duplicate_mac_conflict(client: TestClient, db_session: Session):
    """Attempting to register an already registered MAC address returns 409 Conflict."""
    zone = db_session.query(PlantZone).first()
    assert zone is not None

    mac = "50:02:91:11:22:33"
    client.post(
        f"/api/v1/zones/{zone.id}/nodes",
        json={"mac_address": mac, "name": "First Probe"},
    )

    # Second attempt with same MAC
    res2 = client.post(
        f"/api/v1/zones/{zone.id}/nodes",
        json={"mac_address": mac, "name": "Duplicate Probe"},
    )
    assert res2.status_code == 409
    assert "already registered" in res2.json()["detail"]


def test_register_node_invalid_mac_rejected(client: TestClient, db_session: Session):
    """Malformed MAC addresses fail schema validation with 422."""
    zone = db_session.query(PlantZone).first()
    assert zone is not None

    bad_macs = ["not-a-mac", "24:6F:28:ZZ:YY:XX", "24:6F:28", "24:6F:28:1A:2B:3C:4D"]
    for bad in bad_macs:
        res = client.post(
            f"/api/v1/zones/{zone.id}/nodes",
            json={"mac_address": bad},
        )
        assert res.status_code == 422


def test_register_node_outsider_isolation(client: TestClient, db_session: Session):
    """An outsider cannot register a sensor node to another user's plant zone (404 Not Found)."""
    zone = db_session.query(PlantZone).first()
    assert zone is not None

    other_user = User(name="Outsider", email="outsider@garden.id", role="gardener")
    db_session.add(other_user)
    db_session.commit()
    outsider_token = create_access_token({"sub": other_user.id, "email": other_user.email, "role": other_user.role})

    res = client.post(
        f"/api/v1/zones/{zone.id}/nodes",
        json={"mac_address": "AA:BB:CC:DD:EE:01", "name": "Intruder Node"},
        headers={"Authorization": f"Bearer {outsider_token}"},
    )
    assert res.status_code == 404


def test_ingest_telemetry_via_x_node_mac(client: TestClient, db_session: Session):
    """Registered node can post sensor readings using X-Node-MAC header without an API key."""
    zone = db_session.query(PlantZone).first()
    assert zone is not None

    mac = "60:01:94:AA:BB:CC"
    reg_res = client.post(
        f"/api/v1/zones/{zone.id}/nodes",
        json={"mac_address": mac, "name": "Telemetry Node"},
    )
    assert reg_res.status_code == 201

    payload = {
        "soil_moisture_pct": 78.5,
        "temperature_c": 26.2,
        "humidity_pct": 68.0,
        "lux": 18500.0,
        "battery_v": 4.12,
    }
    # Ingest using X-Node-MAC header (unauthenticated public ingest route)
    res = client.post(
        "/api/v1/ingest/readings",
        json=payload,
        headers={"Content-Type": "application/json", "X-Node-MAC": mac},
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["status"] == "success"
    assert data["is_valid"] is True

    # Verify reading was persisted and node last_seen_at refreshed
    node = db_session.query(SensorNode).filter(SensorNode.mac_address == mac).first()
    assert node.last_seen_at is not None
    reading = db_session.query(SensorReading).filter(SensorReading.node_id == node.id).first()
    assert reading is not None
    assert reading.soil_moisture_pct == 78.5


def test_ingest_unregistered_mac_rejected(client: TestClient):
    """Unregistered MAC address is rejected with 401 Unauthorized (auto-discovery disabled)."""
    unregistered_mac = "70:EE:50:99:88:77"
    payload = {
        "soil_moisture_pct": 75.0,
        "temperature_c": 25.0,
        "humidity_pct": 70.0,
        "lux": 15000.0,
    }
    res = client.post(
        "/api/v1/ingest/readings",
        json=payload,
        headers={"Content-Type": "application/json", "X-Node-MAC": unregistered_mac},
    )
    assert res.status_code == 401
    assert "not registered" in res.json()["detail"]


def test_node_commands_polling_and_ack_via_mac(client: TestClient, db_session: Session):
    """Polling and acknowledging actuator commands via X-Node-MAC header succeeds."""
    zone = db_session.query(PlantZone).first()
    assert zone is not None

    mac = "80:7D:3A:11:22:33"
    reg_res = client.post(
        f"/api/v1/zones/{zone.id}/nodes",
        json={"mac_address": mac, "name": "Command Test Node"},
    )
    assert reg_res.status_code == 201
    node_id = reg_res.json()["id"]

    # Poll commands with X-Node-MAC using node ID
    poll_res = client.get(
        f"/api/v1/nodes/{node_id}/commands",
        headers={"X-Node-MAC": mac},
    )
    assert poll_res.status_code == 200
    assert isinstance(poll_res.json(), list)

    # Also poll commands using MAC address in URL
    poll_res_mac = client.get(
        f"/api/v1/nodes/{mac}/commands",
        headers={"X-Node-MAC": mac},
    )
    assert poll_res_mac.status_code == 200

    # Polling with mismatched MAC is rejected
    bad_poll = client.get(
        f"/api/v1/nodes/{node_id}/commands",
        headers={"X-Node-MAC": "99:99:99:99:99:99"},
    )
    assert bad_poll.status_code == 401


def test_delete_and_unlink_sensor_node(client: TestClient, db_session: Session):
    """A registered sensor node can be deleted/unregistered by its owner."""
    zone = db_session.query(PlantZone).first()
    assert zone is not None

    mac = "90:B6:86:12:34:56"
    reg_res = client.post(
        f"/api/v1/zones/{zone.id}/nodes",
        json={"mac_address": mac, "name": "Ephemeral Node"},
    )
    assert reg_res.status_code == 201
    node_id = reg_res.json()["id"]

    # Delete node
    del_res = client.delete(f"/api/v1/nodes/{node_id}")
    assert del_res.status_code == 204

    # Verify deleted from DB
    deleted = db_session.query(SensorNode).filter(SensorNode.id == node_id).first()
    assert deleted is None

    # Ingestion with that MAC now fails
    res = client.post(
        "/api/v1/ingest/readings",
        json={"soil_moisture_pct": 70, "temperature_c": 25, "humidity_pct": 60, "lux": 10000},
        headers={"Content-Type": "application/json", "X-Node-MAC": mac},
    )
    assert res.status_code == 401


def test_multiple_nodes_per_zone_registration_and_listing(client: TestClient, db_session: Session):
    """Multiple sensor nodes can be registered to the same plant zone and are listed together."""
    zone = db_session.query(PlantZone).first()
    assert zone is not None

    mac1 = "A0:20:A6:01:00:11"
    mac2 = "A0:20:A6:01:00:22"

    res1 = client.post(
        f"/api/v1/zones/{zone.id}/nodes",
        json={"mac_address": mac1, "name": "Bed A North Sensor"},
    )
    assert res1.status_code == 201, res1.text

    res2 = client.post(
        f"/api/v1/zones/{zone.id}/nodes",
        json={"mac_address": mac2, "name": "Bed A South Sensor"},
    )
    assert res2.status_code == 201, res2.text

    # List nodes for this zone
    list_res = client.get(f"/api/v1/nodes?zone_id={zone.id}")
    assert list_res.status_code == 200
    nodes = list_res.json()
    macs = [n["mac_address"] for n in nodes]
    assert mac1 in macs
    assert mac2 in macs
    assert len(nodes) >= 2

    # Garden zones endpoint reflects sensor_node_count
    zones_res = client.get(f"/api/v1/gardens/{zone.garden_id}/zones")
    assert zones_res.status_code == 200
    matched_zone = next(z for z in zones_res.json() if z["id"] == zone.id)
    assert matched_zone["sensor_node_count"] >= 2


def test_multi_node_zone_status_aggregation(client: TestClient, db_session: Session):
    """Zone status averages latest metrics across all active sensor nodes in the zone."""
    zone = db_session.query(PlantZone).first()
    assert zone is not None

    mac_a = "B2:11:22:33:44:01"
    mac_b = "B2:11:22:33:44:02"

    # Register 2 nodes for the zone
    r_a = client.post(f"/api/v1/zones/{zone.id}/nodes", json={"mac_address": mac_a, "name": "Node A"})
    r_b = client.post(f"/api/v1/zones/{zone.id}/nodes", json={"mac_address": mac_b, "name": "Node B"})
    assert r_a.status_code == 201
    assert r_b.status_code == 201

    # Ingest distinct readings
    ing_a = client.post(
        "/api/v1/ingest/readings",
        json={"soil_moisture_pct": 60.0, "temperature_c": 24.0, "humidity_pct": 60.0, "lux": 10000},
        headers={"Content-Type": "application/json", "X-Node-MAC": mac_a},
    )
    assert ing_a.status_code == 201

    ing_b = client.post(
        "/api/v1/ingest/readings",
        json={"soil_moisture_pct": 80.0, "temperature_c": 28.0, "humidity_pct": 80.0, "lux": 20000},
        headers={"Content-Type": "application/json", "X-Node-MAC": mac_b},
    )
    assert ing_b.status_code == 201

    # Check zone status aggregates both nodes: moisture avg = 70.0, temp avg = 26.0
    status_res = client.get(f"/api/v1/zones/{zone.id}/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["latest_reading"]["soil_moisture_pct"] == 70.0
    assert status_data["latest_reading"]["temperature_c"] == 26.0
    assert status_data["latest_reading"]["humidity_pct"] == 70.0
    assert status_data["latest_reading"]["lux"] == 15000.0


def test_register_node_via_nodes_post_endpoint(client: TestClient, db_session: Session):
    """Sensor nodes can be registered via POST /api/v1/nodes with zone_id in body."""
    zone = db_session.query(PlantZone).first()
    assert zone is not None

    mac = "C4:55:66:77:88:99"
    res = client.post(
        "/api/v1/nodes",
        json={"zone_id": zone.id, "mac_address": mac, "name": "Direct Nodes Route Probe"},
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["mac_address"] == mac
    assert data["zone_id"] == zone.id

    # Missing zone_id returns 422
    bad_res = client.post(
        "/api/v1/nodes",
        json={"mac_address": "C4:55:66:77:88:00"},
    )
    assert bad_res.status_code == 422

