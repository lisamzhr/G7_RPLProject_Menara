"""Pydantic schemas for alerts, feedback, and actuators."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    zone_id: str
    zone_label: str | None = None
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


class ActuatorLastActionOut(BaseModel):
    command: str
    source: str
    status: str
    executed_at: datetime | None = None


class ActuatorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    zone_id: str
    type: str
    driver: str
    max_on_seconds: int
    min_interval_minutes: int
    last_action: ActuatorLastActionOut | None = None


class ActuatorCommandRequest(BaseModel):
    command: Literal["turn_on", "turn_off"] = "turn_on"
    duration_seconds: int = Field(30, ge=1, le=3600)
