from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from app.models.research import ThemeStatus


# Research Theme Schemas
class ResearchThemeBase(BaseModel):
    title: str
    description: Optional[str] = None


class ResearchThemeCreate(ResearchThemeBase):
    fiscal_year: Optional[int] = None  # If not provided, use current fiscal year


class ResearchThemeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ThemeStatus] = None


class ResearchThemeResponse(ResearchThemeBase):
    id: UUID
    student_id: UUID
    fiscal_year: int
    status: ThemeStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Ability Schemas
class AbilityResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    display_order: int

    class Config:
        from_attributes = True


# Research Phase Schemas
class ResearchPhaseResponse(BaseModel):
    id: UUID
    name: str
    display_order: int

    class Config:
        from_attributes = True


# Report Schemas
class ReportCreate(BaseModel):
    content: str
    image_url: Optional[str] = None
    theme_id: UUID
    phase_id: Optional[UUID] = None
    ability_ids: List[UUID] = []  # Selected abilities


class ReportUpdate(BaseModel):
    content: Optional[str] = None
    image_url: Optional[str] = None
    phase_id: Optional[UUID] = None
    ability_ids: Optional[List[UUID]] = None


class ReportAbilityResponse(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class ReportResponse(BaseModel):
    id: UUID
    student_id: UUID
    theme_id: UUID
    content: str
    image_url: Optional[str] = None
    phase: Optional[ResearchPhaseResponse] = None
    selected_abilities: List[ReportAbilityResponse] = []
    ai_comment: Optional[str] = None
    reported_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    id: UUID
    content: str
    image_url: Optional[str] = None
    phase: Optional[ResearchPhaseResponse] = None
    ability_count: int
    ai_comment: Optional[str] = None
    reported_at: datetime

    class Config:
        from_attributes = True


# Streak Record Schemas
class StreakRecordResponse(BaseModel):
    current_streak: int
    max_streak: int
    last_report_date: Optional[datetime] = None

    class Config:
        from_attributes = True


# SeminarLab Schemas
class SeminarLabBase(BaseModel):
    name: str
    description: Optional[str] = None


class SeminarLabCreate(SeminarLabBase):
    pass


class SeminarLabUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class SeminarLabResponse(SeminarLabBase):
    id: UUID
    teacher_id: Optional[UUID] = None
    teacher_name: Optional[str] = None
    is_active: bool
    student_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SeminarLabListResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    teacher_name: Optional[str] = None
    student_count: int = 0
    is_active: bool

    class Config:
        from_attributes = True
