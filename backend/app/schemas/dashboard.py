"""Pydantic schemas for dashboard summary."""

from pydantic import BaseModel


class WeatherSummary(BaseModel):
    location: str
    forecast: str
    temp_c: float
    rain_probability_pct: float
    attribution: str


class TopRecommendation(BaseModel):
    zone_id: str
    zone_label: str
    status_level: str
    message: str


class DashboardSummaryResponse(BaseModel):
    total_zones: int
    zones_ok: int
    zones_need_attention: int
    active_alerts_count: int
    weather_summary: WeatherSummary
    top_recommendations: list[TopRecommendation]
