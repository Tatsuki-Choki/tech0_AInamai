from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class BookBase(BaseModel):
    title: str
    author: Optional[str] = None
    publisher: Optional[str] = None
    description: Optional[str] = None
    isbn: Optional[str] = None
    cover_image_url: Optional[str] = None
    recommended_comment: Optional[str] = None

class BookCreate(BookBase):
    pass

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    publisher: Optional[str] = None
    description: Optional[str] = None
    isbn: Optional[str] = None
    cover_image_url: Optional[str] = None
    recommended_comment: Optional[str] = None
    is_active: Optional[bool] = None

class BookResponse(BookBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True






