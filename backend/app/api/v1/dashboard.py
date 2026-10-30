"""Dashboard summary metrics router."""

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    zones = db.query(PlantZone).all()
    garden = db.query(Garden).first()

    zones_ok = 0
    zones_attention = 0

    for z in zones:
        st = get_zone_status(db, z.id)
        if st.overall_status == "normal":
            zones_ok += 1
        else:
            zones_attention += 1

    active_alerts = db.query(Alert).filter(Alert.resolved_at.is_(None)).count()

    # Weather info
    adm4 = garden.adm4_code if garden else "31.71.06.1001"
    loc_name = garden.location_name if garden else "Jakarta Pusat"
    forecast_data = await bmkg.get_forecast(db, adm4)

    # Top recommendations
    recs = db.query(Recommendation).order_by(desc(Recommendation.created_at)).limit(3).all()
    top_recs = []
    for r in recs:
        z = db.query(PlantZone).filter(PlantZone.id == r.zone_id).first()
        label = z.label if z else "Rooftop Zone"
        top_recs.append(
            TopRecommendation(
                zone_id=r.zone_id,
                zone_label=label,
                status_level=r.status_level,
                message=r.message,
            )
        )

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
        ),
        top_recommendations=top_recs,
    )
