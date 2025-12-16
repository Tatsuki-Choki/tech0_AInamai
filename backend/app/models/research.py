import enum
from sqlalchemy import Column, String, Text, Integer, Enum, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship

from app.models.base import BaseModel, UUID36


class ThemeStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class ResearchTheme(BaseModel):
    """探究テーマ（生徒1人につき年度ごとに1つ）."""
    __tablename__ = "research_themes"

    student_id = Column(UUID36, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    fiscal_year = Column(Integer, nullable=False)
    status = Column(
        Enum(ThemeStatus, values_callable=lambda x: [e.value for e in x]),
        default=ThemeStatus.IN_PROGRESS,
        nullable=False
    )

    # Relationships
    student = relationship("Student", back_populates="research_themes")
    reports = relationship("Report", back_populates="theme")


class Report(BaseModel):
    """日々の報告（日記）."""
    __tablename__ = "reports"

    student_id = Column(UUID36, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    theme_id = Column(UUID36, ForeignKey("research_themes.id", ondelete="CASCADE"), nullable=False)
    phase_id = Column(UUID36, ForeignKey("research_phases.id"), nullable=True)

    content = Column(Text, nullable=False)  # 報告内容（原文）
    image_url = Column(String(2048), nullable=True)  # 添付画像URL
    ai_comment = Column(Text, nullable=True)  # AIからの一言コメント
    reported_at = Column(DateTime, nullable=False)  # 報告日時

    # Relationships
    student = relationship("Student", back_populates="reports")
    theme = relationship("ResearchTheme", back_populates="reports")
    phase = relationship("ResearchPhase", back_populates="reports")
    selected_abilities = relationship("ReportAbility", back_populates="report", cascade="all, delete-orphan")


class ReportAbility(BaseModel):
    """報告×能力の中間テーブル."""
    __tablename__ = "report_abilities"

    report_id = Column(UUID36, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    ability_id = Column(UUID36, ForeignKey("abilities.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(16), nullable=True)  # strong / sub
    points = Column(Integer, nullable=False, default=0)  # strong: 2, sub: 1

    # Relationships
    report = relationship("Report", back_populates="selected_abilities")
    ability = relationship("Ability", back_populates="report_abilities")
