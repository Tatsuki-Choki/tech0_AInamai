from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date


class AbilityCount(BaseModel):
    ability_id: UUID
    ability_name: str
    count: int


class StudentSummary(BaseModel):
    id: UUID  # Student ID
    user_id: UUID
    name: str
    email: str
    grade: Optional[int] = None
    class_name: Optional[str] = None
    theme_title: Optional[str] = None
    current_phase: Optional[str] = None
    total_reports: int
    current_streak: int
    max_streak: int
    last_report_date: Optional[date] = None
    is_primary: bool = False
    seminar_lab_id: Optional[UUID] = None
    seminar_lab_name: Optional[str] = None
    alert_level: int = 0  # 0: Normal, 1: Warning
    top_abilities: List[str] = []


class StudentDetail(StudentSummary):
    ability_counts: List[AbilityCount] = []


class ReportSummary(BaseModel):
    id: UUID
    content: str
    phase_name: Optional[str] = None
    abilities: List[str] = []
    ai_comment: Optional[str] = None
    reported_at: datetime


class PaginatedResponse(BaseModel):
    data: List
    pagination: dict


class AbilityInfo(BaseModel):
    """能力情報."""
    id: UUID
    name: str
    display_order: int


class ScatterDataPoint(BaseModel):
    """散布図用のデータポイント."""
    student_id: UUID
    student_name: str
    grade: Optional[int] = None
    class_name: Optional[str] = None
    ability_scores: dict[str, int]  # ability_id -> count


class ScatterDataResponse(BaseModel):
    """散布図APIのレスポンス."""
    abilities: List[AbilityInfo]
    data_points: List[ScatterDataPoint]
