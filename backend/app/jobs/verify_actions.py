"""Scheduled job: verify moisture rise 10 min after watering to detect pipe/valve blockages."""

import logging
from datetime import UTC, datetime, timedelta

from app.core.database import SessionLocal
from app.models.control_action import ControlAction
from app.models.sensor_reading import SensorReading
from app.services.notification_service import create_system_alert

logger = logging.getLogger("roofgarden.jobs.verify_actions")


def job_verify_actuator_responses():
    logger.info("Executing scheduled job: verify_actions")
    db = SessionLocal()
    try:
        now = datetime.now(UTC)
        # Check auto watering actions executed between 10 and 20 minutes ago
        window_start = now - timedelta(minutes=20)
        window_end = now - timedelta(minutes=10)

        actions = (
            db.query(ControlAction)
            .filter(
                ControlAction.command == "turn_on",
                ControlAction.source == "auto",
                ControlAction.status == "acked",
                ControlAction.executed_at >= window_start,
                ControlAction.executed_at <= window_end,
            )
            .all()
        )

        for act in actions:
            zone = act.actuator.zone
            node_ids = [n.id for n in zone.sensor_nodes]
            if not node_ids:
                continue

            # Query readings right before execution vs post execution
            prior_reading = (
                db.query(SensorReading)
                .filter(SensorReading.node_id.in_(node_ids), SensorReading.ts <= act.executed_at)
                .order_by(SensorReading.ts.desc())
                .first()
            )
            post_reading = (
                db.query(SensorReading)
                .filter(SensorReading.node_id.in_(node_ids), SensorReading.ts > act.executed_at)
                .order_by(SensorReading.ts.desc())
                .first()
            )

            if prior_reading and post_reading:
                delta = post_reading.soil_moisture_pct - prior_reading.soil_moisture_pct
                if delta < 1.0: # Moisture failed to increase after watering
                    create_system_alert(
                        db=db,
                        zone_id=zone.id,
                        level="warning",
                        alert_type="valve_line_failure",
                        message=(
                            f"Possible irrigation line/valve failure on '{zone.label}': "
                            f"Sprinkler was commanded ON for {act.duration_seconds}s, "
                            f"but moisture did not rise (prior: {prior_reading.soil_moisture_pct:.1f}%, current: {post_reading.soil_moisture_pct:.1f}%)."
                        ),
                        requires_confirmation=True,
                    )
        db.commit()
    except Exception as e:
        logger.error(f"Error verifying actuator responses: {e}")
    finally:
        db.close()
