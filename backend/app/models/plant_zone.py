from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import JSONType, TimestampMixin, generate_uuid


class PlantZone(Base, TimestampMixin):
    __tablename__ = "plant_zones"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    garden_id = Column(String(36), ForeignKey("gardens.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(String(36), ForeignKey("plant_categories.id"), nullable=False)
    label = Column(String(100), nullable=False)
    plant_names = Column(JSONType, default=list, nullable=False)  # List of plant names as JSON

    garden = relationship("Garden", back_populates="zones")
    category = relationship("PlantCategory", back_populates="zones")
    sensor_nodes = relationship("SensorNode", back_populates="zone", cascade="all, delete-orphan")
    actuators = relationship("Actuator", back_populates="zone", cascade="all, delete-orphan")
    recommendations = relationship(
        "Recommendation", back_populates="zone", cascade="all, delete-orphan"
    )
    alerts = relationship("Alert", back_populates="zone", cascade="all, delete-orphan")
