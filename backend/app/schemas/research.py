from pydantic import BaseModel
from typing import Optional, List, Union
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
    id: Union[UUID, str]  # Support both UUID and string IDs for backward compatibility
    student_id: Union[UUID, str]  # Support both UUID and string IDs for backward compatibility
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


class DetectedAbility(BaseModel):
    """AI分析で検出された能力.

    Attributes:
        name: 能力名（例: "情報収集能力と先を見る力"）
        reason: 検出理由（例: "記述内容から最も強く表れているため"）
        role: 能力の役割（"strong" = 主要能力, "sub" = 補助能力）
        score: スコア（strong=80, sub=60）
    """
    name: str
    reason: Optional[str] = None
    role: str  # "strong" or "sub"
    score: int = 60  # Default to sub score

    class Config:
        extra = "ignore"  # Allow extra fields for backward compatibility


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
    # Pre-analyzed data from /reports/analyze to avoid re-analysis
    ai_comment: Optional[str] = None  # Pre-analyzed AI comment
    detected_abilities: Optional[List[DetectedAbility]] = None  # Pre-detected abilities from analyze


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
