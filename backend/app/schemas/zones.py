"""Pydantic schemas for zones and status."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    key: str
    name: str
    response_timescale: str


class ZoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    garden_id: str
    category: CategoryOut
    label: str
    plant_names: list[str]
    created_at: datetime


class ParameterMetric(BaseModel):
    value: float
    status: str  # ok, low, high
    ideal_min: float
    ideal_max: float
    unit: str


class LatestReadingSummary(BaseModel):
    ts: datetime
    soil_moisture_pct: float
    temperature_c: float
    humidity_pct: float
    lux: float
    is_valid: bool


class RecommendationSummary(BaseModel):
    id: str
    status_level: str
    message: str
    reasons: list[str]
    created_at: datetime


class ZoneStatusResponse(BaseModel):
    zone_id: str
    zone_label: str
    category_key: str
    overall_status: str  # normal, advisory, warning
    latest_reading: LatestReadingSummary | None = None
    parameter_status: dict[str, ParameterMetric]
    latest_recommendation: RecommendationSummary | None = None
