"""Tests for deterministic rule engine status per category."""

from roofgarden_ai.contracts import ZoneContext
from roofgarden_ai.rule_engine.status import determine_zone_level, evaluate_parameters
from roofgarden_ai.rule_engine.thresholds import load_all_profiles, load_category_profile


def test_load_all_profiles():
    profiles = load_all_profiles()
    assert len(profiles) == 4
    assert set(profiles.keys()) == {"leafy", "fruiting_veg", "herbs", "fruit_potted"}
    assert profiles["leafy"].moisture_min == 50.0
    assert profiles["fruit_potted"].response_timescale == "weeks"


def test_leafy_status_classification():
    profile = load_category_profile("leafy")
    ctx = ZoneContext(
        zone_id="zone-1",
        zone_label="Leafy Zone",
        category_key="leafy",
        thresholds=profile,
        current_moisture=60.0,
        current_temp=25.0,
        current_humidity=70.0,
        current_lux=15000.0,
    )
    params = evaluate_parameters(ctx)
    assert params["moisture"].status == "ok"
    assert params["temperature"].status == "ok"
    assert determine_zone_level(params, ctx) == "normal"


def test_leafy_out_of_range_warning():
    profile = load_category_profile("leafy")
    ctx = ZoneContext(
        zone_id="zone-1",
        zone_label="Leafy Zone",
        category_key="leafy",
        thresholds=profile,
        current_moisture=40.0, # Below 50.0 min!
        current_temp=31.0,     # Above 27.0 max!
        current_humidity=70.0,
        current_lux=15000.0,
    )
    params = evaluate_parameters(ctx)
    assert params["moisture"].status == "out_of_range"
    assert params["temperature"].status == "out_of_range"
    assert determine_zone_level(params, ctx) == "warning"
