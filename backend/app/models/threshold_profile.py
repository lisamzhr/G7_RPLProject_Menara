from sqlalchemy import Column, Float, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class ThresholdProfile(Base, TimestampMixin):
    __tablename__ = "threshold_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    category_id = Column(
        String(36),
        ForeignKey("plant_categories.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    moisture_min = Column(Float, nullable=False)
    moisture_max = Column(Float, nullable=False)
    temp_min = Column(Float, nullable=False)
    temp_max = Column(Float, nullable=False)
    humidity_min = Column(Float, nullable=False)
    humidity_max = Column(Float, nullable=False)
    lux_min = Column(Float, nullable=False)
    lux_max = Column(Float, nullable=False)
    source_note = Column(Text, nullable=False)

    category = relationship("PlantCategory", back_populates="threshold_profile")
