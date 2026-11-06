"""Tests for actuator listing, state formatting, command safety caps, cooldowns, and scoping."""

from datetime import UTC, datetime, timedelta

from app.core.security import create_access_token
from app.models.actuator import Actuator
from app.models.control_action import ControlAction
from app.models.plant_zone import PlantZone
from app.models.user import User


def test_list_actuators_with_last_action(client, db_session):
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

    # Add historical control action
    action = ControlAction(
        actuator_id=act.id,
        command="turn_on",
        duration_seconds=30,
        source="user",
        status="acked",
        executed_at=datetime.now(UTC) - timedelta(minutes=10),
    )
    db_session.add(action)
    db_session.commit()

    res = client.get("/api/v1/actuators")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    target = next((a for a in data if a["id"] == act.id), None)
    assert target is not None
    assert target["type"] == "sprinkler"
    assert target["last_action"] is not None
    assert target["last_action"]["command"] == "turn_on"
    assert target["last_action"]["status"] == "acked"


def test_list_actuators_filter_by_zone(client, db_session):
    zone = db_session.query(PlantZone).first()
    res = client.get(f"/api/v1/actuators?zone_id={zone.id}")
    assert res.status_code == 200
    for a in res.json():
        assert a["zone_id"] == zone.id


def test_list_actuators_outsider_isolation(client, db_session):
    outsider = User(name="Outsider", email="outsider@garden.id", role="gardener")
    db_session.add(outsider)
    db_session.commit()

    token = create_access_token({"sub": outsider.id, "email": outsider.email, "role": outsider.role})
    res = client.get("/api/v1/actuators", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json() == []


def test_command_actuator_caps_duration(client, db_session):
    zone = db_session.query(PlantZone).first()
    act = Actuator(
        zone_id=zone.id,
        type="valve",
        driver="relay",
        max_on_seconds=45,
        min_interval_minutes=30,
    )
    db_session.add(act)
    db_session.commit()

    # Request 120s -> should be capped to 45s
    res = client.post(
        f"/api/v1/actuators/{act.id}/command",
        json={"command": "turn_on", "duration_seconds": 120},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "pending"

    action = db_session.query(ControlAction).filter(ControlAction.actuator_id == act.id).first()
    assert action is not None
    assert action.duration_seconds == 45


def test_command_actuator_cooldown_rejection(client, db_session):
    zone = db_session.query(PlantZone).first()
    act = Actuator(
        zone_id=zone.id,
        type="pump",
        driver="relay",
        max_on_seconds=60,
        min_interval_minutes=60,
    )
    db_session.add(act)
    db_session.commit()

    # First turn_on works
    res1 = client.post(
        f"/api/v1/actuators/{act.id}/command",
        json={"command": "turn_on", "duration_seconds": 30},
    )
    assert res1.status_code == 200

    # Second turn_on within cooldown -> 400
    res2 = client.post(
        f"/api/v1/actuators/{act.id}/command",
        json={"command": "turn_on", "duration_seconds": 30},
    )
    assert res2.status_code == 400
    assert "cooldown" in res2.json()["detail"].lower()

    # But turn_off is always allowed during cooldown
    res_off = client.post(
        f"/api/v1/actuators/{act.id}/command",
        json={"command": "turn_off"},
    )
    assert res_off.status_code == 200
