"""Alerts and human-in-the-loop feedback router."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.alert import Alert
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.alerts import AlertFeedbackRequest, AlertOut

router = APIRouter()


@router.get("", response_model=list[AlertOut], summary="List active or filtered alerts")
def list_alerts(
    zone_id: str | None = Query(None),
    status_filter: str = Query("active", pattern="^(active|resolved|all)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Alert)
    if zone_id:
        query = query.filter(Alert.zone_id == zone_id)
    if status_filter == "active":
        query = query.filter(Alert.resolved_at.is_(None))
    elif status_filter == "resolved":
        query = query.filter(Alert.resolved_at.is_not(None))

    return query.order_by(desc(Alert.created_at)).all()


@router.post("/{id}/confirm", summary="Human-in-the-loop confirmation of alert/action")
def confirm_alert(
    id: str,
    req: AlertFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.resolved_at = datetime.now(UTC)

    feedback = Feedback(
        user_id=current_user.id,
        target_type="alert",
        target_id=alert.id,
        decision="confirm",
        comment=req.comment or "Confirmed by user",
    )
    db.add(feedback)
    db.commit()

    return {"status": "confirmed", "alert_id": id}


@router.post("/{id}/override", summary="Human-in-the-loop override of alert/action")
def override_alert(
    id: str,
    req: AlertFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

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
