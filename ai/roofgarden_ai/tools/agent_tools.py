"""Agent tools exposing sensor queries, weather forecasts, and guarded actuation."""

from typing import Any

from roofgarden_ai.contracts import ProposedAction, ZoneContext
from roofgarden_ai.rule_engine.autonomy import evaluate_action_autonomy


def get_sensor_data(zone_id: str) -> dict[str, Any]:
    """Retrieve the latest telemetry readings for a zone."""
    return {
        "zone_id": zone_id,
        "moisture_pct": 74.5,
        "temperature_c": 27.8,
        "humidity_pct": 68.0,
        "lux": 24000.0,
        "is_valid": True,
    }


def get_threshold_profile(category_key: str) -> dict[str, Any]:
    """Retrieve ideal botanical thresholds for a plant category."""
    from roofgarden_ai.rule_engine.thresholds import load_category_profile
    profile = load_category_profile(category_key)
    return profile.model_dump()


def get_weather_forecast(adm4_code: str) -> dict[str, Any]:
    """Fetch cached BMKG weather forecast for administrative code."""
    return {
        "adm4_code": adm4_code,
        "forecast": "Hujan Sedang (Moderate Rain)",
        "rain_probability_pct": 65.0,
        "temperature_c": 29.0,
    }


def get_weather_alert(adm4_code: str) -> dict[str, Any] | None:
    """Fetch current BMKG CAP severe weather nowcast warnings if active."""
    return None


def control_actuator(
    ctx: ZoneContext,
    action_type: str,
    duration_seconds: int = 30,
) -> ProposedAction:
    """Trigger an actuator command. CRITICAL: Strictly routed through autonomy safety gate."""
    return evaluate_action_autonomy(ctx, action_type, duration_seconds)


def send_notification(zone_id: str, message: str, level: str) -> dict[str, Any]:
    """Route notification to user dashboard or alert queue."""
    return {
        "status": "queued",
        "zone_id": zone_id,
        "level": level,
        "message": message,
    }
