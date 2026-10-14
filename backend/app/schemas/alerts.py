"""Pydantic schemas for alerts, feedback, and actuators."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    zone_id: str
    level: str
    type: str
    message: str
    requires_confirmation: bool
    resolved_at: datetime | None = None
    created_at: datetime


class AlertFeedbackRequest(BaseModel):
    comment: str | None = None


class RecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    zone_id: str
    status_level: str
    message: str
    reasons: list[str]
    created_at: datetime


class ActuatorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    zone_id: str
    type: str
    driver: str
    max_on_seconds: int
    min_interval_minutes: int


class ActuatorCommandRequest(BaseModel):
    command: str = "turn_on"
    duration_seconds: int = 30
