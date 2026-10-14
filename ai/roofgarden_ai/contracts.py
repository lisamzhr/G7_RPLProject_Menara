"""Pydantic contracts for RoofGarden AI orchestration, rule engine, and guardrails."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CategoryThresholds(BaseModel):
    category_key: str
    name: str
    response_timescale: Literal["days", "weeks"]
    moisture_min: float
    moisture_max: float
    temp_min: float
    temp_max: float
    humidity_min: float
    humidity_max: float
    lux_min: float
    lux_max: float
    source_note: str


class ParameterReading(BaseModel):
    name: str
    value: float
    unit: str
    ideal_min: float
    ideal_max: float
    status: Literal["ok", "near_limit", "out_of_range"]


class ZoneContext(BaseModel):
    zone_id: str
    zone_label: str
    category_key: Literal["leafy", "fruiting_veg", "herbs", "fruit_potted"]
    thresholds: CategoryThresholds
    current_moisture: float
    current_temp: float
    current_humidity: float
    current_lux: float
    is_reading_valid: bool = True
    reading_age_seconds: float = 0.0
    recent_moisture_history: list[float] = Field(default_factory=list) # Hourly or sub-hourly readings over last 6h
    rain_chance_next_3h: float = 0.0 # 0.0 - 100.0%
    weather_forecast_text: str = "Cerah Berawan"
    has_severe_weather_alert: bool = False
    last_watered_minutes_ago: float | None = None
    today_water_seconds: int = 0
    min_interval_minutes: int = 120
    daily_water_cap_seconds: int = 300
    suggested_water_seconds: int = 30


class ProposedAction(BaseModel):
    action_type: Literal["water", "wait", "shade", "add_light", "check_device"]
    duration_seconds: int = 0
    requires_confirmation: bool = False
    auto_approved: bool = False
    reason: str


class Recommendation(BaseModel):
    status_level: Literal["normal", "advisory", "warning"]
    message: str
    reasons: list[str] = Field(default_factory=list)


class Decision(BaseModel):
    zone_id: str
    overall_level: Literal["normal", "advisory", "warning"]
    recommendation: Recommendation
    action: ProposedAction
    estimated_hours_to_min_moisture: float | None = None
    used_fallback: bool = False
    raw_llm_output: str | None = None
