from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class SensorNode(Base, TimestampMixin):
    __tablename__ = "sensor_nodes"

    id = Column(String(50), primary_key=True)  # Node hardware ID (e.g. 'esp32-node-01')
    zone_id = Column(String(36), ForeignKey("plant_zones.id", ondelete="CASCADE"), nullable=False)
    api_key_hash = Column(String(64), nullable=False)  # SHA-256 hash
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="active", nullable=False)  # active, offline, maintenance

    zone = relationship("PlantZone", back_populates="sensor_nodes")
    readings = relationship("SensorReading", back_populates="node", cascade="all, delete-orphan")
