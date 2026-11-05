"""Actuator command dispatch and management service."""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.base import ensure_utc
from app.models.control_action import ControlAction
from app.models.sensor_node import SensorNode


def get_pending_commands_for_node(db: Session, node_id: str) -> list[ControlAction]:
    """Retrieve pending actuator commands associated with the node's plant zone in FIFO order."""
    node = db.query(SensorNode).filter(SensorNode.id == node_id).first()
    if not node:
        return []

    actuator_ids = [a.id for a in node.zone.actuators]
    if not actuator_ids:
        return []

    return (
        db.query(ControlAction)
        .filter(ControlAction.actuator_id.in_(actuator_ids), ControlAction.status == "pending")
        .order_by(ControlAction.requested_at.asc())
        .all()
    )


def acknowledge_command(
    db: Session,
    command_id: str,
    status: str,
    result: str | None = None,
    executed_at: datetime | None = None,
    node_id: str | None = None,
) -> bool:
    """Update command execution result from node confirmation."""
    action = db.query(ControlAction).filter(ControlAction.id == command_id).first()
    if not action:
        return False

    # Verify that the command actuator belongs to the node's zone
    if node_id:
        node = db.query(SensorNode).filter(SensorNode.id == node_id).first()
        if not node or not action.actuator or action.actuator.zone_id != node.zone_id:
            return False

    action.status = status
    if executed_at:
        action.executed_at = ensure_utc(executed_at)
    else:
        action.executed_at = datetime.now(UTC)

    if result:
        action.result = result

    db.commit()
    return True
