from sqlalchemy import Column, String, Text, Integer, ForeignKey, Date, JSON
from sqlalchemy.orm import relationship

from app.models.base import BaseModel, UUID36


class StreakRecord(BaseModel):
    """継続記録."""
    __tablename__ = "streak_records"

    student_id = Column(UUID36, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, unique=True)
    current_streak = Column(Integer, default=0, nullable=False)  # 現在の連続日数
    max_streak = Column(Integer, default=0, nullable=False)  # 最長連続日数
    last_report_date = Column(Date, nullable=True)  # 最終報告日

    # Relationships
    student = relationship("Student", back_populates="streak_record")


class Evaluation(BaseModel):
    """評価データ."""
    __tablename__ = "evaluations"

    student_id = Column(UUID36, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    fiscal_year = Column(Integer, nullable=False)  # 年度
    period = Column(String(50), nullable=True)  # 評価期間（学期など: "1学期", "2学期", "年度末" など）

    # 評価データ（JSON形式で保存）
    # 例: {"ability_uuid_1": 10, "ability_uuid_2": 5, ...}
    self_score = Column(JSON, nullable=True)  # 自己評価（能力別カウント）
    ai_score = Column(JSON, nullable=True)  # AI調整評価
    ai_comment = Column(Text, nullable=True)  # AIからの評価コメント
    teacher_score = Column(JSON, nullable=True)  # 教師訂正評価
    teacher_comment = Column(Text, nullable=True)  # 教師からのフィードバック
    final_score = Column(JSON, nullable=True)  # 最終評価

    # 評価した教師
    evaluated_by = Column(UUID36, ForeignKey("teachers.id"), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="evaluations")
    evaluated_by_teacher = relationship("Teacher", back_populates="evaluations_given")
