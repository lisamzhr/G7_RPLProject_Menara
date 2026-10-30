"""Scheduled job: check node health and flag offline sensors."""

import logging
from datetime import UTC, datetime, timedelta

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.sensor_node import SensorNode
from app.services.notification_service import create_system_alert

logger = logging.getLogger("roofgarden.jobs.check_node_health")


def job_check_node_health():
    logger.info("Executing scheduled job: check_node_health")
    db = SessionLocal()
    try:
        nodes = db.query(SensorNode).all()
        now = datetime.now(UTC)
        # 3x send interval (default: 3 * 300s = 900s = 15m)
        offline_threshold_sec = (
            settings.NODE_OFFLINE_THRESHOLD_FACTOR * settings.DEFAULT_NODE_SEND_INTERVAL_S
        )
        cutoff = now - timedelta(seconds=offline_threshold_sec)

        for node in nodes:
            if (not node.last_seen_at or node.last_seen_at < cutoff) and node.status != "offline":
                node.status = "offline"
                create_system_alert(
                    db=db,
                    zone_id=node.zone_id,
                    level="warning",
                    alert_type="node_offline",
                    message=f"Sensor node '{node.id}' is offline: no telemetry received for over {int(offline_threshold_sec / 60)} minutes.",
                    requires_confirmation=False,
                )
        db.commit()
    except Exception as e:
        logger.error(f"Error checking node health: {e}")
    finally:
        db.close()
