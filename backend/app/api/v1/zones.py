"""Plant zones: status, readings, on-demand AI evaluation (scoped to the user's gardens)."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, get_zone_for_member
from app.models.base import ensure_utc
from app.models.recommendation import Recommendation
from app.models.sensor_node import SensorNode
from app.models.user import User
from app.schemas.alerts import RecommendationOut
from app.schemas.nodes import SensorNodeOut, SensorNodeRegister
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
    range: str = Query("24h", pattern="^(24h|7d|30d)$", description="Time range: 24h, 7d, or 30d"),
    agg: str = Query("raw", pattern="^(raw|hourly)$", description="Aggregation: raw or hourly"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_zone_for_member(db, id, current_user)
    return get_zone_readings_history(db, id, range, agg)


@router.post(
    "/{id}/nodes",
    response_model=SensorNodeOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register an ESP32 sensor node to this plant zone via hardwired MAC address",
)
def register_node_for_zone(
    id: str,
    node_in: SensorNodeRegister,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    zone = get_zone_for_member(db, id, current_user)

    existing = db.query(SensorNode).filter(SensorNode.mac_address == node_in.mac_address).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A sensor node with MAC address '{node_in.mac_address}' is already registered",
        )

    node_id = f"esp32-{node_in.mac_address.replace(':', '').lower()}"
    if db.query(SensorNode).filter(SensorNode.id == node_id).first():
        node_id = f"{node_id}-{uuid.uuid4().hex[:6]}"

    new_node = SensorNode(
        id=node_id,
        mac_address=node_in.mac_address,
        name=node_in.name or f"Sensor Node ({node_in.mac_address[-8:]})",
        zone_id=zone.id,
        status="active",
    )
    db.add(new_node)
    db.commit()
    db.refresh(new_node)
    return SensorNodeOut(
        id=new_node.id,
        mac_address=new_node.mac_address,
        name=new_node.name,
        zone_id=new_node.zone_id,
        zone_label=zone.label,
        last_seen_at=ensure_utc(new_node.last_seen_at),
        status=new_node.status,
        created_at=ensure_utc(new_node.created_at),
    )


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a plant zone (garden members)",
)
def delete_zone(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    zone = get_zone_for_member(db, id, current_user)
    db.delete(zone)
    db.commit()


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
