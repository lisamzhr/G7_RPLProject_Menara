"""Tests for autonomy safety gate ensuring each condition flipping blocks auto-action."""

import pytest

from roofgarden_ai.contracts import ZoneContext
from roofgarden_ai.rule_engine.autonomy import evaluate_action_autonomy
from roofgarden_ai.rule_engine.thresholds import load_category_profile


@pytest.fixture
def base_context():
    profile = load_category_profile("leafy")
    return ZoneContext(
        zone_id="zone-1",
        zone_label="Zone 1",
        category_key="leafy",
        thresholds=profile,
        current_moisture=70.0,
        current_temp=26.0,
        current_humidity=70.0,
        current_lux=15000.0,
        is_reading_valid=True,
        reading_age_seconds=60.0, # Fresh
        rain_chance_next_3h=20.0, # Low rain
        last_watered_minutes_ago=180.0, # Past 120m cooldown
        today_water_seconds=60, # Under 300s cap
        min_interval_minutes=120,
        daily_water_cap_seconds=300,
    )


def test_autonomy_approves_when_all_conditions_met(base_context):
    action = evaluate_action_autonomy(base_context, "water", 30)
    assert action.auto_approved is True
    assert action.requires_confirmation is False


def test_autonomy_blocks_unauthorized_category(base_context):
    potted_profile = load_category_profile("fruit_potted")
    ctx = base_context.model_copy(update={"category_key": "fruit_potted", "thresholds": potted_profile})
    action = evaluate_action_autonomy(ctx, "water", 30)
    assert action.auto_approved is False
    assert action.requires_confirmation is True


def test_autonomy_blocks_non_water_action(base_context):
    action = evaluate_action_autonomy(base_context, "shade", 30)
    assert action.auto_approved is False
    assert action.requires_confirmation is True


def test_autonomy_blocks_high_rain_chance(base_context):
    ctx = base_context.model_copy(update={"rain_chance_next_3h": 65.0})
    action = evaluate_action_autonomy(ctx, "water", 30)
    assert action.auto_approved is False
    assert action.requires_confirmation is True


def test_autonomy_blocks_active_cooldown(base_context):
    ctx = base_context.model_copy(update={"last_watered_minutes_ago": 45.0}) # Under 120m!
    action = evaluate_action_autonomy(ctx, "water", 30)
    assert action.auto_approved is False
    assert action.requires_confirmation is True


def test_autonomy_blocks_daily_cap_exceeded(base_context):
    ctx = base_context.model_copy(update={"today_water_seconds": 290, "daily_water_cap_seconds": 300})
    # Adding 30s would reach 320s > 300s
    action = evaluate_action_autonomy(ctx, "water", 30)
    assert action.auto_approved is False
    assert action.requires_confirmation is True


def test_autonomy_blocks_stale_reading(base_context):
    ctx = base_context.model_copy(update={"reading_age_seconds": 900.0}) # 15 minutes old > 600s
    action = evaluate_action_autonomy(ctx, "water", 30)
    assert action.auto_approved is False
    assert action.requires_confirmation is True


def test_autonomy_blocks_invalid_reading(base_context):
    ctx = base_context.model_copy(update={"is_reading_valid": False})
    action = evaluate_action_autonomy(ctx, "water", 30)
    assert action.auto_approved is False
    assert action.requires_confirmation is True
