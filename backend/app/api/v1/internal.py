"""Internal operational triggers for external crons."""


from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import verify_internal_token
from app.models.plant_zone import PlantZone
from app.services.ai_runner import run_evaluation_for_zone

router = APIRouter()


@router.post("/evaluate", summary="Trigger AI evaluation of zones (Protected by INTERNAL_TOKEN)")
def trigger_evaluation(
    zone_id: str | None = Query(None),
    _token_ok: None = Depends(verify_internal_token),
    db: Session = Depends(get_db),
):
    if zone_id:
        zones = db.query(PlantZone).filter(PlantZone.id == zone_id).all()
    else:
        zones = db.query(PlantZone).all()

    for z in zones:
        run_evaluation_for_zone(db, z)

    return {"status": "completed", "evaluated_zones": len(zones)}
