from sqlalchemy import Column, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Feedback(Base, TimestampMixin):
    __tablename__ = "feedback"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(String(50), nullable=False)  # alert, recommendation, action
    target_id = Column(String(36), nullable=False)
    decision = Column(String(20), nullable=False)  # confirm, override
    comment = Column(Text, nullable=True)

    user = relationship("User", back_populates="feedbacks")
