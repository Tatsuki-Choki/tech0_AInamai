from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.models.base import BaseModel, UUID36


class SeminarLab(BaseModel):
    """ゼミ・ラボマスタ."""
    __tablename__ = "seminar_labs"

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    teacher_id = Column(UUID36, ForeignKey("teachers.id"), nullable=True)  # 担当教師
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    teacher = relationship("Teacher", back_populates="seminar_labs")
    students = relationship("Student", back_populates="seminar_lab")


class Ability(BaseModel):
    """7つの能力マスタ."""
    __tablename__ = "abilities"

    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    display_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    report_abilities = relationship("ReportAbility", back_populates="ability")


class ResearchPhase(BaseModel):
    """探究フェーズマスタ（4つのフェーズ）."""
    __tablename__ = "research_phases"

    name = Column(String(255), nullable=False, unique=True)
    display_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    reports = relationship("Report", back_populates="phase")
