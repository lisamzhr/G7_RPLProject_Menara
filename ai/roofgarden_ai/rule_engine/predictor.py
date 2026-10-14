"""Soil moisture depletion rate predictor interface and linear baseline."""

from abc import ABC, abstractmethod

from roofgarden_ai.contracts import ZoneContext


class MoisturePredictor(ABC):
    """Abstract interface allowing trained ML models (e.g. LSTM/XGBoost) to replace baseline."""

    @abstractmethod
    def predict_hours_to_minimum(self, ctx: ZoneContext) -> float | None:
        """Estimate hours remaining until soil moisture dips below moisture_min."""


class LinearSlopePredictor(MoisturePredictor):
    """Deterministic linear slope predictor evaluating historical readings over the past ~6 hours."""

    def predict_hours_to_minimum(self, ctx: ZoneContext) -> float | None:
        history = ctx.recent_moisture_history
        # Need at least two historical data points to calculate slope
        if not history or len(history) < 2:
            return None

        current_moisture = ctx.current_moisture
        min_moisture = ctx.thresholds.moisture_min

        # If already below minimum, 0 hours remaining
        if current_moisture <= min_moisture:
            return 0.0

        # Calculate slope: points represent consecutive readings (e.g. hourly or 30-min intervals)
        # We assume history spans N intervals.
        # Average change per interval
        n = len(history)
        first_val = history[0]
        last_val = history[-1]
        
        # Total change over (n - 1) intervals
        total_delta = last_val - first_val
        time_span_hours = max((n - 1) * 1.0, 1.0) # Assume 1h per step if hourly
        hourly_rate = total_delta / time_span_hours

        # Depletion means negative rate (moisture decreasing)
        if hourly_rate >= -0.05:
            # Soil is stable or increasing (e.g. rain/irrigation)
            return None

        depletion_rate_abs = abs(hourly_rate)
        moisture_deficit_to_min = current_moisture - min_moisture
        hours_remaining = moisture_deficit_to_min / depletion_rate_abs

        return round(max(hours_remaining, 0.0), 1)
