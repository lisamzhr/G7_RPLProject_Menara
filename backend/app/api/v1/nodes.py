"""Sensor node polling and command confirmation router."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_api_key
from app.deps import verify_node_key
from app.models.sensor_node import SensorNode
from app.schemas.nodes import CommandAckRequest, CommandAckResponse, NodeCommandOut
from app.services.command_service import acknowledge_command, get_pending_commands_for_node

router = APIRouter()


@router.get(
    "/{id}/commands",
    response_model=list[NodeCommandOut],
    summary="Poll pending actuator commands for sensor node",
)
def get_node_commands(
    id: str,
    x_node_key: str = Depends(verify_node_key),
    db: Session = Depends(get_db),
):
    node = db.query(SensorNode).filter(SensorNode.id == id).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")
    if not verify_api_key(x_node_key, node.api_key_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    # Refresh node heartbeat upon polling
    node.last_seen_at = datetime.now(UTC)
    node.status = "active"
    db.commit()

    pending = get_pending_commands_for_node(db, id)
    return [
        NodeCommandOut(
            command_id=cmd.id,
            actuator_id=cmd.actuator_id,
            command=cmd.command,
            duration_seconds=cmd.duration_seconds,
            requested_at=cmd.requested_at,
        )
        for cmd in pending
    ]


@router.post(
    "/{id}/commands/{cid}/ack",
    response_model=CommandAckResponse,
    summary="Confirm execution of an actuator command",
)
def ack_node_command(
    id: str,
    cid: str,
    ack: CommandAckRequest,
    x_node_key: str = Depends(verify_node_key),
    db: Session = Depends(get_db),
):
    node = db.query(SensorNode).filter(SensorNode.id == id).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")
    if not verify_api_key(x_node_key, node.api_key_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    node.last_seen_at = datetime.now(UTC)
    node.status = "active"

    success = acknowledge_command(
        db=db,
        command_id=cid,
        status=ack.status,
        result=ack.result,
        executed_at=ack.executed_at,
        node_id=id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Command not found or does not belong to this node",
        )

    db.commit()
    return CommandAckResponse(status="acknowledged", command_id=cid)
