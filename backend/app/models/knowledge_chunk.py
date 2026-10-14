from sqlalchemy import Column, String, Text

from app.core.database import Base
from app.models.base import TimestampMixin, VectorType, generate_uuid


class KnowledgeChunk(Base, TimestampMixin):
    __tablename__ = "knowledge_chunks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    category_key = Column(String(50), index=True, nullable=False)
    content = Column(Text, nullable=False)
    source = Column(Text, nullable=False)
    embedding = Column(VectorType(1536), nullable=True) # pgvector Vector(1536) on Postgres, JSON on SQLite
