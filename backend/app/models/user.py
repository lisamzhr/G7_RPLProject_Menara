from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    role = Column(String(50), default="gardener", nullable=False)

    gardens = relationship("Garden", back_populates="user", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="user")
