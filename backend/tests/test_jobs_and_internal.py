"""Tests for background jobs (node health, action verification, evaluate zones) and internal endpoints."""

from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from app.core.config import settings
from app.jobs.check_node_health import job_check_node_health
from app.jobs.verify_actions import job_verify_actuator_responses
from app.models.actuator import Actuator
from app.models.alert import Alert
from app.models.control_action import ControlAction
from app.models.plant_zone import PlantZone
from app.models.sensor_node import SensorNode
from app.models.sensor_reading import SensorReading


class NonClosingSession:
    def __init__(self, session):
        self._session = session

    def __getattr__(self, name):
        if name == "close":
            return lambda: None
        return getattr(self._session, name)


def test_check_node_health_flags_offline_and_creates_alert(db_session):
    zone = db_session.query(PlantZone).first()

    # Create one healthy node (seen 2 mins ago) and one stale node (seen 30 mins ago)
    now = datetime.now(UTC)
    active_node = SensorNode(
        id="healthy-esp32-node",
        zone_id=zone.id,
        api_key_hash="hash1",
        status="active",
        last_seen_at=now - timedelta(minutes=2),
    )
    stale_node = SensorNode(
        id="stale-esp32-node",
        zone_id=zone.id,
        api_key_hash="hash2",
        status="active",
        last_seen_at=now - timedelta(minutes=30),
    )
    db_session.add_all([active_node, stale_node])
    db_session.commit()

    proxy = NonClosingSession(db_session)
    with patch("app.jobs.check_node_health.SessionLocal", return_value=proxy):
        job_check_node_health()

    db_session.refresh(active_node)
    db_session.refresh(stale_node)

    assert active_node.status == "active"
    assert stale_node.status == "offline"

    # Verify system alert was created for the stale node
    alert = (
        db_session.query(Alert)
        .filter(Alert.type == "node_offline", Alert.zone_id == zone.id)
        .first()
    )
    assert alert is not None
    assert "stale-esp32-node" in alert.message


def test_verify_actions_detects_blockage_when_moisture_does_not_rise(db_session):
    zone = db_session.query(PlantZone).first()
    node = db_session.query(SensorNode).filter(SensorNode.zone_id == zone.id).first()

    act = Actuator(zone_id=zone.id, type="sprinkler", driver="relay")
    db_session.add(act)
    db_session.commit()

    now = datetime.now(UTC)
    # Executed 15 minutes ago (within the 10-20 min verification window)
    executed_time = now - timedelta(minutes=15)
    action = ControlAction(
        actuator_id=act.id,
        command="turn_on",
        duration_seconds=30,
        source="user",
        status="acked",
        executed_at=executed_time,
    )
    db_session.add(action)

    # Seed prior reading (moisture 30.0%) and post reading that remained flat/dropped (moisture 29.5%)
    prior_reading = SensorReading(
        node_id=node.id,
        soil_moisture_pct=30.0,
        temperature_c=28.0,
        humidity_pct=60.0,
        lux=500.0,
        is_valid=True,
        ts=executed_time - timedelta(minutes=2),
    )
    post_reading = SensorReading(
        node_id=node.id,
        soil_moisture_pct=29.5,  # Rise is -0.5% (below threshold of 2.0%)
        temperature_c=28.0,
        humidity_pct=60.0,
        lux=500.0,
        is_valid=True,
        ts=executed_time + timedelta(minutes=5),
    )
    db_session.add_all([prior_reading, post_reading])
    db_session.commit()

    proxy = NonClosingSession(db_session)
    with patch("app.jobs.verify_actions.SessionLocal", return_value=proxy):
        job_verify_actuator_responses()

    # Blockage alert should have been issued
    alert = (
        db_session.query(Alert)
        .filter(Alert.type == "valve_line_failure", Alert.zone_id == zone.id)
        .first()
    )
    assert alert is not None
    assert "valve failure" in alert.message.lower()


def test_internal_evaluate_endpoint_security_and_execution(client, db_session):
    # Without token -> 403
    res_no_tok = client.post("/api/v1/internal/evaluate")
    assert res_no_tok.status_code == 403

    # With wrong token -> 403
    res_bad_tok = client.post(
        "/api/v1/internal/evaluate",
        headers={"X-Internal-Token": "wrong-secret-token"},
    )
    assert res_bad_tok.status_code == 403

    # With correct token -> 200
    res_ok = client.post(
        "/api/v1/internal/evaluate",
        headers={"X-Internal-Token": settings.INTERNAL_TOKEN},
    )
    assert res_ok.status_code == 200
    assert res_ok.json()["status"] == "completed"
    assert res_ok.json()["evaluated_zones"] >= 1
