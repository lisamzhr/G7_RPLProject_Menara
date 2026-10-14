"""Pydantic schemas for sensor nodes and commands."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SensorNodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    zone_id: str
    last_seen_at: datetime | None = None
    status: str


class NodeCommandOut(BaseModel):
    command_id: str
    actuator_id: str
    command: str
    duration_seconds: int
    requested_at: datetime


class CommandAckRequest(BaseModel):
    status: str # acked, failed
    executed_at: datetime | None = None
    result: str | None = None


class CommandAckResponse(BaseModel):
    status: str
    command_id: str
