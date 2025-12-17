from typing import List, Optional
import logging
import os
import shutil
import uuid
from uuid import UUID
from datetime import datetime, date, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File

# Japan Standard Time (UTC+9)
JST = timezone(timedelta(hours=9))
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
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
    DetectedAbility,
)
from typing import Union
from app.services.analysis import analyze_report_content

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports"])


def _get_ability_attr(item: Union[dict, DetectedAbility], attr: str, default=None):
    """Get attribute from dict or DetectedAbility object."""
    if isinstance(item, dict):
        return item.get(attr, default)
    return getattr(item, attr, default)


async def _set_report_abilities_to_three(
    db: AsyncSession,
    report: Report,
    all_abilities_ordered: List[Ability],
    detected_abilities: Optional[List[Union[dict, DetectedAbility]]] = None,
    fallback_ability_ids: Optional[List[UUID]] = None,
):
    """
    Ensure report has exactly 3 abilities with points:
    - strong: +2
    - sub: +1, +1

    Uses 'role' field from detected_abilities if available to determine strong vs sub.
    """
    detected_abilities = detected_abilities or []
    fallback_ability_ids = fallback_ability_ids or []

    # Build ability lookup by name
    name_to_ability = {a.name: a for a in all_abilities_ordered}
    id_to_ability = {str(a.id): a for a in all_abilities_ordered}

    # Separate strong and sub abilities based on 'role' field
    strong_ability: Optional[Ability] = None
    sub_abilities: List[Ability] = []

    for item in detected_abilities:
        name = _get_ability_attr(item, "name")
        if not name or name not in name_to_ability:
            continue
        ability = name_to_ability[name]
        role = _get_ability_attr(item, "role", "sub")

        # First strong ability found becomes the primary
        if role == "strong" and strong_ability is None:
            strong_ability = ability
        elif ability != strong_ability and ability not in sub_abilities:
            sub_abilities.append(ability)
            if len(sub_abilities) >= 2:
                break

    # If no strong ability found, use the first detected ability
    if strong_ability is None and detected_abilities:
        for item in detected_abilities:
            name = _get_ability_attr(item, "name")
            if name and name in name_to_ability:
                strong_ability = name_to_ability[name]
                break

    # If still no strong, use fallback or first from all abilities
    if strong_ability is None:
        for aid in fallback_ability_ids:
            a = id_to_ability.get(str(aid))
            if a:
                strong_ability = a
                break
        if strong_ability is None and all_abilities_ordered:
            strong_ability = all_abilities_ordered[0]

    # Fill sub abilities if needed
    for aid in fallback_ability_ids:
        if len(sub_abilities) >= 2:
            break
        a = id_to_ability.get(str(aid))
        if a and a != strong_ability and a not in sub_abilities:
            sub_abilities.append(a)

    for a in all_abilities_ordered:
        if len(sub_abilities) >= 2:
            break
        if a != strong_ability and a not in sub_abilities:
            sub_abilities.append(a)

    # Build final list: strong first, then subs
    picked = []
    if strong_ability:
        picked.append(strong_ability)
    picked.extend(sub_abilities[:2])

    # Clear existing report abilities
    await db.execute(delete(ReportAbility).where(ReportAbility.report_id == report.id))
    await db.flush()

    now = datetime.utcnow()
    for idx, ability in enumerate(picked):
        role = "strong" if idx == 0 else "sub"
        points = STRONG_ABILITY_POINTS if idx == 0 else SUB_ABILITY_POINTS
        logger.debug(f"Setting ability '{ability.name}' with role={role}, points={points}")
        db.add(ReportAbility(
            report_id=report.id,
            ability_id=ability.id,
            role=role,
            points=points,
            created_at=now,
            updated_at=now,
        ))


async def get_student_from_user(db: AsyncSession, user: User) -> Student:
    """Helper to get student profile from user."""
    result = await db.execute(
        select(Student).where(Student.user_id == user.id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


def get_jst_today() -> date:
    """Get current date in JST (Japan Standard Time)."""
    now_utc = datetime.now(timezone.utc)
    now_jst = now_utc.astimezone(JST)
    return now_jst.date()


async def update_streak(db: AsyncSession, student_id: UUID) -> None:
    """Update streak record for student."""
    result = await db.execute(
        select(StreakRecord).where(StreakRecord.student_id == student_id)
    )
    streak = result.scalar_one_or_none()

    # Use JST for date calculations
    today_jst = get_jst_today()

    if not streak:
        # Create new streak record
        streak = StreakRecord(
            student_id=student_id,
            current_streak=1,
            max_streak=1,
            last_report_date=today_jst,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(streak)
    else:
        if streak.last_report_date:
            days_diff = (today_jst - streak.last_report_date).days
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

        streak.last_report_date = today_jst
        streak.updated_at = datetime.utcnow()


# Ability point constants
STRONG_ABILITY_POINTS = 2  # Points for the primary/strong ability
SUB_ABILITY_POINTS = 1     # Points for each sub ability

# Security constants for file upload
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB

# Magic bytes for image file verification
IMAGE_SIGNATURES = {
    b'\xff\xd8\xff': '.jpg',      # JPEG
    b'\x89PNG\r\n\x1a\n': '.png',  # PNG
    b'GIF87a': '.gif',             # GIF87a
    b'GIF89a': '.gif',             # GIF89a
    b'RIFF': '.webp',              # WebP (needs additional check)
}


def _validate_image_signature(file_content: bytes, extension: str) -> bool:
    """Validate file content matches expected image signature."""
    ext_lower = extension.lower()

    # Check JPEG
    if ext_lower in ('.jpg', '.jpeg'):
        return file_content[:3] == b'\xff\xd8\xff'

    # Check PNG
    if ext_lower == '.png':
        return file_content[:8] == b'\x89PNG\r\n\x1a\n'

    # Check GIF
    if ext_lower == '.gif':
        return file_content[:6] in (b'GIF87a', b'GIF89a')

    # Check WebP (RIFF....WEBP format)
    if ext_lower == '.webp':
        return file_content[:4] == b'RIFF' and file_content[8:12] == b'WEBP'

    return False


@router.post("/upload", response_model=dict)
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_student),
):
    """Upload an image file with security validation."""
    # 1. Validate filename exists
    if not file.filename:
        raise HTTPException(status_code=400, detail="ファイル名が必要です")

    # 2. Validate file extension (whitelist approach)
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"許可されていないファイル形式です。許可: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # 3. Read file content with size limit
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"ファイルサイズが大きすぎます。最大: {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB"
        )

    if len(file_content) == 0:
        raise HTTPException(status_code=400, detail="空のファイルはアップロードできません")

    # 4. Validate magic bytes (file signature)
    if not _validate_image_signature(file_content, file_ext):
        raise HTTPException(
            status_code=400,
            detail="ファイルの内容が拡張子と一致しません。正しい画像ファイルをアップロードしてください"
        )

    # 5. Create upload directory if not exists
    upload_dir = "static/uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    # 6. Generate safe filename (UUID prevents path traversal)
    safe_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, safe_filename)

    # 7. Save file
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)

    # Return URL
    return {"url": f"/static/uploads/{safe_filename}"}


@router.get("", response_model=List[ReportListResponse])
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


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_data: ReportCreate,
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """Create a new report."""
    student = await get_student_from_user(db, current_user)

    # Validate theme_id is provided
    if not report_data.theme_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="theme_id is required"
        )

    # Verify theme belongs to student
    result = await db.execute(
        select(ResearchTheme).where(
            ResearchTheme.id == report_data.theme_id,
            ResearchTheme.student_id == student.id,
        )
    )
    theme = result.scalar_one_or_none()
    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research theme not found or does not belong to current student"
        )

    # Verify phase if provided
    phase = None
    if report_data.phase_id:
        result = await db.execute(
            select(ResearchPhase).where(ResearchPhase.id == report_data.phase_id)
        )
        phase = result.scalar_one_or_none()
        if not phase:
            raise HTTPException(status_code=404, detail="Research phase not found")

    # Verify abilities (optional fallback if AI analysis is unavailable)
    if report_data.ability_ids:
        result = await db.execute(select(Ability).where(Ability.id.in_(report_data.ability_ids)))
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

    # Update streak
    await update_streak(db, student.id)

    # Use pre-analyzed data if provided, otherwise analyze now
    if report_data.ai_comment and report_data.detected_abilities:
        # Use pre-analyzed data from /reports/analyze endpoint
        report.ai_comment = report_data.ai_comment
        detected_abilities = report_data.detected_abilities
        suggested_phase = None  # Phase should already be set from analyze

        # Set abilities from pre-analyzed data
        all_abilities_result = await db.execute(
            select(Ability).where(Ability.is_active == True).order_by(Ability.display_order)
        )
        all_abilities_ordered = list(all_abilities_result.scalars().all())
        await _set_report_abilities_to_three(
            db=db,
            report=report,
            all_abilities_ordered=all_abilities_ordered,
            detected_abilities=detected_abilities,
            fallback_ability_ids=report_data.ability_ids,
        )
    else:
        # Analyze report and get AI comment with detected abilities
        try:
            # Get student name for personalized comment (use current_user.name since User has the name)
            student_name = current_user.name if current_user and hasattr(current_user, 'name') else None

            suggested_phase, detected_abilities, ai_comment = await analyze_report_content(
                content=report_data.content,
                theme_title=theme.title,
                student_name=student_name,
            )

            report.ai_comment = ai_comment

            # Always set exactly 3 abilities for this report (strong 1 + sub 2) and assign points
            all_abilities_result = await db.execute(
                select(Ability).where(Ability.is_active == True).order_by(Ability.display_order)
            )
            all_abilities_ordered = list(all_abilities_result.scalars().all())
            await _set_report_abilities_to_three(
                db=db,
                report=report,
                all_abilities_ordered=all_abilities_ordered,
                detected_abilities=detected_abilities,
                fallback_ability_ids=report_data.ability_ids,
            )

            # Update phase if AI detected one and user didn't specify
            if suggested_phase and not report.phase_id:
                phase_result = await db.execute(
                    select(ResearchPhase).where(ResearchPhase.name == suggested_phase)
                )
                detected_phase = phase_result.scalar_one_or_none()
                if detected_phase:
                    report.phase_id = detected_phase.id

        except Exception as e:
            # Log error but don't fail the request
            logger.exception(f"Failed to analyze report: {e}")
            report.ai_comment = None
            # Fallback: set abilities from user selection (or default) if analysis fails
            all_abilities_result = await db.execute(
                select(Ability).where(Ability.is_active == True).order_by(Ability.display_order)
            )
            all_abilities_ordered = list(all_abilities_result.scalars().all())
            await _set_report_abilities_to_three(
                db=db,
                report=report,
                all_abilities_ordered=all_abilities_ordered,
                detected_abilities=[],
                fallback_ability_ids=report_data.ability_ids,
            )

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
