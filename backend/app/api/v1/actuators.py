"""Actuators router."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, member_zone_ids
from app.models.actuator import Actuator
from app.models.base import ensure_utc
from app.models.control_action import ControlAction
from app.models.user import User
from app.schemas.alerts import ActuatorCommandRequest, ActuatorLastActionOut, ActuatorOut

router = APIRouter()


@router.get("", response_model=list[ActuatorOut], summary="List all actuators")
def list_actuators(
    zone_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Actuator).filter(Actuator.zone_id.in_(member_zone_ids(current_user)))
    if zone_id:
        query = query.filter(Actuator.zone_id == zone_id)
    actuators = query.all()

    result = []
    for act in actuators:
        last_action = (
            db.query(ControlAction)
            .filter(ControlAction.actuator_id == act.id)
            .order_by(desc(ControlAction.requested_at))
            .first()
        )
        last_action_out = None
        if last_action:
            last_action_out = ActuatorLastActionOut(
                command=last_action.command,
                source=last_action.source,
                status=last_action.status,
                executed_at=ensure_utc(last_action.executed_at),
            )
        result.append(
            ActuatorOut(
                id=act.id,
                zone_id=act.zone_id,
                type=act.type,
                driver=act.driver,
                max_on_seconds=act.max_on_seconds,
                min_interval_minutes=act.min_interval_minutes,
                last_action=last_action_out,
            )
        )
    return result


@router.post("/{id}/command", summary="Queue manual actuator command")
def command_actuator(
    id: str,
    req: ActuatorCommandRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    actuator = (
        db.query(Actuator)
        .filter(Actuator.id == id, Actuator.zone_id.in_(member_zone_ids(current_user)))
        .first()
    )
    if not actuator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Actuator not found")

    # Safety constraint: duration capped by max_on_seconds
    duration = min(req.duration_seconds, actuator.max_on_seconds)

    # Check cooldown interval if turning on
    if req.command == "turn_on":
        last_action = (
            db.query(ControlAction)
            .filter(ControlAction.actuator_id == id, ControlAction.command == "turn_on")
            .order_by(desc(ControlAction.requested_at))
            .first()
        )
        if last_action:
            min_cooldown = timedelta(minutes=actuator.min_interval_minutes)
            last_req = ensure_utc(last_action.requested_at)
            if last_req and (datetime.now(UTC) - last_req < min_cooldown):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Actuator cooldown active. Minimum interval is {actuator.min_interval_minutes} minutes.",
                )

    cmd = ControlAction(
        actuator_id=id,
        command=req.command,
        duration_seconds=duration,
        source="user",
        status="pending",
    )
    db.add(cmd)
    db.commit()
    db.refresh(cmd)

    return {
        "status": "pending",
        "command_id": cmd.id,
        "message": f"Command '{req.command}' queued for node polling",
    }
