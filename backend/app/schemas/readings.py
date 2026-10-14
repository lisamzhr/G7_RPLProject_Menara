"""Pydantic schemas for sensor readings and ingestion."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReadingIngestRequest(BaseModel):
    node_id: str = Field(..., description="ESP32 hardware node identifier")
    ts: datetime | None = Field(None, description="ISO8601 reading timestamp (defaults to current time if omitted)")
    soil_moisture_pct: float = Field(..., description="Soil moisture percentage (0-100)")
    temperature_c: float = Field(..., description="Temperature in Celsius (-10 to 70)")
    humidity_pct: float = Field(..., description="Relative humidity percentage (0-100)")
    lux: float = Field(..., description="Solar illuminance in lux (0 to 120,000)")
    battery_v: float | None = Field(None, description="Optional battery voltage")


class ReadingIngestResponse(BaseModel):
    status: str
    reading_id: str
    node_id: str
    is_valid: bool
    recorded_at: datetime


class SensorReadingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    node_id: str
    ts: datetime
    soil_moisture_pct: float
    temperature_c: float
    humidity_pct: float
    lux: float
    battery_v: float | None = None
    is_valid: bool
