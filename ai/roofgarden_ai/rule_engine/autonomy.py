"""Autonomy safety gate enforcing strict criteria for automated actuator commands."""

from roofgarden_ai.contracts import ProposedAction, ZoneContext

ALLOWED_AUTONOMOUS_CATEGORIES = {"leafy", "herbs"}


def evaluate_action_autonomy(
    ctx: ZoneContext,
    candidate_action: str,
    duration_seconds: int = 30,
) -> ProposedAction:
    """Evaluate candidate action through the strict deterministic autonomy safety gate.

    Auto-act ONLY IF all conditions are met:
    1. Category is low-risk: in {leafy, herbs}
    2. Action is 'water'
    3. No rain chance >= 50% in next 3h
    4. Last watering is older than min_interval_minutes (or never watered yet)
    5. Today's total watering is below daily cap
    6. Node data is fresh (< 2 * 300s old) and is_valid is True

    Otherwise, the action REQUIRES human confirmation.
    """
    reasons = []

    # Condition 1: Category
    if ctx.category_key not in ALLOWED_AUTONOMOUS_CATEGORIES:
        reasons.append(f"Category '{ctx.category_key}' requires human supervision for actuation")

    # Condition 2: Action type
    if candidate_action != "water":
        reasons.append(f"Action '{candidate_action}' cannot be triggered autonomously")

    # Condition 3: Rain probability forecast
    if ctx.rain_chance_next_3h >= 50.0:
        reasons.append(f"Forecast rain chance is high ({ctx.rain_chance_next_3h:.0f}% in next 3h)")

    # Condition 4: Cooldown interval
    if ctx.last_watered_minutes_ago is not None and ctx.last_watered_minutes_ago < ctx.min_interval_minutes:
        reasons.append(
            f"Cooldown active: last watered {ctx.last_watered_minutes_ago:.0f}m ago (minimum: {ctx.min_interval_minutes}m)"
        )

    # Condition 5: Daily cap
    projected_today = ctx.today_water_seconds + duration_seconds
    if projected_today > ctx.daily_water_cap_seconds:
        reasons.append(
            f"Daily watering cap reached: {ctx.today_water_seconds}s used (cap: {ctx.daily_water_cap_seconds}s)"
        )

    # Condition 6: Data freshness and validity
    max_reading_age_seconds = 600.0 # 2 intervals of 300s
    if not ctx.is_reading_valid:
        reasons.append("Sensor telemetry is flagged invalid")
    if ctx.reading_age_seconds > max_reading_age_seconds:
        reasons.append(f"Sensor telemetry is stale ({ctx.reading_age_seconds:.0f}s old)")

    # Decision outcome
    if not reasons and candidate_action == "water":
        return ProposedAction(
            action_type="water",
            duration_seconds=duration_seconds,
            requires_confirmation=False,
            auto_approved=True,
            reason="Automated watering approved: all botanical and meteorological conditions verified safe.",
        )

    # If any condition failed or candidate action is not water:
    requires_human = candidate_action in ["water", "shade", "add_light"]
    reason_str = " | ".join(reasons) if reasons else "No actuation required."

    return ProposedAction(
        action_type=candidate_action,  # type: ignore
        duration_seconds=duration_seconds if candidate_action == "water" else 0,
        requires_confirmation=requires_human,
        auto_approved=False,
        reason=reason_str,
    )
