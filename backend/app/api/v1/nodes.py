"""Sensor node polling, command confirmation, and dynamic MAC registration router."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_api_key
from app.deps import get_current_user, get_zone_for_member, member_zone_ids
from app.models.base import ensure_utc
from app.models.sensor_node import SensorNode
from app.models.user import User
from app.schemas.nodes import (
    CommandAckRequest,
    CommandAckResponse,
    NodeCommandOut,
    SensorNodeOut,
    SensorNodeRegister,
    SensorNodeUpdate,
    normalize_mac,
)
from app.services.command_service import acknowledge_command, get_pending_commands_for_node

router = APIRouter()


@router.get("", response_model=list[SensorNodeOut], summary="List all sensor nodes in user's gardens")
def list_nodes(
    zone_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(SensorNode).filter(SensorNode.zone_id.in_(member_zone_ids(current_user)))
    if zone_id:
        query = query.filter(SensorNode.zone_id == zone_id)
    nodes = query.all()
    return [
        SensorNodeOut(
            id=n.id,
            mac_address=n.mac_address,
            name=n.name,
            zone_id=n.zone_id,
            zone_label=n.zone.label if n.zone else None,
            last_seen_at=ensure_utc(n.last_seen_at),
            status=n.status,
            created_at=ensure_utc(n.created_at),
        )
        for n in nodes
    ]


@router.get("/{id}", response_model=SensorNodeOut, summary="Get details for a specific sensor node")
def get_node(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    node = (
        db.query(SensorNode)
        .filter(
            (SensorNode.id == id) | (SensorNode.mac_address == id.upper()),
            SensorNode.zone_id.in_(member_zone_ids(current_user)),
        )
        .first()
    )
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sensor node not found")
    return SensorNodeOut(
        id=node.id,
        mac_address=node.mac_address,
        name=node.name,
        zone_id=node.zone_id,
        zone_label=node.zone.label if node.zone else None,
        last_seen_at=ensure_utc(node.last_seen_at),
        status=node.status,
        created_at=ensure_utc(node.created_at),
    )


@router.patch("/{id}", response_model=SensorNodeOut, summary="Update sensor node name or plant zone")
def update_node(
    id: str,
    node_update: SensorNodeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    node = (
        db.query(SensorNode)
        .filter(
            (SensorNode.id == id) | (SensorNode.mac_address == id.upper()),
            SensorNode.zone_id.in_(member_zone_ids(current_user)),
        )
        .first()
    )
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sensor node not found")

    if node_update.name is not None:
        node.name = node_update.name.strip() or None
    if node_update.zone_id is not None:
        new_zone = get_zone_for_member(db, node_update.zone_id, current_user)
        node.zone_id = new_zone.id

    db.commit()
    db.refresh(node)
    return SensorNodeOut(
        id=node.id,
        mac_address=node.mac_address,
        name=node.name,
        zone_id=node.zone_id,
        zone_label=node.zone.label if node.zone else None,
        last_seen_at=ensure_utc(node.last_seen_at),
        status=node.status,
        created_at=ensure_utc(node.created_at),
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete / unregister a sensor node")
def delete_node(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    node = (
        db.query(SensorNode)
        .filter(
            (SensorNode.id == id) | (SensorNode.mac_address == id.upper()),
            SensorNode.zone_id.in_(member_zone_ids(current_user)),
        )
        .first()
    )
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sensor node not found")

    db.delete(node)
    db.commit()
    return None


@router.get(
    "/{id}/commands",
    response_model=list[NodeCommandOut],
    summary="Poll pending actuator commands for sensor node (authenticated via X-Node-MAC or X-Node-Key)",
)
def get_node_commands(
    id: str,
    x_node_mac: str | None = Header(None, alias="X-Node-MAC"),
    x_node_key: str | None = Header(None, alias="X-Node-Key"),
    db: Session = Depends(get_db),
):
    node = (
        db.query(SensorNode)
        .filter((SensorNode.id == id) | (SensorNode.mac_address == id.upper()))
        .first()
    )
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    # Authenticate via MAC address or API key
    if x_node_mac:
        try:
            clean_mac = normalize_mac(x_node_mac)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid MAC header format")
        if clean_mac != node.mac_address:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MAC credentials")
    elif x_node_key:
        if not node.api_key_hash or not verify_api_key(x_node_key, node.api_key_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-Node-MAC or X-Node-Key header")

    # Refresh node heartbeat upon polling
    node.last_seen_at = datetime.now(UTC)
    node.status = "active"
    db.commit()

    pending = get_pending_commands_for_node(db, node.id)
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
    summary="Confirm execution of an actuator command (authenticated via X-Node-MAC or X-Node-Key)",
)
def ack_node_command(
    id: str,
    cid: str,
    ack: CommandAckRequest,
    x_node_mac: str | None = Header(None, alias="X-Node-MAC"),
    x_node_key: str | None = Header(None, alias="X-Node-Key"),
    db: Session = Depends(get_db),
):
    node = (
        db.query(SensorNode)
        .filter((SensorNode.id == id) | (SensorNode.mac_address == id.upper()))
        .first()
    )
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    if x_node_mac:
        try:
            clean_mac = normalize_mac(x_node_mac)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid MAC header format")
        if clean_mac != node.mac_address:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MAC credentials")
    elif x_node_key:
        if not node.api_key_hash or not verify_api_key(x_node_key, node.api_key_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-Node-MAC or X-Node-Key header")

    node.last_seen_at = datetime.now(UTC)
    node.status = "active"

    success = acknowledge_command(
        db=db,
        command_id=cid,
        status=ack.status,
        result=ack.result,
        executed_at=ack.executed_at,
        node_id=node.id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Command not found or does not belong to this node",
        )

    db.commit()
    return CommandAckResponse(status="acknowledged", command_id=cid)
