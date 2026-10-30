"""Tests for actuator command and node polling."""

from app.models.actuator import Actuator
from app.models.plant_zone import PlantZone


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

    # 2. Node polls for pending commands
    headers = {"X-Node-Key": "valid-secret-key-123"}
    poll_res = client.get("/api/v1/nodes/esp32-node-test/commands", headers=headers)
    assert poll_res.status_code == 200
    commands = poll_res.json()
    assert len(commands) == 1
    assert commands[0]["command_id"] == cmd_id

    # 3. Node acknowledges command execution
    ack_res = client.post(
        f"/api/v1/nodes/esp32-node-test/commands/{cmd_id}/ack",
        json={"status": "acked", "result": "Relay engaged for 30s"},
        headers=headers,
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "acknowledged"

    # 4. Polling again returns 0 pending commands
    poll_res2 = client.get("/api/v1/nodes/esp32-node-test/commands", headers=headers)
    assert len(poll_res2.json()) == 0
