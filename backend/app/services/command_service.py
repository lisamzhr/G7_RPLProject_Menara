"""Actuator command dispatch and management service."""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.control_action import ControlAction
from app.models.sensor_node import SensorNode


def get_pending_commands_for_node(db: Session, node_id: str) -> list[ControlAction]:
    """Retrieve pending actuator commands associated with the node's plant zone."""
    node = db.query(SensorNode).filter(SensorNode.id == node_id).first()
    if not node:
        return []

    actuator_ids = [a.id for a in node.zone.actuators]
    if not actuator_ids:
        return []

    return (
        db.query(ControlAction)
        .filter(ControlAction.actuator_id.in_(actuator_ids), ControlAction.status == "pending")
        .all()
    )


def acknowledge_command(
    db: Session,
    command_id: str,
    status: str,
    result: str | None = None,
) -> bool:
    """Update command execution result from node confirmation."""
    action = db.query(ControlAction).filter(ControlAction.id == command_id).first()
    if not action:
        return False

    action.status = status
    action.executed_at = datetime.now(UTC)
    if result:
        action.result = result

    db.commit()
    return True
