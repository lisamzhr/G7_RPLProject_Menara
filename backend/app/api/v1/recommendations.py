"""Horticultural recommendations router."""


from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.recommendation import Recommendation
from app.models.user import User
from app.schemas.alerts import RecommendationOut

router = APIRouter()


@router.get("", response_model=list[RecommendationOut], summary="List AI recommendations")
def list_recommendations(
    zone_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Recommendation)
    if zone_id:
        query = query.filter(Recommendation.zone_id == zone_id)

    recs = query.order_by(desc(Recommendation.created_at)).all()
    return [
        RecommendationOut(
            id=r.id,
            zone_id=r.zone_id,
            status_level=r.status_level,
            message=r.message,
            reasons=r.reasons if isinstance(r.reasons, list) else [],
            created_at=r.created_at,
        )
        for r in recs
    ]
