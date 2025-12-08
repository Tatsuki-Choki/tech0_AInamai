from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_current_user, get_current_student, get_current_teacher_or_admin
from app.models import (
    User, Student, Teacher, StudentTeacher, Report, ReportAbility,
    Ability, ResearchTheme, StreakRecord
)
from app.schemas.ai import ChatRequest, ChatResponse, TeacherAdviceResponse
from app.services.ai import generate_chat_response, generate_teacher_advice

router = APIRouter(prefix="/ai", tags=["AI Features"])


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_student),
):
    """
    Chat with AI principal (生意君).
    Note: Chat history is NOT stored for privacy.
    """
    response = await generate_chat_response(request.message)
    return ChatResponse(response=response)


@router.get("/advice/{student_id}", response_model=TeacherAdviceResponse)
async def get_teacher_advice(
    student_id: UUID,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get AI-generated advice for a specific student (teacher only)."""
    # Get teacher profile
    result = await db.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    # Get student
    result = await db.execute(
        select(Student).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check if teacher is assigned to this student
    fiscal_year = settings.get_current_fiscal_year()
    result = await db.execute(
        select(StudentTeacher).where(
            StudentTeacher.teacher_id == teacher.id,
            StudentTeacher.student_id == student.id,
            StudentTeacher.fiscal_year == fiscal_year,
            StudentTeacher.is_active == True,
        )
    )
    relation = result.scalar_one_or_none()

    if not relation:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this student",
        )

    # Get student's user info
    result = await db.execute(
        select(User).where(User.id == student.user_id)
    )
    user = result.scalar_one()

    # Get current theme
    result = await db.execute(
        select(ResearchTheme).where(
            ResearchTheme.student_id == student.id,
            ResearchTheme.fiscal_year == fiscal_year,
        )
    )
    theme = result.scalar_one_or_none()

    # Get report count
    result = await db.execute(
        select(func.count(Report.id)).where(Report.student_id == student.id)
    )
    report_count = result.scalar()

    # Get ability counts
    result = await db.execute(
        select(Ability.name, func.count(ReportAbility.id))
        .join(ReportAbility, ReportAbility.ability_id == Ability.id)
        .join(Report, Report.id == ReportAbility.report_id)
        .where(Report.student_id == student.id)
        .group_by(Ability.name)
    )
    ability_counts = dict(result.all())

    # Get streak record
    result = await db.execute(
        select(StreakRecord).where(StreakRecord.student_id == student.id)
    )
    streak = result.scalar_one_or_none()
    current_streak = streak.current_streak if streak else 0
    max_streak = streak.max_streak if streak else 0

    # Generate advice
    advice = await generate_teacher_advice(
        student_name=user.name,
        theme=theme.title if theme else "未設定",
        report_count=report_count,
        ability_counts=ability_counts,
        current_streak=current_streak,
        max_streak=max_streak,
    )

    return TeacherAdviceResponse(
        advice=advice,
        student_name=user.name,
        theme=theme.title if theme else None,
        report_count=report_count,
        current_streak=current_streak,
        max_streak=max_streak,
    )
