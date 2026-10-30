"""Bridge service between backend database and roofgarden_ai module."""

import logging
from datetime import UTC, datetime

from roofgarden_ai.contracts import CategoryThresholds, ZoneContext
from roofgarden_ai.llm.base import MockLLMClient
from roofgarden_ai.llm.groq_client import GroqClient
from roofgarden_ai.orchestrator import evaluate
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.alert import Alert
from app.models.control_action import ControlAction
from app.models.plant_zone import PlantZone
from app.models.recommendation import Recommendation
from app.models.sensor_reading import SensorReading
from app.models.threshold_profile import ThresholdProfile

logger = logging.getLogger("roofgarden.ai_runner")


def run_evaluation_for_zone(db: Session, zone: PlantZone, rain_chance: float = 20.0) -> None:
    """Build ZoneContext and execute roofgarden_ai evaluation."""
    profile = (
        db.query(ThresholdProfile).filter(ThresholdProfile.category_id == zone.category_id).first()
    )
    if not profile:
        return

    node_ids = [n.id for n in zone.sensor_nodes]
    latest = None
    recent_moistures = []
    if node_ids:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.node_id.in_(node_ids))
            .order_by(desc(SensorReading.ts))
            .first()
        )
        recent_rows = (
            db.query(SensorReading.soil_moisture_pct)
            .filter(SensorReading.node_id.in_(node_ids))
            .order_by(desc(SensorReading.ts))
            .limit(6)
            .all()
        )
        recent_moistures = [r[0] for r in reversed(recent_rows)]

    current_moisture = latest.soil_moisture_pct if latest else 70.0
    current_temp = latest.temperature_c if latest else 26.0
    current_humidity = latest.humidity_pct if latest else 70.0
    current_lux = latest.lux if latest else 20000.0
    is_valid = latest.is_valid if latest else True

    reading_age = 0.0
    if latest:
        reading_age = (datetime.now(UTC) - latest.ts).total_seconds()

    # Query actuator history for autonomy safety gate
    last_watered_min = None
    today_water_sec = 0
    min_interval = 120
    suggested_duration = 30

    actuator_ids = [a.id for a in zone.actuators] if zone.actuators else []
    if actuator_ids:
        act = zone.actuators[0]
        min_interval = act.min_interval_minutes
        suggested_duration = min(30, act.max_on_seconds)

        last_action = (
            db.query(ControlAction)
            .filter(ControlAction.actuator_id.in_(actuator_ids), ControlAction.command == "turn_on")
            .order_by(desc(ControlAction.requested_at))
            .first()
        )
        if last_action and last_action.requested_at:
            last_watered_min = (datetime.now(UTC) - last_action.requested_at).total_seconds() / 60.0

        today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        daily_sum = (
            db.query(func.sum(ControlAction.duration_seconds))
            .filter(
                ControlAction.actuator_id.in_(actuator_ids),
                ControlAction.command == "turn_on",
                ControlAction.requested_at >= today_start,
            )
            .scalar()
        )
        today_water_sec = int(daily_sum or 0)

    ctx = ZoneContext(
        zone_id=zone.id,
        zone_label=zone.label,
        category_key=zone.category.key,  # type: ignore
        thresholds=CategoryThresholds(
            category_key=zone.category.key,
            name=zone.category.name,
            response_timescale=zone.category.response_timescale,  # type: ignore
            moisture_min=profile.moisture_min,
            moisture_max=profile.moisture_max,
            temp_min=profile.temp_min,
            temp_max=profile.temp_max,
            humidity_min=profile.humidity_min,
            humidity_max=profile.humidity_max,
            lux_min=profile.lux_min,
            lux_max=profile.lux_max,
            source_note=profile.source_note,
        ),
        current_moisture=current_moisture,
        current_temp=current_temp,
        current_humidity=current_humidity,
        current_lux=current_lux,
        is_reading_valid=is_valid,
        reading_age_seconds=max(reading_age, 0.0),
        recent_moisture_history=recent_moistures,
        rain_chance_next_3h=rain_chance,
        last_watered_minutes_ago=last_watered_min,
        today_water_seconds=today_water_sec,
        min_interval_minutes=min_interval,
        suggested_water_seconds=suggested_duration,
    )

    if settings.GROQ_API_KEY:
        llm = GroqClient(api_key=settings.GROQ_API_KEY, model=settings.LLM_MODEL)
    else:
        llm = MockLLMClient()

    decision = evaluate(ctx, llm_client=llm)

    # Persist Recommendation
    rec = Recommendation(
        zone_id=zone.id,
        status_level=decision.overall_level,
        message=decision.recommendation.message,
        reasons=decision.recommendation.reasons,
    )
    db.add(rec)

    # If action requires confirmation, create alert
    if decision.action.requires_confirmation:
        alert = Alert(
            zone_id=zone.id,
            level=decision.overall_level,
            type=f"action_{decision.action.action_type}",
            message=f"Action '{decision.action.action_type}' requires confirmation: {decision.action.reason}",
            requires_confirmation=True,
        )
        db.add(alert)
    elif decision.action.auto_approved and zone.actuators:
        # Auto-approved: queue control action
        actuator = zone.actuators[0]
        cmd = ControlAction(
            actuator_id=actuator.id,
            command="turn_on",
            duration_seconds=decision.action.duration_seconds,
            source="auto",
            status="pending",
        )
        db.add(cmd)

    db.commit()
