from sqlalchemy import Column, DateTime, String

from app.core.database import Base
from app.models.base import JSONType, TimestampMixin, utc_now


class WeatherCache(Base, TimestampMixin):
    __tablename__ = "weather_cache"

    adm4_code = Column(String(50), primary_key=True) # BMKG Area Code
    fetched_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    payload = Column(JSONType, nullable=False) # Cached forecast JSON
