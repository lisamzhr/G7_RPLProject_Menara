"""Autonomy safety gate enforcing strict criteria for automated actuator commands."""

from roofgarden_ai.contracts import ProposedAction, ZoneContext

ALLOWED_AUTONOMOUS_CATEGORIES = {"leafy", "herbs"}
RAIN_BLOCK_PCT = 50.0
MAX_READING_AGE_SECONDS = 600.0  # 2 interval x 300s


def sensor_issues(ctx: ZoneContext) -> list[str]:
    """Daftar masalah data sensor (kosong = data sehat). Dipakai orchestrator & gate."""
    issues = []
    if not ctx.is_reading_valid:
        issues.append("Sensor telemetry is flagged invalid")
    if ctx.reading_age_seconds > MAX_READING_AGE_SECONDS:
        issues.append(f"Sensor telemetry is stale ({ctx.reading_age_seconds:.0f}s old)")
    return issues


def evaluate_action_autonomy(
    ctx: ZoneContext,
    candidate_action: str,
    duration_seconds: int = 30,
) -> ProposedAction:
    """Auto-act ONLY IF: category in {leafy, herbs}, action is 'water', rain chance < 50%,
    no severe weather alert, cooldown passed, daily cap not exceeded, sensor data fresh and valid.
    Otherwise the action REQUIRES human confirmation."""

    # Tidak ada aktuasi -> tidak perlu dievaluasi
    if candidate_action == "wait":
        return ProposedAction(action_type="wait", reason="No actuation required.")

    # Masalah perangkat -> beri tahu user, bukan minta konfirmasi aktuasi
    if candidate_action == "check_device":
        return ProposedAction(
            action_type="check_device",
            reason=" | ".join(sensor_issues(ctx)) or "Device check requested.",
        )

    reasons = []

    if ctx.category_key not in ALLOWED_AUTONOMOUS_CATEGORIES:
        reasons.append(f"Category '{ctx.category_key}' requires human supervision for actuation")

    if candidate_action != "water":
        reasons.append(f"Action '{candidate_action}' cannot be triggered autonomously")

    if ctx.rain_chance_next_3h >= RAIN_BLOCK_PCT:
        reasons.append(f"Forecast rain chance is high ({ctx.rain_chance_next_3h:.0f}% in next 3h)")

    if ctx.has_severe_weather_alert:
        reasons.append("Severe weather alert active")

    if ctx.last_watered_minutes_ago is not None and ctx.last_watered_minutes_ago < ctx.min_interval_minutes:
        reasons.append(
            f"Cooldown active: last watered {ctx.last_watered_minutes_ago:.0f}m ago (minimum: {ctx.min_interval_minutes}m)"
        )

    if ctx.today_water_seconds + duration_seconds > ctx.daily_water_cap_seconds:
        reasons.append(
            f"Daily watering cap reached: {ctx.today_water_seconds}s used (cap: {ctx.daily_water_cap_seconds}s)"
        )

    reasons.extend(sensor_issues(ctx))

    if not reasons:  # candidate_action pasti "water" di sini
        return ProposedAction(
            action_type="water",
            duration_seconds=duration_seconds,
            requires_confirmation=False,
            auto_approved=True,
            reason="Automated watering approved: all botanical and meteorological conditions verified safe.",
        )

    return ProposedAction(
        action_type=candidate_action,  # type: ignore
        duration_seconds=duration_seconds if candidate_action == "water" else 0,
        requires_confirmation=True,
        auto_approved=False,
        reason=" | ".join(reasons),
    )