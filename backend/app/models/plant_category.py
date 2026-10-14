from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class PlantCategory(Base, TimestampMixin):
    __tablename__ = "plant_categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(50), unique=True, index=True, nullable=False) # leafy, fruiting_veg, herbs, fruit_potted
    name = Column(String(100), nullable=False)
    response_timescale = Column(String(20), nullable=False) # days, weeks

    threshold_profile = relationship("ThresholdProfile", back_populates="category", uselist=False, cascade="all, delete-orphan")
    zones = relationship("PlantZone", back_populates="category")
