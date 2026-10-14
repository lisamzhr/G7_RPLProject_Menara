from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import generate_uuid, utc_now


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    node_id = Column(String(50), ForeignKey("sensor_nodes.id", ondelete="CASCADE"), nullable=False)
    ts = Column(DateTime(timezone=True), nullable=False)
    soil_moisture_pct = Column(Float, nullable=False)
    temperature_c = Column(Float, nullable=False)
    humidity_pct = Column(Float, nullable=False)
    lux = Column(Float, nullable=False)
    battery_v = Column(Float, nullable=True)
    is_valid = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    node = relationship("SensorNode", back_populates="readings")

    __table_args__ = (
        Index("idx_sensor_readings_node_ts_desc", "node_id", ts.desc()),
        UniqueConstraint("node_id", "ts", name="uq_sensor_readings_node_ts"),
    )
