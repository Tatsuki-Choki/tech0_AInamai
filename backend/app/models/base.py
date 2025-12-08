import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class TimestampMixin:
    """Mixin for adding created_at and updated_at timestamps."""
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class UUIDMixin:
    """Mixin for adding UUID primary key."""
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class BaseModel(Base, UUIDMixin, TimestampMixin):
    """Base model with UUID primary key and timestamps."""
    __abstract__ = True
