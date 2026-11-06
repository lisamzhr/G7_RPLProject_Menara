"""Tests for alert queries, filters, confirmations, recommendation feeds, and user feedback."""

from datetime import UTC, datetime, timedelta

from app.core.security import create_access_token
from app.models.alert import Alert
from app.models.feedback import Feedback
from app.models.plant_zone import PlantZone
from app.models.recommendation import Recommendation
from app.models.user import User


def test_alerts_filtering_and_outsider_isolation(client, db_session):
    zone = db_session.query(PlantZone).first()

    # Active alert
    active_alert = Alert(
        zone_id=zone.id,
        level="warning",
        type="low_moisture",
        message="Soil moisture is low",
        requires_confirmation=True,
    )
    # Resolved alert
    resolved_alert = Alert(
        zone_id=zone.id,
        level="info",
        type="routine_report",
        message="Routine health check normal",
        resolved_at=datetime.now(UTC) - timedelta(hours=1),
    )
    db_session.add_all([active_alert, resolved_alert])
    db_session.commit()

    # Default / active only
    res_active = client.get("/api/v1/alerts?status_filter=active")
    assert res_active.status_code == 200
    active_ids = [a["id"] for a in res_active.json()]
    assert active_alert.id in active_ids
    assert resolved_alert.id not in active_ids

    # Resolved only
    res_resolved = client.get("/api/v1/alerts?status_filter=resolved")
    assert res_resolved.status_code == 200
    resolved_ids = [a["id"] for a in res_resolved.json()]
    assert resolved_alert.id in resolved_ids
    assert active_alert.id not in resolved_ids

    # All
    res_all = client.get("/api/v1/alerts?status_filter=all")
    assert res_all.status_code == 200
    all_ids = [a["id"] for a in res_all.json()]
    assert active_alert.id in all_ids
    assert resolved_alert.id in all_ids

    # Invalid filter -> 422
    assert client.get("/api/v1/alerts?status_filter=invalid_filter").status_code == 422

    # Outsider isolation
    outsider = User(name="Alert Outsider", email="alert.out@garden.id", role="gardener")
    db_session.add(outsider)
    db_session.commit()
    out_tok = create_access_token({"sub": outsider.id, "email": outsider.email, "role": outsider.role})
    res_out = client.get("/api/v1/alerts?status_filter=all", headers={"Authorization": f"Bearer {out_tok}"})
    assert res_out.status_code == 200
    assert res_out.json() == []


def test_recommendations_and_alert_feedback(client, db_session):
    zone = db_session.query(PlantZone).first()
    rec = Recommendation(
        zone_id=zone.id,
        status_level="warning",
        message="Increase irrigation interval due to expected dry conditions",
        reasons=["Low moisture reading", "High ambient temperature"],
    )
    alert_to_confirm = Alert(
        zone_id=zone.id,
        level="warning",
        type="moisture_critical",
        message="Critical dry condition detected, requires watering",
        requires_confirmation=True,
    )
    alert_to_override = Alert(
        zone_id=zone.id,
        level="warning",
        type="high_temp",
        message="Heatwave advisory",
        requires_confirmation=True,
    )
    db_session.add_all([rec, alert_to_confirm, alert_to_override])
    db_session.commit()

    # List recommendations
    res_recs = client.get("/api/v1/recommendations")
    assert res_recs.status_code == 200
    rec_ids = [r["id"] for r in res_recs.json()]
    assert rec.id in rec_ids

    # Filter by zone
    res_zone_recs = client.get(f"/api/v1/recommendations?zone_id={zone.id}")
    assert res_zone_recs.status_code == 200
    assert all(r["zone_id"] == zone.id for r in res_zone_recs.json())

    # Submit feedback: confirm alert
    res_confirm = client.post(
        f"/api/v1/alerts/{alert_to_confirm.id}/confirm",
        json={"comment": "Irrigated manually, looks good"},
    )
    assert res_confirm.status_code == 200
    assert res_confirm.json()["status"] == "confirmed"

    # Submit feedback: override alert
    res_override = client.post(
        f"/api/v1/alerts/{alert_to_override.id}/override",
        json={"comment": "Sensor is placed near hot exhaust, false alarm"},
    )
    assert res_override.status_code == 200
    assert res_override.json()["status"] == "overridden"

    # Verify feedbacks persisted in database
    feedbacks = db_session.query(Feedback).all()
    assert len(feedbacks) >= 2
    decisions = [f.decision for f in feedbacks]
    assert "confirm" in decisions
    assert "override" in decisions
