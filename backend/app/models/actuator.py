from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Actuator(Base, TimestampMixin):
    __tablename__ = "actuators"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    zone_id = Column(String(36), ForeignKey("plant_zones.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)  # sprinkler, shade_net, grow_light
    driver = Column(String(50), default="relay", nullable=False)  # relay, mock
    max_on_seconds = Column(Integer, default=60, nullable=False)
    min_interval_minutes = Column(Integer, default=120, nullable=False)

    zone = relationship("PlantZone", back_populates="actuators")
    control_actions = relationship(
        "ControlAction", back_populates="actuator", cascade="all, delete-orphan"
    )
