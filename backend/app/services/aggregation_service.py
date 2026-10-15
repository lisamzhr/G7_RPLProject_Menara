"""Aggregation and zone health evaluation service."""

from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.plant_zone import PlantZone
from app.models.recommendation import Recommendation
from app.models.sensor_reading import SensorReading
from app.models.threshold_profile import ThresholdProfile
from app.schemas.zones import (
    LatestReadingSummary,
    ParameterMetric,
    RecommendationSummary,
    ZoneStatusResponse,
)


def classify_metric(val: float, ideal_min: float, ideal_max: float) -> str:
    """Classify live sensor metric as ok, low, or high."""
    if val < ideal_min:
        return "low"
    elif val > ideal_max:
        return "high"
    return "ok"


def get_zone_status(db: Session, zone_id: str) -> ZoneStatusResponse:
    """Compute real-time botanical health status for a plant zone."""
    zone = db.query(PlantZone).filter(PlantZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plant zone '{zone_id}' not found",
        )

    profile = (
        db.query(ThresholdProfile).filter(ThresholdProfile.category_id == zone.category_id).first()
    )
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Threshold profile missing for zone category",
        )

    # Get nodes belonging to this zone
    node_ids = [n.id for n in zone.sensor_nodes]

    # Query latest reading
    latest_reading = None
    if node_ids:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.node_id.in_(node_ids))
            .order_by(desc(SensorReading.ts))
            .first()
        )
        if latest:
            latest_reading = LatestReadingSummary(
                ts=latest.ts,
                soil_moisture_pct=latest.soil_moisture_pct,
                temperature_c=latest.temperature_c,
                humidity_pct=latest.humidity_pct,
                lux=latest.lux,
                is_valid=latest.is_valid,
            )

    # Parameter evaluations
    param_map: dict[str, ParameterMetric] = {}
    overall_status = "normal"

    if latest_reading:
        m_stat = classify_metric(
            latest_reading.soil_moisture_pct, profile.moisture_min, profile.moisture_max
        )
        t_stat = classify_metric(latest_reading.temperature_c, profile.temp_min, profile.temp_max)
        h_stat = classify_metric(
            latest_reading.humidity_pct, profile.humidity_min, profile.humidity_max
        )
        l_stat = classify_metric(latest_reading.lux, profile.lux_min, profile.lux_max)

        param_map = {
            "moisture": ParameterMetric(
                value=round(latest_reading.soil_moisture_pct, 1),
                status=m_stat,
                ideal_min=profile.moisture_min,
                ideal_max=profile.moisture_max,
                unit="%",
            ),
            "temperature": ParameterMetric(
                value=round(latest_reading.temperature_c, 1),
                status=t_stat,
                ideal_min=profile.temp_min,
                ideal_max=profile.temp_max,
                unit="°C",
            ),
            "humidity": ParameterMetric(
                value=round(latest_reading.humidity_pct, 1),
                status=h_stat,
                ideal_min=profile.humidity_min,
                ideal_max=profile.humidity_max,
                unit="%",
            ),
            "lux": ParameterMetric(
                value=round(latest_reading.lux, 0),
                status=l_stat,
                ideal_min=profile.lux_min,
                ideal_max=profile.lux_max,
                unit="lx",
            ),
        }

        # If moisture is out of bounds or data is invalid -> warning; if other parameters out -> advisory
        if not latest_reading.is_valid or m_stat != "ok":
            overall_status = "warning"
        elif any(s != "ok" for s in [t_stat, h_stat, l_stat]):
            overall_status = "advisory"
    else:
        # Defaults if no reading exists yet
        param_map = {
            "moisture": ParameterMetric(
                value=0.0,
                status="low",
                ideal_min=profile.moisture_min,
                ideal_max=profile.moisture_max,
                unit="%",
            ),
            "temperature": ParameterMetric(
                value=0.0,
                status="low",
                ideal_min=profile.temp_min,
                ideal_max=profile.temp_max,
                unit="°C",
            ),
            "humidity": ParameterMetric(
                value=0.0,
                status="low",
                ideal_min=profile.humidity_min,
                ideal_max=profile.humidity_max,
                unit="%",
            ),
            "lux": ParameterMetric(
                value=0.0,
                status="low",
                ideal_min=profile.lux_min,
                ideal_max=profile.lux_max,
                unit="lx",
            ),
        }
        overall_status = "advisory"

    # Query latest recommendation
    latest_rec_model = (
        db.query(Recommendation)
        .filter(Recommendation.zone_id == zone_id)
        .order_by(desc(Recommendation.created_at))
        .first()
    )
    latest_rec = None
    if latest_rec_model:
        latest_rec = RecommendationSummary(
            id=latest_rec_model.id,
            status_level=latest_rec_model.status_level,
            message=latest_rec_model.message,
            reasons=latest_rec_model.reasons if isinstance(latest_rec_model.reasons, list) else [],
            created_at=latest_rec_model.created_at,
        )

    return ZoneStatusResponse(
        zone_id=zone.id,
        zone_label=zone.label,
        category_key=zone.category.key,
        overall_status=overall_status,
        latest_reading=latest_reading,
        parameter_status=param_map,
        latest_recommendation=latest_rec,
    )


def get_zone_readings_history(
    db: Session,
    zone_id: str,
    range_str: str = "24h",
    agg_str: str = "raw",
) -> list[dict]:
    """Retrieve historical sensor readings for charting."""
    zone = db.query(PlantZone).filter(PlantZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plant zone '{zone_id}' not found",
        )

    node_ids = [n.id for n in zone.sensor_nodes]
    if not node_ids:
        return []

    delta = timedelta(hours=24) if range_str == "24h" else timedelta(days=7)
    since = datetime.now(UTC) - delta

    query = (
        db.query(SensorReading)
        .filter(SensorReading.node_id.in_(node_ids), SensorReading.ts >= since)
        .order_by(SensorReading.ts.asc())
    )
    rows = query.all()

    if agg_str == "hourly":
        buckets: dict[str, list[SensorReading]] = {}
        for r in rows:
            bucket_key = r.ts.strftime("%Y-%m-%dT%H:00:00Z")
            buckets.setdefault(bucket_key, []).append(r)

        result = []
        for b_ts, b_rows in buckets.items():
            valid_rows = [x for x in b_rows if x.is_valid] or b_rows
            avg_m = sum(x.soil_moisture_pct for x in valid_rows) / len(valid_rows)
            avg_t = sum(x.temperature_c for x in valid_rows) / len(valid_rows)
            avg_h = sum(x.humidity_pct for x in valid_rows) / len(valid_rows)
            avg_l = sum(x.lux for x in valid_rows) / len(valid_rows)
            result.append(
                {
                    "ts": b_ts,
                    "soil_moisture_pct": round(avg_m, 1),
                    "temperature_c": round(avg_t, 1),
                    "humidity_pct": round(avg_h, 1),
                    "lux": round(avg_l, 0),
                    "is_valid": all(x.is_valid for x in b_rows),
                }
            )
        return result

    return [
        {
            "ts": r.ts.isoformat(),
            "soil_moisture_pct": r.soil_moisture_pct,
            "temperature_c": r.temperature_c,
            "humidity_pct": r.humidity_pct,
            "lux": r.lux,
            "is_valid": r.is_valid,
        }
        for r in rows
    ]
