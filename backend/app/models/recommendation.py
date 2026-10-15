from sqlalchemy import Column, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import JSONType, TimestampMixin, generate_uuid


class Recommendation(Base, TimestampMixin):
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    zone_id = Column(String(36), ForeignKey("plant_zones.id", ondelete="CASCADE"), nullable=False)
    status_level = Column(String(20), nullable=False)  # normal, advisory, warning
    message = Column(Text, nullable=False)
    reasons = Column(JSONType, default=list, nullable=False)  # List of reason strings

    zone = relationship("PlantZone", back_populates="recommendations")
