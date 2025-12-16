"""Teacher-specific theme management endpoints."""
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_current_teacher
from app.models import User, Student, ResearchTheme, ThemeStatus
from app.schemas.research import (
    ResearchThemeCreate,
    ResearchThemeUpdate,
    ResearchThemeResponse,
)

router = APIRouter(prefix="/teacher/themes", tags=["Teacher Theme Management"])


@router.get("/", response_model=List[ResearchThemeResponse])
async def get_all_themes(
    current_user: User = Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
    fiscal_year: Optional[int] = None,
    student_id: Optional[str] = None,
):
    """Get all research themes (teacher view). Can filter by fiscal year or student."""
    query = select(ResearchTheme)

    if fiscal_year:
        query = query.where(ResearchTheme.fiscal_year == fiscal_year)

    if student_id:
        query = query.where(ResearchTheme.student_id == student_id)

    query = query.order_by(ResearchTheme.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/student/{student_id}", response_model=List[ResearchThemeResponse])
async def get_student_themes(
    student_id: str,
    current_user: User = Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    """Get all themes for a specific student."""
    # Verify student exists
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    result = await db.execute(
        select(ResearchTheme)
        .where(ResearchTheme.student_id == student_id)
        .order_by(ResearchTheme.created_at.desc())
    )
    return result.scalars().all()


@router.post("/student/{student_id}", response_model=ResearchThemeResponse, status_code=status.HTTP_201_CREATED)
async def create_theme_for_student(
    student_id: str,
    theme_data: ResearchThemeCreate,
    current_user: User = Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    """Create a new research theme for a student (teacher action)."""
    # Verify student exists
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    fiscal_year = theme_data.fiscal_year or settings.get_current_fiscal_year()

    # Check if theme already exists for this fiscal year
    result = await db.execute(
        select(ResearchTheme).where(
            ResearchTheme.student_id == student_id,
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
        student_id=student_id,
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


@router.put("/{theme_id}", response_model=ResearchThemeResponse)
async def update_theme(
    theme_id: UUID,
    update_data: ResearchThemeUpdate,
    current_user: User = Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    """Update a research theme (teacher action)."""
    result = await db.execute(
        select(ResearchTheme).where(ResearchTheme.id == theme_id)
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


@router.delete("/{theme_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_theme(
    theme_id: UUID,
    current_user: User = Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    """Delete a research theme (teacher action)."""
    result = await db.execute(
        select(ResearchTheme).where(ResearchTheme.id == theme_id)
    )
    theme = result.scalar_one_or_none()

    if not theme:
        raise HTTPException(status_code=404, detail="Research theme not found")

    await db.delete(theme)
    await db.commit()
    return None
