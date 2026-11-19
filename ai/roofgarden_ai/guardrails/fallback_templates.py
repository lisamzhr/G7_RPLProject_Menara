"""Deterministic fallback templates used whenever LLM generation or guardrails fail."""


from roofgarden_ai.contracts import Recommendation, ZoneContext
from roofgarden_ai.rule_engine.autonomy import RAIN_BLOCK_PCT, sensor_issues
from roofgarden_ai.rule_engine.status import ParameterReading


def generate_fallback_recommendation(
    ctx: ZoneContext,
    params: dict[str, ParameterReading],
    rule_level: str,
    action_type: str,
) -> Recommendation:
    """Generate safe, template-driven recommendation filled with real numbers."""
    reasons = []
    if action_type == "check_device":
        reasons.extend(sensor_issues(ctx))
    else:
        for p in params.values():
            if p.status == "out_of_range":
                reasons.append(f"{p.name} is {p.value}{p.unit} (outside ideal range {p.ideal_min}-{p.ideal_max}{p.unit})")
            elif p.status == "near_limit":
                reasons.append(f"{p.name} is {p.value}{p.unit} (approaching limit {p.ideal_min}-{p.ideal_max}{p.unit})")

        if not reasons:
            reasons.append("All physical parameters are within ideal botanical thresholds.")

    if ctx.rain_chance_next_3h >= 50.0:
        reasons.append(f"BMKG weather forecast indicates {ctx.rain_chance_next_3h:.0f}% chance of rain.")

    # Formulate message based on rule_level and action_type
    if action_type == "check_device":
        msg = (
            f"{rule_level.capitalize()}: sensor data for {ctx.thresholds.name} is invalid or outdated, "
            f"so the readings cannot be trusted. Please check the device."
        )
    elif (
        action_type == "wait"
        and ctx.current_moisture < ctx.thresholds.moisture_min
        and ctx.rain_chance_next_3h >= RAIN_BLOCK_PCT
    ):
        msg = (
            f"{rule_level.capitalize()}: soil moisture is low at {ctx.current_moisture:.1f}% "
            f"for {ctx.thresholds.name}, but rain is likely ({ctx.rain_chance_next_3h:.0f}% chance "
            f"in the next 3 hours). Wait and recheck after the rain."
        )
    elif rule_level == "warning":
        if action_type == "water":
            msg = (
                f"Warning: Soil moisture is critically low at {ctx.current_moisture:.1f}% "
                f"for {ctx.thresholds.name}. Watering is strongly recommended."
            )
        else:
            msg = (
                f"Warning: Environmental parameters are out of bounds for {ctx.thresholds.name}. "
                f"Temperature is {ctx.current_temp:.1f}°C and moisture is {ctx.current_moisture:.1f}%."
            )
    elif rule_level == "advisory":
        msg = (
            f"Advisory: {ctx.thresholds.name} zone is approaching boundary limits. "
            f"Current moisture is {ctx.current_moisture:.1f}% and temp is {ctx.current_temp:.1f}°C."
        )
    else:
        msg = (
            f"Normal: {ctx.thresholds.name} is thriving within optimal botanical ranges. "
            f"Moisture is {ctx.current_moisture:.1f}% and temp is {ctx.current_temp:.1f}°C."
        )

    return Recommendation(
        status_level=rule_level,  # type: ignore
        message=msg,
        reasons=reasons,
    )