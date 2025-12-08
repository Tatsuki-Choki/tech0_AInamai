from typing import List, Optional
from uuid import UUID
from datetime import date, datetime
from calendar import monthrange

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_current_user, get_current_student
from app.models import (
    User, Student, Report, ReportAbility, ResearchTheme,
    ResearchPhase, Ability, StreakRecord
)
from app.schemas.analysis import (
    ReportAnalyzeRequest,
    ReportAnalyzeResponse,
    CapabilityScore,
    CalendarResponse,
    CalendarDateEntry,
    ReportSummaryResponse,
    CapabilitySummary,
    BadgeInfo,
)
from app.services.analysis import analyze_report_content, calculate_badges

router = APIRouter(prefix="/reports", tags=["Report Analysis"])


async def get_student_from_user(db: AsyncSession, user: User) -> Student:
    """Helper to get student profile from user."""
    result = await db.execute(
        select(Student).where(Student.user_id == user.id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


@router.post("/analyze", response_model=ReportAnalyzeResponse)
async def analyze_report(
    request: ReportAnalyzeRequest,
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """
    報告内容をAIで分析し、フェーズと能力を提案する。
    ※報告の保存前に呼び出し、プレビュー表示用。
    """
    # テーマ情報を取得（あれば）
    theme_title = None
    if request.theme_id:
        result = await db.execute(
            select(ResearchTheme).where(ResearchTheme.id == request.theme_id)
        )
        theme = result.scalar_one_or_none()
        if theme:
            theme_title = theme.title

    # AI分析実行
    suggested_phase, abilities_list, ai_comment = await analyze_report_content(
        content=request.content,
        theme_title=theme_title,
    )

    # フェーズIDを取得
    suggested_phase_id = None
    if suggested_phase:
        result = await db.execute(
            select(ResearchPhase).where(ResearchPhase.name == suggested_phase)
        )
        phase = result.scalar_one_or_none()
        if phase:
            suggested_phase_id = phase.id

    # 能力情報をDBから取得してマッピング
    result = await db.execute(select(Ability).where(Ability.is_active == True))
    all_abilities = {a.name: a for a in result.scalars().all()}

    suggested_abilities = []
    for ab in abilities_list:
        ability_name = ab.get("name", "")
        if ability_name in all_abilities:
            ability = all_abilities[ability_name]
            suggested_abilities.append(CapabilityScore(
                id=ability.id,
                name=ability.name,
                score=min(100, max(0, ab.get("score", 50))),
                description=ab.get("reason"),
            ))

    return ReportAnalyzeResponse(
        suggested_phase=suggested_phase,
        suggested_phase_id=suggested_phase_id,
        suggested_abilities=suggested_abilities,
        ai_comment=ai_comment,
    )


@router.get("/calendar", response_model=CalendarResponse)
async def get_report_calendar(
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
    year: Optional[int] = None,
    month: Optional[int] = None,
):
    """
    カレンダー表示用の報告済み日付リストを取得。
    """
    student = await get_student_from_user(db, current_user)

    # デフォルトは現在の年月
    now = datetime.now()
    target_year = year or now.year
    target_month = month or now.month

    # 月の初日と末日
    _, last_day = monthrange(target_year, target_month)
    start_date = date(target_year, target_month, 1)
    end_date = date(target_year, target_month, last_day)

    # 日付ごとの報告数を集計
    result = await db.execute(
        select(
            func.date(Report.reported_at).label("report_date"),
            func.count(Report.id).label("count")
        )
        .where(
            Report.student_id == student.id,
            func.date(Report.reported_at) >= start_date,
            func.date(Report.reported_at) <= end_date,
        )
        .group_by(func.date(Report.reported_at))
    )
    rows = result.all()

    dates = [
        CalendarDateEntry(date=row.report_date, report_count=row.count)
        for row in rows
    ]

    return CalendarResponse(
        dates=dates,
        year=target_year,
        month=target_month,
    )


@router.get("/summary", response_model=ReportSummaryResponse)
async def get_report_summary(
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
    fiscal_year: Optional[int] = None,
):
    """
    振り返りサマリーデータを取得（レーダーチャート用）。
    """
    student = await get_student_from_user(db, current_user)
    year = fiscal_year or settings.get_current_fiscal_year()

    # 総報告数
    result = await db.execute(
        select(func.count(Report.id)).where(Report.student_id == student.id)
    )
    total_reports = result.scalar() or 0

    # 継続記録
    result = await db.execute(
        select(StreakRecord).where(StreakRecord.student_id == student.id)
    )
    streak = result.scalar_one_or_none()
    current_streak = streak.current_streak if streak else 0
    max_streak = streak.max_streak if streak else 0

    # 能力別カウント
    result = await db.execute(
        select(Ability.id, Ability.name, func.count(ReportAbility.id))
        .outerjoin(ReportAbility, ReportAbility.ability_id == Ability.id)
        .outerjoin(Report, Report.id == ReportAbility.report_id)
        .where(Ability.is_active == True)
        .group_by(Ability.id, Ability.name)
        .order_by(Ability.display_order)
    )
    ability_rows = result.all()

    # 合計カウント
    total_ability_count = sum(row[2] or 0 for row in ability_rows)

    capabilities = []
    ability_counts = {}
    for ability_id, ability_name, count in ability_rows:
        count = count or 0
        ability_counts[ability_name] = count
        percentage = int((count / total_ability_count * 100) if total_ability_count > 0 else 0)
        capabilities.append(CapabilitySummary(
            id=ability_id,
            name=ability_name,
            count=count,
            percentage=percentage,
        ))

    # フェーズ別分布
    result = await db.execute(
        select(ResearchPhase.name, func.count(Report.id))
        .outerjoin(Report, Report.phase_id == ResearchPhase.id)
        .where(ResearchPhase.is_active == True)
        .group_by(ResearchPhase.name, ResearchPhase.display_order)
        .order_by(ResearchPhase.display_order)
    )
    phase_rows = result.all()
    phase_distribution = {name: count or 0 for name, count in phase_rows}

    # バッジ計算
    badges_data = calculate_badges(
        total_reports=total_reports,
        current_streak=current_streak,
        max_streak=max_streak,
        ability_counts=ability_counts,
    )
    badges = [BadgeInfo(**b) for b in badges_data]

    return ReportSummaryResponse(
        total_reports=total_reports,
        current_streak=current_streak,
        max_streak=max_streak,
        capabilities=capabilities,
        badges=badges,
        phase_distribution=phase_distribution,
    )


@router.get("/by-date/{report_date}")
async def get_reports_by_date(
    report_date: date,
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """
    特定の日付の報告を取得。
    """
    student = await get_student_from_user(db, current_user)

    result = await db.execute(
        select(Report)
        .options(
            selectinload(Report.phase),
            selectinload(Report.selected_abilities).selectinload(ReportAbility.ability),
        )
        .where(
            Report.student_id == student.id,
            func.date(Report.reported_at) == report_date,
        )
        .order_by(Report.reported_at.desc())
    )
    reports = result.scalars().all()

    return [
        {
            "id": r.id,
            "content": r.content,
            "phase": r.phase.name if r.phase else None,
            "abilities": [ra.ability.name for ra in r.selected_abilities],
            "ai_comment": r.ai_comment,
            "reported_at": r.reported_at.isoformat(),
        }
        for r in reports
    ]
