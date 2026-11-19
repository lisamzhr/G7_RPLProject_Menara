"""Tests for actuator command, node polling, and lifecycle verification."""

from datetime import UTC, datetime

from app.models.actuator import Actuator
from app.models.plant_zone import PlantZone

TEST_NODE_MAC = "24:6F:28:AA:BB:CC"


def test_actuator_command_flow(client, db_session):
    zone = db_session.query(PlantZone).first()

    # Add actuator to zone
    act = Actuator(
        zone_id=zone.id,
        type="sprinkler",
        driver="relay",
        max_on_seconds=60,
        min_interval_minutes=120,
    )
    db_session.add(act)
    db_session.commit()

    # 1. Post manual command to actuator
    cmd_res = client.post(
        f"/api/v1/actuators/{act.id}/command", json={"command": "turn_on", "duration_seconds": 30}
    )
    assert cmd_res.status_code == 200
    cmd_id = cmd_res.json()["command_id"]

    # 2. Node polls for pending commands via MAC (and updates node last_seen_at)
    headers = {"X-Node-MAC": TEST_NODE_MAC}
    poll_res = client.get(f"/api/v1/nodes/{TEST_NODE_MAC}/commands", headers=headers)
    assert poll_res.status_code == 200
    commands = poll_res.json()
    assert len(commands) == 1
    assert commands[0]["command_id"] == cmd_id

    # 3. Node acknowledges command execution with executed_at
    ack_res = client.post(
        f"/api/v1/nodes/{TEST_NODE_MAC}/commands/{cmd_id}/ack",
        json={
            "status": "acked",
            "executed_at": "2026-11-05T19:30:00Z",
            "result": "Relay engaged for 30s",
        },
        headers=headers,
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "acknowledged"

    # Verify executed_at and result were persisted in ControlAction
    from app.models.base import ensure_utc
    from app.models.control_action import ControlAction

    db_cmd = db_session.query(ControlAction).filter(ControlAction.id == cmd_id).first()
    assert db_cmd is not None
    assert db_cmd.status == "acked"
    assert db_cmd.result == "Relay engaged for 30s"
    assert ensure_utc(db_cmd.executed_at) == datetime(2026, 11, 5, 19, 30, 0, tzinfo=UTC)

    # 4. Polling again returns 0 pending commands
    poll_res2 = client.get(f"/api/v1/nodes/{TEST_NODE_MAC}/commands", headers=headers)
    assert len(poll_res2.json()) == 0


def test_ack_command_wrong_node_rejected(client, db_session):
    from app.models.garden import Garden
    from app.models.plant_category import PlantCategory
    from app.models.sensor_node import SensorNode

    zone1 = db_session.query(PlantZone).first()
    act1 = Actuator(
        zone_id=zone1.id,
        type="sprinkler",
        driver="relay",
        max_on_seconds=60,
        min_interval_minutes=0,
    )
    db_session.add(act1)

    garden = db_session.query(Garden).first()
    cat = db_session.query(PlantCategory).first()
    zone2 = PlantZone(
        garden_id=garden.id,
        category_id=cat.id,
        label="Zone 2 - Other",
        plant_names=["Mint"],
    )
    db_session.add(zone2)
    db_session.commit()

    other_mac = "24:6F:28:11:22:33"
    node2 = SensorNode(
        id="esp32-246f28112233",
        mac_address=other_mac,
        zone_id=zone2.id,
        status="active",
    )
    db_session.add(node2)
    db_session.commit()

    # Queue command on Zone 1 actuator
    cmd_res = client.post(
        f"/api/v1/actuators/{act1.id}/command", json={"command": "turn_on", "duration_seconds": 20}
    )
    cmd_id = cmd_res.json()["command_id"]

    # Node 2 (Zone 2) attempts to ACK Zone 1's command -> 404 rejected
    headers = {"X-Node-MAC": other_mac}
    ack_res = client.post(
        f"/api/v1/nodes/{other_mac}/commands/{cmd_id}/ack",
        json={"status": "acked", "result": "Wrong node"},
        headers=headers,
    )
    assert ack_res.status_code == 404


def test_commands_legacy_api_key_rejected(client):
    """Legacy X-Node-Key without X-Node-MAC is rejected with 401."""
    res = client.get(
        f"/api/v1/nodes/{TEST_NODE_MAC}/commands",
        headers={"X-Node-Key": "valid-secret-key-123"},
    )
    assert res.status_code == 401


def test_actuator_command_fifo_ordering(client, db_session):
    zone = db_session.query(PlantZone).first()

    act = Actuator(
        zone_id=zone.id,
        type="sprinkler",
        driver="relay",
        max_on_seconds=60,
        min_interval_minutes=0,
    )
    db_session.add(act)
    db_session.commit()

    # Queue two commands in order
    res1 = client.post(
        f"/api/v1/actuators/{act.id}/command", json={"command": "turn_on", "duration_seconds": 15}
    )
    assert res1.status_code == 200
    cmd1_id = res1.json()["command_id"]

    res2 = client.post(
        f"/api/v1/actuators/{act.id}/command", json={"command": "turn_off", "duration_seconds": 1}
    )
    assert res2.status_code == 200
    cmd2_id = res2.json()["command_id"]

    headers = {"X-Node-MAC": TEST_NODE_MAC}
    poll_res = client.get(f"/api/v1/nodes/{TEST_NODE_MAC}/commands", headers=headers)
    assert poll_res.status_code == 200
    commands = poll_res.json()
    assert len(commands) == 2
    assert commands[0]["command_id"] == cmd1_id
    assert commands[1]["command_id"] == cmd2_id


def test_actuator_invalid_command_rejected(client, db_session):
    zone = db_session.query(PlantZone).first()
    act = Actuator(
        zone_id=zone.id,
        type="sprinkler",
        driver="relay",
        max_on_seconds=60,
        min_interval_minutes=0,
    )
    db_session.add(act)
    db_session.commit()

    # Invalid command name
    res = client.post(
        f"/api/v1/actuators/{act.id}/command",
        json={"command": "unsupported_cmd", "duration_seconds": 30},
    )
    assert res.status_code == 422

    # Invalid duration <= 0
    res2 = client.post(
        f"/api/v1/actuators/{act.id}/command", json={"command": "turn_on", "duration_seconds": 0}
    )
    assert res2.status_code == 422


def test_actuator_cooldown_timezone_safety(client, db_session):
    zone = db_session.query(PlantZone).first()
    act = Actuator(
        zone_id=zone.id,
        type="sprinkler",
        driver="relay",
        max_on_seconds=60,
        min_interval_minutes=120,
    )
    db_session.add(act)
    db_session.commit()

    # First turn_on succeeds
    res1 = client.post(
        f"/api/v1/actuators/{act.id}/command", json={"command": "turn_on", "duration_seconds": 30}
    )
    assert res1.status_code == 200

    # Second turn_on hits cooldown and does not raise TypeError with SQLite naive datetime
    res2 = client.post(
        f"/api/v1/actuators/{act.id}/command", json={"command": "turn_on", "duration_seconds": 30}
    )
    assert res2.status_code == 400
    assert "cooldown active" in res2.json()["detail"].lower()
