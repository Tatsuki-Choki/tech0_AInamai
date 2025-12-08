from sqlalchemy import Column, String, Integer, Boolean, Text
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


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
