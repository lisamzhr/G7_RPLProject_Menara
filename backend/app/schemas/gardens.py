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
