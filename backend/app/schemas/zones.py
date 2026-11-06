"""Pydantic schemas for zones and status."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ThresholdProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category_id: str
    moisture_min: float
    moisture_max: float
    temp_min: float
    temp_max: float
    humidity_min: float
    humidity_max: float
    lux_min: float
    lux_max: float
    source_note: str


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    key: str
    name: str
    response_timescale: str
    threshold_profile: ThresholdProfileOut | None = None


class ZoneCreate(BaseModel):
    category_key: str
    label: str
    plant_names: list[str] = []


class ZoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    garden_id: str
    category: CategoryOut
    label: str
    plant_names: list[str]
    created_at: datetime
    sensor_node_count: int = 0


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
    battery_v: float | None = None


class RecommendationSummary(BaseModel):
    id: str
    zone_id: str | None = None
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
