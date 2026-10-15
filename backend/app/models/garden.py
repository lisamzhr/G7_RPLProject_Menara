from sqlalchemy import Column, Float, ForeignKey, String
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Garden(Base, TimestampMixin):
    __tablename__ = "gardens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    location_name = Column(String(255), nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    elevation_m = Column(Float, default=15.0, nullable=False)
    adm4_code = Column(String(50), nullable=False)  # BMKG Area Code

    user = relationship("User", back_populates="gardens")
    zones = relationship("PlantZone", back_populates="garden", cascade="all, delete-orphan")
