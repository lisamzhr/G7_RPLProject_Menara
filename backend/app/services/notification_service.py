"""Notification dispatch service."""

import logging

from sqlalchemy.orm import Session

from app.models.alert import Alert

logger = logging.getLogger("roofgarden.notifications")


def create_system_alert(
    db: Session,
    zone_id: str,
    level: str,
    alert_type: str,
    message: str,
    requires_confirmation: bool = False,
) -> Alert:
    """Create and persist an operational alert."""
    alert = Alert(
        zone_id=zone_id,
        level=level,
        type=alert_type,
        message=message,
        requires_confirmation=requires_confirmation,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    logger.info(f"Created system alert [{level}] for zone {zone_id}: {message}")
    return alert
