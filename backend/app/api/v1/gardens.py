"""Gardens router."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.garden import Garden
from app.models.plant_zone import PlantZone
from app.models.user import User
from app.schemas.gardens import GardenOut
from app.schemas.zones import CategoryOut, ZoneOut

router = APIRouter()


@router.get("", response_model=list[GardenOut], summary="List all rooftop gardens")
def list_gardens(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    gardens = db.query(Garden).all()
    return gardens


@router.get("/{id}/zones", response_model=list[ZoneOut], summary="List plant zones in garden")
def list_garden_zones(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    garden = db.query(Garden).filter(Garden.id == id).first()
    if not garden:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Garden not found")

    zones = db.query(PlantZone).filter(PlantZone.garden_id == id).all()
    result = []
    for z in zones:
        result.append(
            ZoneOut(
                id=z.id,
                garden_id=z.garden_id,
                category=CategoryOut(
                    id=z.category.id,
                    key=z.category.key,
                    name=z.category.name,
                    response_timescale=z.category.response_timescale,
                ),
                label=z.label,
                plant_names=z.plant_names if isinstance(z.plant_names, list) else [],
                created_at=z.created_at,
            )
        )
    return result
