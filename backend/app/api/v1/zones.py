"""Plant zones: status, readings, on-demand AI evaluation (scoped to the user's gardens)."""

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, get_zone_for_member
from app.models.base import ensure_utc
from app.models.recommendation import Recommendation
from app.models.user import User
from app.schemas.alerts import RecommendationOut
from app.schemas.zones import ZoneStatusResponse
from app.services.aggregation_service import get_zone_readings_history, get_zone_status
from app.services.ai_runner import run_evaluation_for_zone
from app.services.bmkg_client import BMKGClient

router = APIRouter()
bmkg = BMKGClient()
EVALUATE_COOLDOWN = timedelta(seconds=60)


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
    range: str = Query("24h", pattern="^(24h|7d)$", description="Time range: 24h or 7d"),
    agg: str = Query("raw", pattern="^(raw|hourly)$", description="Aggregation: raw or hourly"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_zone_for_member(db, id, current_user)
    return get_zone_readings_history(db, id, range, agg)


@router.post(
    "/{id}/evaluate",
    response_model=RecommendationOut,
    summary="Run AI evaluation for a zone (garden members)",
)
def evaluate_zone(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    zone = get_zone_for_member(db, id, current_user)

    last = (
        db.query(Recommendation)
        .filter(Recommendation.zone_id == zone.id)
        .order_by(desc(Recommendation.created_at))
        .first()
    )
    if last and datetime.now(UTC) - ensure_utc(last.created_at) < EVALUATE_COOLDOWN:
        raise HTTPException(status_code=429, detail="Zone was just evaluated, try again in a minute")

    try:
        rain_chance = float(
            bmkg.get_forecast_sync(db, zone.garden.adm4_code).get("rain_probability_pct", 20.0)
        )
    except Exception:
        rain_chance = 20.0

    run_evaluation_for_zone(db, zone, rain_chance=rain_chance)

    rec = (
        db.query(Recommendation)
        .filter(Recommendation.zone_id == zone.id)
        .order_by(desc(Recommendation.created_at))
        .first()
    )
    if not rec:
        raise HTTPException(status_code=422, detail="No threshold profile for this zone category")
    return RecommendationOut(
        id=rec.id,
        zone_id=rec.zone_id,
        status_level=rec.status_level,
        message=rec.message,
        reasons=rec.reasons if isinstance(rec.reasons, list) else [],
        created_at=rec.created_at,
    )