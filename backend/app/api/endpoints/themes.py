from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_current_user, get_current_student
from app.models import User, UserRole, Student, ResearchTheme, ThemeStatus
from app.schemas.research import (
    ResearchThemeCreate,
    ResearchThemeUpdate,
    ResearchThemeResponse,
)

router = APIRouter(prefix="/themes", tags=["Research Themes"])


async def get_student_from_user(db: AsyncSession, user: User) -> Student:
    """Helper to get student profile from user."""
    result = await db.execute(
        select(Student).where(Student.user_id == user.id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


@router.get("/", response_model=List[ResearchThemeResponse])
async def get_themes(
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
    fiscal_year: Optional[int] = None,
):
    """Get current student's research themes."""
    student = await get_student_from_user(db, current_user)

    query = select(ResearchTheme).where(ResearchTheme.student_id == student.id)
    if fiscal_year:
        query = query.where(ResearchTheme.fiscal_year == fiscal_year)

    query = query.order_by(ResearchTheme.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/current", response_model=ResearchThemeResponse)
async def get_current_theme(
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """Get current fiscal year's research theme."""
    student = await get_student_from_user(db, current_user)
    fiscal_year = settings.get_current_fiscal_year()

    result = await db.execute(
        select(ResearchTheme).where(
            ResearchTheme.student_id == student.id,
            ResearchTheme.fiscal_year == fiscal_year,
        )
    )
    theme = result.scalar_one_or_none()

    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No research theme found for current fiscal year",
        )

    return theme


@router.post("/", response_model=ResearchThemeResponse, status_code=status.HTTP_201_CREATED)
async def create_theme(
    theme_data: ResearchThemeCreate,
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """Create a new research theme."""
    student = await get_student_from_user(db, current_user)
    fiscal_year = theme_data.fiscal_year or settings.get_current_fiscal_year()

    # Check if theme already exists for this fiscal year
    result = await db.execute(
        select(ResearchTheme).where(
            ResearchTheme.student_id == student.id,
            ResearchTheme.fiscal_year == fiscal_year,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Research theme already exists for fiscal year {fiscal_year}",
        )

    theme = ResearchTheme(
        student_id=student.id,
        title=theme_data.title,
        description=theme_data.description,
        fiscal_year=fiscal_year,
        status=ThemeStatus.IN_PROGRESS,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(theme)
    await db.commit()
    await db.refresh(theme)
    return theme


@router.get("/{theme_id}", response_model=ResearchThemeResponse)
async def get_theme(
    theme_id: UUID,
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific research theme."""
    student = await get_student_from_user(db, current_user)

    result = await db.execute(
        select(ResearchTheme).where(
            ResearchTheme.id == theme_id,
            ResearchTheme.student_id == student.id,
        )
    )
    theme = result.scalar_one_or_none()

    if not theme:
        raise HTTPException(status_code=404, detail="Research theme not found")

    return theme


@router.put("/{theme_id}", response_model=ResearchThemeResponse)
async def update_theme(
    theme_id: UUID,
    update_data: ResearchThemeUpdate,
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """Update a research theme."""
    student = await get_student_from_user(db, current_user)

    result = await db.execute(
        select(ResearchTheme).where(
            ResearchTheme.id == theme_id,
            ResearchTheme.student_id == student.id,
        )
    )
    theme = result.scalar_one_or_none()

    if not theme:
        raise HTTPException(status_code=404, detail="Research theme not found")

    if update_data.title is not None:
        theme.title = update_data.title
    if update_data.description is not None:
        theme.description = update_data.description
    if update_data.status is not None:
        theme.status = update_data.status

    theme.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(theme)
    return theme
