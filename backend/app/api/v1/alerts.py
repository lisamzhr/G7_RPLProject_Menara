"""Alerts and human-in-the-loop feedback router (scoped to the user's gardens)."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, member_zone_ids
from app.models.alert import Alert
from app.models.control_action import ControlAction
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.alerts import AlertFeedbackRequest, AlertOut

router = APIRouter()


def _get_member_alert(db: Session, alert_id: str, user: User) -> Alert:
    alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id, Alert.zone_id.in_(member_zone_ids(user)))
        .first()
    )
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return alert


@router.get("", response_model=list[AlertOut], summary="List active or filtered alerts")
def list_alerts(
    zone_id: str | None = Query(None),
    status_filter: str | None = Query(None, pattern="^(active|resolved|all)$"),
    status: str | None = Query(None, pattern="^(active|resolved|all)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Alert).filter(Alert.zone_id.in_(member_zone_ids(current_user)))
    if zone_id:
        query = query.filter(Alert.zone_id == zone_id)
    
    effective_status = status or status_filter or "active"
    if effective_status == "active":
        query = query.filter(Alert.resolved_at.is_(None))
    elif effective_status == "resolved":
        query = query.filter(Alert.resolved_at.is_not(None))

    alerts = query.order_by(desc(Alert.created_at)).all()
    return [
        AlertOut(
            id=a.id,
            zone_id=a.zone_id,
            zone_label=a.zone.label if a.zone else None,
            level=a.level,
            type=a.type,
            message=a.message,
            requires_confirmation=a.requires_confirmation,
            resolved_at=a.resolved_at,
            created_at=a.created_at,
        )
        for a in alerts
    ]


@router.post("/{id}/confirm", summary="Human-in-the-loop confirmation of alert/action")
def confirm_alert(
    id: str,
    req: AlertFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = _get_member_alert(db, id, current_user)

    alert.resolved_at = datetime.now(UTC)

    feedback = Feedback(
        user_id=current_user.id,
        target_type="alert",
        target_id=alert.id,
        decision="confirm",
        comment=req.comment or "Confirmed by user",
    )
    db.add(feedback)

    # If this alert was for an action that required confirmation, queue the control action
    if alert.requires_confirmation and alert.type.startswith("action_"):
        action_name = alert.type.replace("action_", "")
        if action_name == "water" and alert.zone and alert.zone.actuators:
            actuator = alert.zone.actuators[0]
            cmd = ControlAction(
                actuator_id=actuator.id,
                command="turn_on",
                duration_seconds=30,
                source="human_confirmed",
                status="pending",
            )
            db.add(cmd)

    db.commit()

    return {"status": "confirmed", "alert_id": id}


@router.post("/{id}/override", summary="Human-in-the-loop override of alert/action")
def override_alert(
    id: str,
    req: AlertFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = _get_member_alert(db, id, current_user)

    alert.resolved_at = datetime.now(UTC)

    feedback = Feedback(
        user_id=current_user.id,
        target_type="alert",
        target_id=alert.id,
        decision="override",
        comment=req.comment or "Overridden by user",
    )
    db.add(feedback)
    db.commit()

    return {"status": "overridden", "alert_id": id}