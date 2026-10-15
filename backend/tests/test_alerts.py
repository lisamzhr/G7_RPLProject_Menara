"""Tests for alert confirmation and human-in-the-loop actuator command triggering."""

from app.models.actuator import Actuator
from app.models.alert import Alert
from app.models.control_action import ControlAction
from app.models.plant_zone import PlantZone


def test_confirm_alert_queues_actuator_action(client, db_session):
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

    # Create an action alert that requires confirmation
    alert = Alert(
        zone_id=zone.id,
        level="warning",
        type="action_water",
        message="Action 'water' requires confirmation: Moisture is below threshold",
        requires_confirmation=True,
    )
    db_session.add(alert)
    db_session.commit()

    # User confirms the alert
    res = client.post(
        f"/api/v1/alerts/{alert.id}/confirm",
        json={"comment": "Watering approved by gardener via test"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "confirmed"

    # Verify that a pending ControlAction was queued for the actuator
    cmd = (
        db_session.query(ControlAction)
        .filter(ControlAction.actuator_id == act.id, ControlAction.source == "human_confirmed")
        .first()
    )
    assert cmd is not None
    assert cmd.command == "turn_on"
    assert cmd.duration_seconds == 30
    assert cmd.status == "pending"


def test_override_alert_does_not_queue_actuator_action(client, db_session):
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

    alert = Alert(
        zone_id=zone.id,
        level="warning",
        type="action_water",
        message="Action 'water' requires confirmation",
        requires_confirmation=True,
    )
    db_session.add(alert)
    db_session.commit()

    # User overrides the alert
    res = client.post(
        f"/api/v1/alerts/{alert.id}/override",
        json={"comment": "I watered manually"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "overridden"

    # Verify no control action was queued
    cmd = (
        db_session.query(ControlAction)
        .filter(ControlAction.actuator_id == act.id, ControlAction.source == "human_confirmed")
        .first()
    )
    assert cmd is None
