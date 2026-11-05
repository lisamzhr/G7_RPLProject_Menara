"""Soil moisture depletion rate predictor interface, linear baseline, and ML predictor."""

import logging
import math
import os
from abc import ABC, abstractmethod
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from roofgarden_ai.contracts import ZoneContext

logger = logging.getLogger("roofgarden_ai.predictor")


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
        time_span_hours = max((n - 1) * 1.0, 1.0)  # Assume 1h per step if hourly
        hourly_rate = total_delta / time_span_hours

        # Depletion means negative rate (moisture decreasing)
        if hourly_rate >= -0.05:
            # Soil is stable or increasing (e.g. rain/irrigation)
            return None

        depletion_rate_abs = abs(hourly_rate)
        moisture_deficit_to_min = current_moisture - min_moisture
        hours_remaining = moisture_deficit_to_min / depletion_rate_abs

        return round(max(hours_remaining, 0.0), 1)


# ---------------------------------------------------------------------------
# ML predictor (memakai ai/models/moisture_model.pkl)
# ---------------------------------------------------------------------------
MODEL_PATH = Path(os.getenv(
    "MOISTURE_MODEL_PATH",
    Path(__file__).resolve().parents[2] / "models" / "moisture_model.pkl",   # -> ai/models/
))
STEPS_1H, STEPS_3H = 6, 18          # sampel 10 menit (sama dengan training)
MIN_POINTS = STEPS_3H + 1


class MLMoisturePredictor(MoisturePredictor):
    """Prediksi jam sampai kelembapan menyentuh minimum, memakai moisture_model.pkl.
    Kalau data kurang atau model gagal, otomatis pakai prediktor linear."""

    def __init__(self, model_path: Path = MODEL_PATH, bundle: dict | None = None,
                 fallback: MoisturePredictor | None = None):
        bundle = bundle or joblib.load(model_path)
        self.model = bundle["model"]
        self.features = bundle["features"]
        self.max_h = bundle["max_h"]
        self.min_rate = bundle["min_rate"]
        self.fallback = fallback or LinearSlopePredictor()
        self.last_source = "ml"     # "ml" atau "linear", berguna untuk log/demo

    def _use_fallback(self, ctx: ZoneContext, why: str) -> float | None:
        logger.warning("MLMoisturePredictor -> linear: %s", why)
        self.last_source = "linear"
        return self.fallback.predict_hours_to_minimum(ctx)

    def predict_hours_to_minimum(self, ctx: ZoneContext) -> float | None:
        pct = ctx.moisture_series_10min
        if len(pct) < MIN_POINTS or ctx.observed_at is None:
            return self._use_fallback(ctx, "butuh >= 19 titik per 10 menit dan observed_at")
        self.last_source = "ml"

        margin = pct[-1] - ctx.thresholds.moisture_min
        if margin <= 0:
            return 0.0                                   # sudah di bawah minimum
        rate_1h = pct[-1] - pct[-1 - STEPS_1H]           # %/jam
        rate_3h = (pct[-1] - pct[-1 - STEPS_3H]) / 3     # %/jam
        if rate_3h >= -self.min_rate:
            return None                                  # tidak sedang mengering

        lin_est = float(np.clip(margin / max(-rate_3h, self.min_rate), 0, self.max_h))
        hour = ctx.observed_at.hour
        row = {"margin": margin, "rate_1h": rate_1h, "rate_3h": rate_3h, "lin_est": lin_est,
               "h_sin": math.sin(2 * math.pi * hour / 24),
               "h_cos": math.cos(2 * math.pi * hour / 24)}
        try:
            X = pd.DataFrame([row], columns=self.features)
            hours = float(np.clip(self.model.predict(X)[0], 0.0, self.max_h))
        except Exception as e:
            return self._use_fallback(ctx, f"model error: {e}")
        return round(hours, 2)


_default_predictor: MoisturePredictor | None = None


def get_default_predictor() -> MoisturePredictor:
    """Dimuat sekali. ML kalau USE_ML_PREDICTOR=1 (default) dan file .pkl ada, selain itu linear."""
    global _default_predictor
    if _default_predictor is None:
        if os.getenv("USE_ML_PREDICTOR", "1") == "1" and MODEL_PATH.exists():
            try:
                _default_predictor = MLMoisturePredictor()
            except Exception:
                logger.exception("Gagal memuat moisture_model.pkl, pakai linear")
                _default_predictor = LinearSlopePredictor()
        else:
            _default_predictor = LinearSlopePredictor()
    return _default_predictor