from typing import List, Optional
import os
import shutil
import uuid
from uuid import UUID
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_current_user, get_current_student
from app.models import (
    User, Student, Report, ReportAbility, ResearchTheme,
    ResearchPhase, Ability, StreakRecord
)
from app.schemas.research import (
    ReportCreate,
    ReportUpdate,
    ReportResponse,
    ReportListResponse,
    ReportAbilityResponse,
    ResearchPhaseResponse,
    StreakRecordResponse,
)
from app.services.ai import generate_ai_comment

router = APIRouter(prefix="/reports", tags=["Reports"])


async def get_student_from_user(db: AsyncSession, user: User) -> Student:
    """Helper to get student profile from user."""
    result = await db.execute(
        select(Student).where(Student.user_id == user.id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


async def update_streak(db: AsyncSession, student_id: UUID) -> None:
    """Update streak record for student."""
    result = await db.execute(
        select(StreakRecord).where(StreakRecord.student_id == student_id)
    )
    streak = result.scalar_one_or_none()

    if not streak:
        # Create new streak record
        streak = StreakRecord(
            student_id=student_id,
            current_streak=1,
            max_streak=1,
            last_report_date=date.today(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(streak)
    else:
        today = date.today()
        if streak.last_report_date:
            days_diff = (today - streak.last_report_date).days
            if days_diff == 0:
                # Already reported today, no change
                pass
            elif days_diff == 1:
                # Consecutive day
                streak.current_streak += 1
                if streak.current_streak > streak.max_streak:
                    streak.max_streak = streak.current_streak
            else:
                # Streak broken
                streak.current_streak = 1

        else:
            streak.current_streak = 1

        streak.last_report_date = today
        streak.updated_at = datetime.utcnow()


@router.post("/upload", response_model=dict)
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_student),
):
    """Upload an image file."""
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Create upload directory if not exists
    upload_dir = "static/uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    
    # Save file
    file_ext = os.path.splitext(file.filename)[1]
    file_name = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Return URL
    return {"url": f"/static/uploads/{file_name}"}


@router.get("/", response_model=List[ReportListResponse])
async def get_reports(
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
    theme_id: Optional[UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """Get current student's reports."""
    student = await get_student_from_user(db, current_user)

    query = (
        select(Report)
        .options(
            selectinload(Report.phase),
            selectinload(Report.selected_abilities).selectinload(ReportAbility.ability),
        )
        .where(Report.student_id == student.id)
    )

    if theme_id:
        query = query.where(Report.theme_id == theme_id)

    query = query.order_by(Report.reported_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    reports = result.scalars().all()

    return [
        ReportListResponse(
            id=r.id,
            content=r.content,
            image_url=r.image_url,
            phase=ResearchPhaseResponse(
                id=r.phase.id,
                name=r.phase.name,
                display_order=r.phase.display_order,
            ) if r.phase else None,
            ability_count=len(r.selected_abilities),
            ai_comment=r.ai_comment,
            reported_at=r.reported_at,
        )
        for r in reports
    ]


@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_data: ReportCreate,
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """Create a new report."""
    student = await get_student_from_user(db, current_user)

    # Verify theme belongs to student
    result = await db.execute(
        select(ResearchTheme).where(
            ResearchTheme.id == report_data.theme_id,
            ResearchTheme.student_id == student.id,
        )
    )
    theme = result.scalar_one_or_none()
    if not theme:
        raise HTTPException(status_code=404, detail="Research theme not found")

    # Verify phase if provided
    phase = None
    if report_data.phase_id:
        result = await db.execute(
            select(ResearchPhase).where(ResearchPhase.id == report_data.phase_id)
        )
        phase = result.scalar_one_or_none()
        if not phase:
            raise HTTPException(status_code=404, detail="Research phase not found")

    # Verify abilities
    abilities = []
    if report_data.ability_ids:
        result = await db.execute(
            select(Ability).where(Ability.id.in_(report_data.ability_ids))
        )
        abilities = result.scalars().all()
        if len(abilities) != len(report_data.ability_ids):
            raise HTTPException(status_code=400, detail="Some abilities not found")

    # Create report
    report = Report(
        student_id=student.id,
        theme_id=report_data.theme_id,
        phase_id=report_data.phase_id,
        content=report_data.content,
        image_url=report_data.image_url,
        reported_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(report)
    await db.flush()

    # Create report-ability relations
    for ability in abilities:
        report_ability = ReportAbility(
            report_id=report.id,
            ability_id=ability.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(report_ability)

    # Update streak
    await update_streak(db, student.id)

    # Generate AI comment (async but we'll wait for it)
    try:
        ai_comment = await generate_ai_comment(
            content=report_data.content,
            abilities=[a.name for a in abilities],
            phase_name=phase.name if phase else None,
            theme_title=theme.title,
        )
        report.ai_comment = ai_comment
    except Exception as e:
        # Log error but don't fail the request
        print(f"Failed to generate AI comment: {e}")
        report.ai_comment = None

    await db.commit()
    await db.refresh(report)

    # Reload with relationships
    result = await db.execute(
        select(Report)
        .options(
            selectinload(Report.phase),
            selectinload(Report.selected_abilities).selectinload(ReportAbility.ability),
        )
        .where(Report.id == report.id)
    )
    report = result.scalar_one()

    return ReportResponse(
        id=report.id,
        student_id=report.student_id,
        theme_id=report.theme_id,
        content=report.content,
        image_url=report.image_url,
        phase=ResearchPhaseResponse(
            id=report.phase.id,
            name=report.phase.name,
            display_order=report.phase.display_order,
        ) if report.phase else None,
        selected_abilities=[
            ReportAbilityResponse(id=ra.ability.id, name=ra.ability.name)
            for ra in report.selected_abilities
        ],
        ai_comment=report.ai_comment,
        reported_at=report.reported_at,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.get("/streak", response_model=StreakRecordResponse)
async def get_streak(
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """Get current student's streak record."""
    student = await get_student_from_user(db, current_user)

    result = await db.execute(
        select(StreakRecord).where(StreakRecord.student_id == student.id)
    )
    streak = result.scalar_one_or_none()

    if not streak:
        return StreakRecordResponse(
            current_streak=0,
            max_streak=0,
            last_report_date=None,
        )

    return streak


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: UUID,
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific report."""
    student = await get_student_from_user(db, current_user)

    result = await db.execute(
        select(Report)
        .options(
            selectinload(Report.phase),
            selectinload(Report.selected_abilities).selectinload(ReportAbility.ability),
        )
        .where(Report.id == report_id, Report.student_id == student.id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return ReportResponse(
        id=report.id,
        student_id=report.student_id,
        theme_id=report.theme_id,
        content=report.content,
        image_url=report.image_url,
        phase=ResearchPhaseResponse(
            id=report.phase.id,
            name=report.phase.name,
            display_order=report.phase.display_order,
        ) if report.phase else None,
        selected_abilities=[
            ReportAbilityResponse(id=ra.ability.id, name=ra.ability.name)
            for ra in report.selected_abilities
        ],
        ai_comment=report.ai_comment,
        reported_at=report.reported_at,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: UUID,
    update_data: ReportUpdate,
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """Update a report."""
    student = await get_student_from_user(db, current_user)

    result = await db.execute(
        select(Report)
        .options(
            selectinload(Report.phase),
            selectinload(Report.selected_abilities).selectinload(ReportAbility.ability),
        )
        .where(Report.id == report_id, Report.student_id == student.id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if update_data.content is not None:
        report.content = update_data.content

    if update_data.image_url is not None:
        report.image_url = update_data.image_url

    if update_data.phase_id is not None:
        result = await db.execute(
            select(ResearchPhase).where(ResearchPhase.id == update_data.phase_id)
        )
        phase = result.scalar_one_or_none()
        if not phase:
            raise HTTPException(status_code=404, detail="Research phase not found")
        report.phase_id = update_data.phase_id

    if update_data.ability_ids is not None:
        # Remove existing abilities
        await db.execute(
            select(ReportAbility).where(ReportAbility.report_id == report.id)
        )
        for ra in report.selected_abilities:
            await db.delete(ra)

        # Add new abilities
        if update_data.ability_ids:
            result = await db.execute(
                select(Ability).where(Ability.id.in_(update_data.ability_ids))
            )
            abilities = result.scalars().all()
            for ability in abilities:
                report_ability = ReportAbility(
                    report_id=report.id,
                    ability_id=ability.id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(report_ability)

    report.updated_at = datetime.utcnow()
    await db.commit()

    # Reload report
    result = await db.execute(
        select(Report)
        .options(
            selectinload(Report.phase),
            selectinload(Report.selected_abilities).selectinload(ReportAbility.ability),
        )
        .where(Report.id == report.id)
    )
    report = result.scalar_one()

    return ReportResponse(
        id=report.id,
        student_id=report.student_id,
        theme_id=report.theme_id,
        content=report.content,
        image_url=report.image_url,
        phase=ResearchPhaseResponse(
            id=report.phase.id,
            name=report.phase.name,
            display_order=report.phase.display_order,
        ) if report.phase else None,
        selected_abilities=[
            ReportAbilityResponse(id=ra.ability.id, name=ra.ability.name)
            for ra in report.selected_abilities
        ],
        ai_comment=report.ai_comment,
        reported_at=report.reported_at,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: UUID,
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """Delete a report."""
    student = await get_student_from_user(db, current_user)

    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.student_id == student.id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    await db.delete(report)
    await db.commit()
