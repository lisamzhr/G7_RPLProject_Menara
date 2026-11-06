"""Dashboard summary metrics router (scoped to the user's gardens)."""

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, get_garden_for_member, member_garden_ids
from app.models.alert import Alert
from app.models.garden import Garden
from app.models.plant_zone import PlantZone
from app.models.recommendation import Recommendation
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse, TopRecommendation, WeatherSummary
from app.services.aggregation_service import get_zone_status
from app.services.bmkg_client import BMKGClient

router = APIRouter()
bmkg = BMKGClient()


@router.get(
    "/summary", response_model=DashboardSummaryResponse, summary="Get daily overview summary"
)
async def get_dashboard_summary(
    garden_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Which gardens does this dashboard cover?
    if garden_id:
        garden = get_garden_for_member(db, garden_id, current_user)  # 404 if not a member
        gardens = [garden]
    else:
        gardens = (
            db.query(Garden)
            .filter(Garden.id.in_(member_garden_ids(current_user)))
            .order_by(Garden.name)
            .all()
        )
        garden = gardens[0] if gardens else None

    garden_ids = [g.id for g in gardens]
    zones = (
        db.query(PlantZone).filter(PlantZone.garden_id.in_(garden_ids)).all()
        if garden_ids
        else []
    )
    zone_ids = [z.id for z in zones]
    zone_labels = {z.id: z.label for z in zones}

    zones_ok = 0
    zones_attention = 0
    for z in zones:
        st = get_zone_status(db, z.id)
        if st.overall_status == "normal":
            zones_ok += 1
        else:
            zones_attention += 1

    active_alerts = (
        db.query(Alert)
        .filter(Alert.resolved_at.is_(None), Alert.zone_id.in_(zone_ids))
        .count()
        if zone_ids
        else 0
    )

    # Weather info
    adm4 = garden.adm4_code if garden else "31.71.06.1001"
    forecast_data = await bmkg.get_forecast(db, adm4)
    loc_name = (
        garden.location_name
        if (garden and garden.location_name)
        else forecast_data.get("location", "Jakarta Pusat")
    )

    # Top recommendations
    recs = (
        db.query(Recommendation)
        .filter(Recommendation.zone_id.in_(zone_ids))
        .order_by(desc(Recommendation.created_at))
        .limit(3)
        .all()
        if zone_ids
        else []
    )
    top_recs = [
        TopRecommendation(
            zone_id=r.zone_id,
            zone_label=zone_labels.get(r.zone_id, "Rooftop Zone"),
            status_level=r.status_level,
            message=r.message,
        )
        for r in recs
    ]

    return DashboardSummaryResponse(
        total_zones=len(zones),
        zones_ok=zones_ok,
        zones_need_attention=zones_attention,
        active_alerts_count=active_alerts,
        weather_summary=WeatherSummary(
            location=loc_name,
            forecast=forecast_data.get("forecast", "Cerah Berawan"),
            temp_c=forecast_data.get("temp_c", 30.0),
            rain_probability_pct=forecast_data.get("rain_probability_pct", 30.0),
            attribution=forecast_data.get("attribution", "BMKG"),
            humidity_pct=forecast_data.get("humidity_pct"),
            wind_speed_kmh=forecast_data.get("wind_speed_kmh"),
            icon_url=forecast_data.get("icon_url"),
            local_datetime=forecast_data.get("local_datetime"),
        ),
        top_recommendations=top_recs,
    )