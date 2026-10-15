"""Base mixins and types for SQLAlchemy models."""

import json
import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime
from sqlalchemy.types import TEXT, TypeDecorator


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(UTC)


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class JSONType(TypeDecorator):
    """Platform-independent JSON type that works with SQLite (as TEXT) and Postgres."""

    impl = TEXT
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return None

    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
        return None


class VectorType(TypeDecorator):
    """Vector type that stores as JSON/TEXT on SQLite and Vector(dim) on Postgres."""

    impl = TEXT
    cache_ok = True

    def __init__(self, dim=1536, **kwargs):
        super().__init__(**kwargs)
        self.dim = dim

    def process_bind_param(self, value, dialect):
        if dialect.name == "postgresql":
            return value
        if value is not None:
            return json.dumps(value)
        return None

    def process_result_value(self, value, dialect):
        if dialect.name == "postgresql":
            return value
        if value is not None:
            return json.loads(value)
        return None
