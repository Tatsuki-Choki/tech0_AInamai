import logging
from typing import List, Optional
from uuid import UUID
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_current_teacher_or_admin
from app.models import (
    User, Student, Teacher, StudentTeacher, Report, ReportAbility,
    Ability, ResearchTheme, ResearchPhase, StreakRecord, SeminarLab
)
from app.schemas.dashboard import (
    StudentSummary,
    StudentDetail,
    AbilityCount,
    ReportSummary,
    AbilityInfo,
    ScatterDataPoint,
    ScatterDataResponse,
    StudentUpdateRequest,
    StudentUpdateResponse,
)

logger = logging.getLogger(__name__)

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
    """Get summary of all assigned students. If no assignments exist, return all students.

    Optimized to use batch queries instead of N+1 pattern.
    """
    try:
        logger.info(f"get_students_summary called by user {current_user.id}")
        teacher = await get_teacher_profile(db, current_user)
        year = fiscal_year or settings.get_current_fiscal_year()
        logger.info(f"Teacher ID: {teacher.id}, Fiscal year: {year}")

        # Get all student relations
        result = await db.execute(
            select(StudentTeacher)
            .where(
                StudentTeacher.teacher_id == teacher.id,
                StudentTeacher.fiscal_year == year,
                StudentTeacher.is_active == True,
            )
        )
        relations = result.scalars().all()
        relations_map = {rel.student_id: rel for rel in relations}
        logger.info(f"Found {len(relations)} student-teacher relations")

        # BATCH 1: Get all students with user and seminar_lab in one query
        if not relations:
            logger.info("No student-teacher relations found, returning all students")
            students_result = await db.execute(
                select(Student)
                .options(
                    selectinload(Student.user),
                    selectinload(Student.seminar_lab),
                )
            )
            students = students_result.scalars().all()
        else:
            student_ids = [rel.student_id for rel in relations]
            students_result = await db.execute(
                select(Student)
                .options(
                    selectinload(Student.user),
                    selectinload(Student.seminar_lab),
                )
                .where(Student.id.in_(student_ids))
            )
            students = students_result.scalars().all()

        if not students:
            return []

        student_ids = [s.id for s in students]

        # BATCH 2: Get all themes for the year
        themes_result = await db.execute(
            select(ResearchTheme)
            .where(
                ResearchTheme.student_id.in_(student_ids),
                ResearchTheme.fiscal_year == year,
            )
        )
        themes_map = {t.student_id: t for t in themes_result.scalars().all()}

        # BATCH 3: Get all report counts in one query
        report_counts_result = await db.execute(
            select(Report.student_id, func.count(Report.id))
            .where(Report.student_id.in_(student_ids))
            .group_by(Report.student_id)
        )
        report_counts_map = {row[0]: row[1] for row in report_counts_result.all()}

        # BATCH 4: Get all streaks in one query
        streaks_result = await db.execute(
            select(StreakRecord)
            .where(StreakRecord.student_id.in_(student_ids))
        )
        streaks_map = {s.student_id: s for s in streaks_result.scalars().all()}

        # BATCH 5: Get latest report for each student using a subquery
        latest_report_subq = (
            select(Report.student_id, func.max(Report.reported_at).label('max_reported_at'))
            .where(Report.student_id.in_(student_ids))
            .group_by(Report.student_id)
            .subquery()
        )
        latest_reports_result = await db.execute(
            select(Report)
            .options(selectinload(Report.phase))
            .join(
                latest_report_subq,
                and_(
                    Report.student_id == latest_report_subq.c.student_id,
                    Report.reported_at == latest_report_subq.c.max_reported_at
                )
            )
        )
        latest_reports_map = {r.student_id: r for r in latest_reports_result.scalars().all()}

        # BATCH 6: Get top 3 abilities for each student
        # This is more complex - we need a window function or multiple queries
        # Using a simpler approach: get all ability counts and process in Python
        ability_counts_result = await db.execute(
            select(
                Report.student_id,
                Ability.name,
                func.count(ReportAbility.id).label('cnt')
            )
            .join(ReportAbility, ReportAbility.report_id == Report.id)
            .join(Ability, Ability.id == ReportAbility.ability_id)
            .where(Report.student_id.in_(student_ids))
            .group_by(Report.student_id, Ability.id, Ability.name)
        )
        # Build top abilities map: student_id -> [ability_name, ...]
        student_ability_counts = defaultdict(list)
        for row in ability_counts_result.all():
            student_ability_counts[row[0]].append((row[1], row[2]))

        top_abilities_map = {}
        for student_id, ability_list in student_ability_counts.items():
            sorted_abilities = sorted(ability_list, key=lambda x: -x[1])
            top_abilities_map[student_id] = [a[0] for a in sorted_abilities[:3]]

        # Build response
        students_summary = []
        for student in students:
            if not student.user:
                logger.warning(f"User not found for student_id {student.id}")
                continue

            user = student.user
            rel = relations_map.get(student.id)
            theme = themes_map.get(student.id)
            streak = streaks_map.get(student.id)
            latest_report = latest_reports_map.get(student.id)
            top_abilities = top_abilities_map.get(student.id, [])

            students_summary.append(StudentSummary(
                id=student.id,
                user_id=user.id,
                name=user.name,
                email=user.email,
                grade=student.grade,
                class_name=student.class_name,
                theme_title=theme.title if theme else None,
                current_phase=latest_report.phase.name if latest_report and latest_report.phase else None,
                total_reports=report_counts_map.get(student.id, 0),
                current_streak=streak.current_streak if streak else 0,
                max_streak=streak.max_streak if streak else 0,
                last_report_date=streak.last_report_date if streak else None,
                is_primary=rel.is_primary if rel else False,
                seminar_lab_id=student.seminar_lab_id,
                seminar_lab_name=student.seminar_lab.name if student.seminar_lab else None,
                top_abilities=top_abilities,
                alert_level=0,
            ))

        # Calculate alert levels (lowest 5 report counts)
        if students_summary:
            sorted_by_reports = sorted(students_summary, key=lambda x: x.total_reports)
            cutoff_index = min(5, len(sorted_by_reports))
            bottom_ids = {s.id for s in sorted_by_reports[:cutoff_index]}

            for summary in students_summary:
                if summary.id in bottom_ids:
                    summary.alert_level = 1

        logger.info(f"Returning {len(students_summary)} student summaries")
        return students_summary
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_students_summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/students/{student_id}", response_model=StudentDetail)
async def get_student_detail(
    student_id: str,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed information about a specific student."""
    teacher = await get_teacher_profile(db, current_user)
    fiscal_year = settings.get_current_fiscal_year()

    # Check if teacher has any student assignments
    any_relations_result = await db.execute(
        select(StudentTeacher).where(
            StudentTeacher.teacher_id == teacher.id,
            StudentTeacher.fiscal_year == fiscal_year,
            StudentTeacher.is_active == True,
        ).limit(1)
    )
    has_assignments = any_relations_result.scalar_one_or_none() is not None

    # Verify access - if teacher has no assignments, allow access to all students
    relation = None
    if has_assignments:
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
        .options(
            selectinload(Student.user),
            selectinload(Student.seminar_lab),
        )
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

    # Get ability counts (include all abilities, even with 0 count) - MySQL compatible
    result = await db.execute(
        select(
            Ability.id,
            Ability.name,
            Ability.display_order,
            func.sum(case((Report.student_id == student.id, 1), else_=0))
        )
        .outerjoin(ReportAbility, ReportAbility.ability_id == Ability.id)
        .outerjoin(Report, Report.id == ReportAbility.report_id)
        .where(Ability.is_active == True)
        .group_by(Ability.id, Ability.name, Ability.display_order)
        .order_by(Ability.display_order)
    )
    ability_counts = [
        AbilityCount(ability_id=row[0], ability_name=row[1], count=int(row[3] or 0))
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
        is_primary=relation.is_primary if relation else False,
        seminar_lab_id=student.seminar_lab_id,
        seminar_lab_name=student.seminar_lab.name if student.seminar_lab else None,
        ability_counts=ability_counts,
    )


@router.put("/students/{student_id}", response_model=StudentUpdateResponse)
async def update_student_info(
    student_id: str,
    update_data: StudentUpdateRequest,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update student information (class, grade, seminar lab assignment). Teacher only."""
    teacher = await get_teacher_profile(db, current_user)
    fiscal_year = settings.get_current_fiscal_year()

    # Check if teacher has any student assignments
    any_relations_result = await db.execute(
        select(StudentTeacher).where(
            StudentTeacher.teacher_id == teacher.id,
            StudentTeacher.fiscal_year == fiscal_year,
            StudentTeacher.is_active == True,
        ).limit(1)
    )
    has_assignments = any_relations_result.scalar_one_or_none() is not None

    # Verify access - if teacher has assignments, they can only update assigned students
    if has_assignments:
        result = await db.execute(
            select(StudentTeacher).where(
                StudentTeacher.teacher_id == teacher.id,
                StudentTeacher.student_id == student_id,
                StudentTeacher.fiscal_year == fiscal_year,
                StudentTeacher.is_active == True,
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="この生徒の情報を更新する権限がありません")

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

    # Update class_name if provided
    if update_data.class_name is not None:
        student.class_name = update_data.class_name if update_data.class_name else None

    # Update grade if provided
    if update_data.grade is not None:
        student.grade = update_data.grade

    # Update seminar_lab_id if provided
    if update_data.seminar_lab_id is not None:
        if update_data.seminar_lab_id == "" or update_data.seminar_lab_id == "null":
            student.seminar_lab_id = None
        else:
            # Verify the seminar lab exists and is active
            lab_result = await db.execute(
                select(SeminarLab).where(SeminarLab.id == update_data.seminar_lab_id)
            )
            lab = lab_result.scalar_one_or_none()
            if not lab:
                raise HTTPException(status_code=404, detail="Seminar lab not found")
            if not lab.is_active:
                raise HTTPException(status_code=400, detail="Cannot assign to inactive seminar lab")
            student.seminar_lab_id = update_data.seminar_lab_id

    await db.commit()
    await db.refresh(student)

    # Get seminar lab name if assigned
    seminar_lab_name = None
    if student.seminar_lab_id:
        lab_result = await db.execute(
            select(SeminarLab).where(SeminarLab.id == student.seminar_lab_id)
        )
        lab = lab_result.scalar_one_or_none()
        seminar_lab_name = lab.name if lab else None

    return StudentUpdateResponse(
        id=str(student.id),
        name=user.name,
        email=user.email,
        grade=student.grade,
        class_name=student.class_name,
        seminar_lab_id=str(student.seminar_lab_id) if student.seminar_lab_id else None,
        seminar_lab_name=seminar_lab_name,
        message="生徒情報を更新しました",
    )


@router.get("/students/{student_id}/reports", response_model=List[ReportSummary])
async def get_student_reports(
    student_id: str,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """Get reports of a specific student."""
    teacher = await get_teacher_profile(db, current_user)
    fiscal_year = settings.get_current_fiscal_year()

    # Check if teacher has any student assignments
    any_relations_result = await db.execute(
        select(StudentTeacher).where(
            StudentTeacher.teacher_id == teacher.id,
            StudentTeacher.fiscal_year == fiscal_year,
            StudentTeacher.is_active == True,
        ).limit(1)
    )
    has_assignments = any_relations_result.scalar_one_or_none() is not None

    # Verify access - if teacher has no assignments, allow access to all students
    if has_assignments:
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


@router.get("/scatter-data", response_model=ScatterDataResponse)
async def get_scatter_data(
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
    fiscal_year: Optional[int] = None,
):
    """Get scatter plot data for all assigned students with ability scores.

    Optimized to use batch queries instead of N+1 pattern.
    """
    teacher = await get_teacher_profile(db, current_user)
    year = fiscal_year or settings.get_current_fiscal_year()

    # Get all abilities (7つの能力)
    result = await db.execute(
        select(Ability)
        .where(Ability.is_active == True)
        .order_by(Ability.display_order)
    )
    abilities = result.scalars().all()
    ability_info_list = [
        AbilityInfo(
            id=a.id,
            name=a.name,
            display_order=a.display_order,
        )
        for a in abilities
    ]
    ability_ids = [str(a.id) for a in abilities]

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

    # If no relations exist, get all students (fallback for teachers without assignments)
    if not relations:
        all_students_result = await db.execute(
            select(Student).options(selectinload(Student.user))
        )
        students_to_process = all_students_result.scalars().all()
    else:
        students_to_process = [rel.student for rel in relations]

    if not students_to_process:
        return ScatterDataResponse(abilities=ability_info_list, data_points=[])

    student_ids = [s.id for s in students_to_process]

    # BATCH: Get all ability scores and points for all students in one query
    ability_data_result = await db.execute(
        select(
            Report.student_id,
            ReportAbility.ability_id,
            func.count(ReportAbility.id).label('count'),
            func.sum(ReportAbility.points).label('total_points'),
        )
        .join(ReportAbility, ReportAbility.report_id == Report.id)
        .where(Report.student_id.in_(student_ids))
        .group_by(Report.student_id, ReportAbility.ability_id)
    )

    # Build nested map: student_id -> ability_id -> {count, points}
    student_ability_data = defaultdict(lambda: defaultdict(lambda: {'count': 0, 'points': 0}))
    for row in ability_data_result.all():
        student_ability_data[row[0]][str(row[1])] = {
            'count': int(row[2] or 0),
            'points': int(row[3] or 0),
        }

    # Build response
    data_points = []
    for student in students_to_process:
        user = student.user
        if not user:
            continue

        # Initialize with zeros for all abilities
        ability_scores = {aid: 0 for aid in ability_ids}
        ability_points = {aid: 0 for aid in ability_ids}

        # Fill in actual values
        student_data = student_ability_data.get(student.id, {})
        for ability_id, data in student_data.items():
            ability_scores[ability_id] = data['count']
            ability_points[ability_id] = data['points']

        data_points.append(ScatterDataPoint(
            student_id=student.id,
            student_name=user.name,
            grade=student.grade,
            class_name=student.class_name,
            ability_scores=ability_scores,
            ability_points=ability_points,
        ))

    return ScatterDataResponse(
        abilities=ability_info_list,
        data_points=data_points,
    )
