from sqlalchemy import Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class GardenMember(Base, TimestampMixin):
    __tablename__ = "garden_members"
    __table_args__ = (UniqueConstraint("garden_id", "user_id", name="uq_garden_user"),)

    id = Column(String(36), primary_key=True, default=generate_uuid)
    garden_id = Column(
        String(36), ForeignKey("gardens.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role = Column(String(20), default="member", nullable=False)  # owner | member

    garden = relationship("Garden", back_populates="members")
    user = relationship("User", back_populates="memberships")