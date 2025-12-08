import enum
from sqlalchemy import Column, String, Enum, Integer, Boolean, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class User(BaseModel):
    """Base user model for authentication."""
    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    avatar_url = Column(String(512), nullable=True)
    role = Column(
        Enum(UserRole, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=UserRole.STUDENT
    )
    is_active = Column(Boolean, default=True, nullable=False)

    # Google OAuth info
    google_id = Column(String(255), unique=True, nullable=True)

    # Relationships
    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    teacher_profile = relationship("Teacher", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Student(BaseModel):
    """Student profile extending User."""
    __tablename__ = "students"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    grade = Column(Integer, nullable=True)  # 学年
    class_name = Column(String(50), nullable=True)  # クラス
    student_number = Column(String(50), nullable=True)  # 出席番号など

    # Relationships
    user = relationship("User", back_populates="student_profile")
    teacher_relations = relationship("StudentTeacher", back_populates="student", cascade="all, delete-orphan")
    research_themes = relationship("ResearchTheme", back_populates="student", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="student", cascade="all, delete-orphan")
    streak_record = relationship("StreakRecord", back_populates="student", uselist=False, cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="student", cascade="all, delete-orphan")


class Teacher(BaseModel):
    """Teacher profile extending User."""
    __tablename__ = "teachers"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    department = Column(String(255), nullable=True)  # 担当教科など
    employee_number = Column(String(50), nullable=True)  # 教員番号

    # Relationships
    user = relationship("User", back_populates="teacher_profile")
    student_relations = relationship("StudentTeacher", back_populates="teacher", cascade="all, delete-orphan")
    evaluations_given = relationship("Evaluation", back_populates="evaluated_by_teacher")


class StudentTeacher(BaseModel):
    """Many-to-many relationship between students and teachers."""
    __tablename__ = "student_teachers"

    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)  # 主担当フラグ
    fiscal_year = Column(Integer, nullable=False)  # 年度
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    student = relationship("Student", back_populates="teacher_relations")
    teacher = relationship("Teacher", back_populates="student_relations")
