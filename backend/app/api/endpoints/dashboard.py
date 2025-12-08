from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_current_teacher_or_admin
from app.models import (
    User, Student, Teacher, StudentTeacher, Report, ReportAbility,
    Ability, ResearchTheme, ResearchPhase, StreakRecord
)
from app.schemas.dashboard import (
    StudentSummary,
    StudentDetail,
    AbilityCount,
    ReportSummary,
)

router = APIRouter(prefix="/dashboard", tags=["Teacher Dashboard"])


async def get_teacher_profile(db: AsyncSession, user: User) -> Teacher:
    """Helper to get teacher profile."""
    result = await db.execute(
        select(Teacher).where(Teacher.user_id == user.id)
    )
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return teacher


@router.get("/students", response_model=List[StudentSummary])
async def get_students_summary(
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
    fiscal_year: Optional[int] = None,
):
    """Get summary of all assigned students."""
    teacher = await get_teacher_profile(db, current_user)
    year = fiscal_year or settings.get_current_fiscal_year()

    # Get all student relations
    result = await db.execute(
        select(StudentTeacher)
        .options(selectinload(StudentTeacher.student).selectinload(Student.user))
        .where(
            StudentTeacher.teacher_id == teacher.id,
            StudentTeacher.fiscal_year == year,
            StudentTeacher.is_active == True,
        )
    )
    relations = result.scalars().all()

    students_summary = []
    for rel in relations:
        student = rel.student
        user = student.user

        # Get current theme
        result = await db.execute(
            select(ResearchTheme).where(
                ResearchTheme.student_id == student.id,
                ResearchTheme.fiscal_year == year,
            )
        )
        theme = result.scalar_one_or_none()

        # Get report count
        result = await db.execute(
            select(func.count(Report.id)).where(Report.student_id == student.id)
        )
        report_count = result.scalar()

        # Get streak
        result = await db.execute(
            select(StreakRecord).where(StreakRecord.student_id == student.id)
        )
        streak = result.scalar_one_or_none()

        # Get latest report's phase
        result = await db.execute(
            select(Report)
            .options(selectinload(Report.phase))
            .where(Report.student_id == student.id)
            .order_by(Report.reported_at.desc())
            .limit(1)
        )
        latest_report = result.scalar_one_or_none()

        students_summary.append(StudentSummary(
            id=student.id,
            user_id=user.id,
            name=user.name,
            email=user.email,
            grade=student.grade,
            class_name=student.class_name,
            theme_title=theme.title if theme else None,
            current_phase=latest_report.phase.name if latest_report and latest_report.phase else None,
            total_reports=report_count,
            current_streak=streak.current_streak if streak else 0,
            max_streak=streak.max_streak if streak else 0,
            last_report_date=streak.last_report_date if streak else None,
            is_primary=rel.is_primary,
        ))

    return students_summary


@router.get("/students/{student_id}", response_model=StudentDetail)
async def get_student_detail(
    student_id: UUID,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed information about a specific student."""
    teacher = await get_teacher_profile(db, current_user)
    fiscal_year = settings.get_current_fiscal_year()

    # Verify access
    result = await db.execute(
        select(StudentTeacher).where(
            StudentTeacher.teacher_id == teacher.id,
            StudentTeacher.student_id == student_id,
            StudentTeacher.fiscal_year == fiscal_year,
            StudentTeacher.is_active == True,
        )
    )
    relation = result.scalar_one_or_none()
    if not relation:
        raise HTTPException(status_code=403, detail="Access denied to this student")

    # Get student
    result = await db.execute(
        select(Student)
        .options(selectinload(Student.user))
        .where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = student.user

    # Get theme
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

    # Get streak
    result = await db.execute(
        select(StreakRecord).where(StreakRecord.student_id == student.id)
    )
    streak = result.scalar_one_or_none()

    # Get latest report's phase
    result = await db.execute(
        select(Report)
        .options(selectinload(Report.phase))
        .where(Report.student_id == student.id)
        .order_by(Report.reported_at.desc())
        .limit(1)
    )
    latest_report = result.scalar_one_or_none()

    # Get ability counts (include all abilities, even with 0 count)
    result = await db.execute(
        select(
            Ability.id,
            Ability.name,
            Ability.display_order,
            func.count(ReportAbility.id).filter(Report.student_id == student.id)
        )
        .outerjoin(ReportAbility, ReportAbility.ability_id == Ability.id)
        .outerjoin(Report, Report.id == ReportAbility.report_id)
        .where(Ability.is_active == True)
        .group_by(Ability.id, Ability.name, Ability.display_order)
        .order_by(Ability.display_order)
    )
    ability_counts = [
        AbilityCount(ability_id=row[0], ability_name=row[1], count=row[3] or 0)
        for row in result.all()
    ]

    return StudentDetail(
        id=student.id,
        user_id=user.id,
        name=user.name,
        email=user.email,
        grade=student.grade,
        class_name=student.class_name,
        theme_title=theme.title if theme else None,
        current_phase=latest_report.phase.name if latest_report and latest_report.phase else None,
        total_reports=report_count,
        current_streak=streak.current_streak if streak else 0,
        max_streak=streak.max_streak if streak else 0,
        last_report_date=streak.last_report_date if streak else None,
        is_primary=relation.is_primary,
        ability_counts=ability_counts,
    )


@router.get("/students/{student_id}/reports", response_model=List[ReportSummary])
async def get_student_reports(
    student_id: UUID,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """Get reports of a specific student."""
    teacher = await get_teacher_profile(db, current_user)
    fiscal_year = settings.get_current_fiscal_year()

    # Verify access
    result = await db.execute(
        select(StudentTeacher).where(
            StudentTeacher.teacher_id == teacher.id,
            StudentTeacher.student_id == student_id,
            StudentTeacher.fiscal_year == fiscal_year,
            StudentTeacher.is_active == True,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied to this student")

    # Get reports
    result = await db.execute(
        select(Report)
        .options(
            selectinload(Report.phase),
            selectinload(Report.selected_abilities).selectinload(ReportAbility.ability),
        )
        .where(Report.student_id == student_id)
        .order_by(Report.reported_at.desc())
        .offset(skip)
        .limit(limit)
    )
    reports = result.scalars().all()

    return [
        ReportSummary(
            id=r.id,
            content=r.content,
            phase_name=r.phase.name if r.phase else None,
            abilities=[ra.ability.name for ra in r.selected_abilities],
            ai_comment=r.ai_comment,
            reported_at=r.reported_at,
        )
        for r in reports
    ]
