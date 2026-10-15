from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Alert(Base, TimestampMixin):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    zone_id = Column(String(36), ForeignKey("plant_zones.id", ondelete="CASCADE"), nullable=False)
    level = Column(String(20), nullable=False)  # normal, advisory, warning
    type = Column(String(50), nullable=False)  # e.g. node_offline, moisture_critical, valve_failure
    message = Column(Text, nullable=False)
    requires_confirmation = Column(Boolean, default=False, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    zone = relationship("PlantZone", back_populates="alerts")
