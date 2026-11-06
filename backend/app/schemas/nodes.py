"""Pydantic schemas for sensor nodes and commands."""

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator


def normalize_mac(v: str) -> str:
    """Normalize and validate MAC address to uppercase colon-separated format."""
    cleaned = v.strip().replace("-", ":").upper()
    if re.match(r"^([0-9A-F]{2}:){5}[0-9A-F]{2}$", cleaned):
        return cleaned
    raw = re.sub(r"[^0-9A-F]", "", v.upper())
    if len(raw) == 12:
        return ":".join(raw[i:i+2] for i in range(0, 12, 2))
    raise ValueError("Invalid MAC address format. Expected format: 'AA:BB:CC:DD:EE:FF' or 12 hex characters.")


class SensorNodeRegister(BaseModel):
    mac_address: str
    name: str | None = None
    zone_id: str | None = None

    @field_validator("mac_address")
    @classmethod
    def validate_mac(cls, v: str) -> str:
        return normalize_mac(v)


class SensorNodeUpdate(BaseModel):
    name: str | None = None
    zone_id: str | None = None


class SensorNodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    mac_address: str | None = None
    name: str | None = None
    zone_id: str
    zone_label: str | None = None
    last_seen_at: datetime | None = None
    status: str
    created_at: datetime | None = None


class NodeCommandOut(BaseModel):
    command_id: str
    actuator_id: str
    command: str
    duration_seconds: int
    requested_at: datetime


class CommandAckRequest(BaseModel):
    status: Literal["acked", "failed"]
    executed_at: datetime | None = None
    result: str | None = None


class CommandAckResponse(BaseModel):
    status: str
    command_id: str
