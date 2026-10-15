"""Tests for deterministic linear slope predictor."""

import pytest

from roofgarden_ai.contracts import ZoneContext
from roofgarden_ai.rule_engine.predictor import LinearSlopePredictor
from roofgarden_ai.rule_engine.thresholds import load_category_profile


@pytest.fixture
def predictor_ctx():
    profile = load_category_profile("leafy")
    return ZoneContext(
        zone_id="zone-pred-1",
        zone_label="Zone Predictor",
        category_key="leafy",
        thresholds=profile, # leafy min is 50.0%
        current_moisture=56.0,
        current_temp=26.0,
        current_humidity=70.0,
        current_lux=15000.0,
        # Over 6 hours, moisture dropped from 62.0% to 56.0% (1.2% per hour)
        recent_moisture_history=[62.0, 60.8, 59.5, 58.3, 57.1, 56.0],
    )


def test_linear_predictor_estimates_hours_to_minimum(predictor_ctx):
    predictor = LinearSlopePredictor()
    hours = predictor.predict_hours_to_minimum(predictor_ctx)
    # Total drop: 62.0 - 56.0 = 6.0% over 5 intervals = 1.2% / hour
    # Current is 56.0, min is 50.0 -> deficit to cover = 6.0%
    # Expected hours: 6.0 / 1.2 = ~5.0 hours
    assert hours is not None
    assert 4.0 <= hours <= 6.0


def test_linear_predictor_returns_zero_when_already_below_minimum(predictor_ctx):
    predictor = LinearSlopePredictor()
    ctx = predictor_ctx.model_copy(update={"current_moisture": 48.0}) # Min is 50.0
    hours = predictor.predict_hours_to_minimum(ctx)
    assert hours == 0.0


def test_linear_predictor_returns_none_when_moisture_rising(predictor_ctx):
    predictor = LinearSlopePredictor()
    # Moisture increasing (e.g. recent rain)
    ctx = predictor_ctx.model_copy(update={"recent_moisture_history": [75.0, 78.0, 80.0, 82.0]})
    hours = predictor.predict_hours_to_minimum(ctx)
    assert hours is None
