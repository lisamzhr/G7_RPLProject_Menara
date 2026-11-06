"""Pydantic schemas for gardens."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GardenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    location_name: str
    lat: float
    lon: float
    elevation_m: float
    adm4_code: str
    created_at: datetime

class GardenCreate(BaseModel):
    name: str
    location_name: str
    lat: float
    lon: float
    elevation_m: float = 15.0
    adm4_code: str


class GardenUpdate(BaseModel):
    name: str | None = None
    location_name: str | None = None
    lat: float | None = None
    lon: float | None = None
    elevation_m: float | None = None
    adm4_code: str | None = None


class AddMemberRequest(BaseModel):
    email: str


class MemberOut(BaseModel):
    user_id: str
    name: str
    email: str | None
    role: str
