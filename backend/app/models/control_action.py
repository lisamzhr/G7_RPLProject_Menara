from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid, utc_now


class ControlAction(Base, TimestampMixin):
    __tablename__ = "control_actions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actuator_id = Column(String(36), ForeignKey("actuators.id", ondelete="CASCADE"), nullable=False)
    command = Column(String(50), nullable=False) # turn_on, turn_off
    duration_seconds = Column(Integer, default=30, nullable=False)
    source = Column(String(20), default="auto", nullable=False) # auto, user
    status = Column(String(20), default="pending", nullable=False) # pending, sent, acked, failed
    requested_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    executed_at = Column(DateTime(timezone=True), nullable=True)
    result = Column(Text, nullable=True)

    actuator = relationship("Actuator", back_populates="control_actions")
