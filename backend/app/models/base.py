import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, TypeDecorator

from app.db.session import Base


class UUID36(TypeDecorator):
    """Platform-independent UUID type using CHAR(36) for MySQL compatibility."""
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            if isinstance(value, uuid.UUID):
                return str(value)
            return value
        return None

    def process_result_value(self, value, dialect):
        if value is not None:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            return value
        return None


class TimestampMixin:
    """Mixin for adding created_at and updated_at timestamps."""
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class UUIDMixin:
    """Mixin for adding UUID primary key."""
    id = Column(UUID36, primary_key=True, default=lambda: str(uuid.uuid4()))


class BaseModel(Base, UUIDMixin, TimestampMixin):
    """Base model with UUID primary key and timestamps."""
    __abstract__ = True
