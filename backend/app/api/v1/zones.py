"""Plant zones health status and readings router."""

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, get_zone_for_member
from app.models.user import User
from app.schemas.zones import ZoneStatusResponse
from app.services.aggregation_service import get_zone_readings_history, get_zone_status
from app.services.ai_runner import run_evaluation_for_zone

router = APIRouter()


@router.get(
    "/{id}/status",
    response_model=ZoneStatusResponse,
    summary="Get real-time zone status vs botanical profile",
)
def get_status(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_zone_for_member(db, id, current_user)
    return get_zone_status(db, id)


@router.get(
    "/{id}/readings",
    response_model=list[dict[str, Any]],
    summary="Get historical readings for zone",
)
def get_readings(
    id: str,
    range: str = Query("24h", pattern="^(24h|7d|30d)$", description="Time range: 24h, 7d, or 30d"),
    agg: str = Query("raw", pattern="^(raw|hourly)$", description="Aggregation: raw or hourly"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_zone_for_member(db, id, current_user)
    return get_zone_readings_history(db, id, range, agg)


@router.post("/{id}/evaluate", summary="Run AI evaluation for a zone (garden members)")
def evaluate_zone(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    zone = get_zone_for_member(db, id, current_user)
    run_evaluation_for_zone(db, zone)
    return {"status": "completed", "zone_id": zone.id}
