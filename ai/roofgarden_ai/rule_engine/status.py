"""Botanical parameter status and zone health evaluation."""

from typing import Literal

from roofgarden_ai.contracts import ParameterReading, ZoneContext


def classify_parameter(
    val: float,
    ideal_min: float,
    ideal_max: float,
    tolerance_pct: float = 0.10,
) -> Literal["ok", "near_limit", "out_of_range"]:
    """Classify a numerical metric against botanical ideal bounds."""
    if val < ideal_min or val > ideal_max:
        return "out_of_range"

    span = max(ideal_max - ideal_min, 1.0)
    buffer_margin = span * tolerance_pct

    if (val - ideal_min) <= buffer_margin or (ideal_max - val) <= buffer_margin:
        return "near_limit"

    return "ok"


def evaluate_parameters(ctx: ZoneContext) -> dict[str, ParameterReading]:
    """Evaluate all 4 physical parameters against zone category thresholds."""
    t = ctx.thresholds
    return {
        "moisture": ParameterReading(
            name="Soil Moisture",
            value=round(ctx.current_moisture, 1),
            unit="%",
            ideal_min=t.moisture_min,
            ideal_max=t.moisture_max,
            status=classify_parameter(ctx.current_moisture, t.moisture_min, t.moisture_max),
        ),
        "temperature": ParameterReading(
            name="Temperature",
            value=round(ctx.current_temp, 1),
            unit="°C",
            ideal_min=t.temp_min,
            ideal_max=t.temp_max,
            status=classify_parameter(ctx.current_temp, t.temp_min, t.temp_max),
        ),
        "humidity": ParameterReading(
            name="Humidity",
            value=round(ctx.current_humidity, 1),
            unit="%",
            ideal_min=t.humidity_min,
            ideal_max=t.humidity_max,
            status=classify_parameter(ctx.current_humidity, t.humidity_min, t.humidity_max),
        ),
        "lux": ParameterReading(
            name="Solar Illuminance",
            value=round(ctx.current_lux, 0),
            unit="lx",
            ideal_min=t.lux_min,
            ideal_max=t.lux_max,
            status=classify_parameter(ctx.current_lux, t.lux_min, t.lux_max),
        ),
    }


def determine_zone_level(
    parameters: dict[str, ParameterReading],
    ctx: ZoneContext,
) -> Literal["normal", "advisory", "warning"]:
    """Determine composite zone status level."""
    # Data anomaly or severe weather forces warning/advisory
    if not ctx.is_reading_valid:
        return "warning"
    if ctx.has_severe_weather_alert:
        return "warning"

    statuses = [p.status for p in parameters.values()]

    if "out_of_range" in statuses:
        return "warning"
    if "near_limit" in statuses:
        return "advisory"

    return "normal"
