from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.models import User, Ability, ResearchPhase
from app.schemas.research import AbilityResponse, ResearchPhaseResponse

router = APIRouter(prefix="/master", tags=["Master Data"])


@router.get("/abilities", response_model=List[AbilityResponse])
async def get_abilities(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all active abilities."""
    result = await db.execute(
        select(Ability)
        .where(Ability.is_active == True)
        .order_by(Ability.display_order)
    )
    return result.scalars().all()


@router.get("/abilities/{ability_id}", response_model=AbilityResponse)
async def get_ability(
    ability_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific ability."""
    result = await db.execute(
        select(Ability).where(Ability.id == ability_id)
    )
    ability = result.scalar_one_or_none()

    if not ability:
        raise HTTPException(status_code=404, detail="Ability not found")

    return ability


@router.get("/research-phases", response_model=List[ResearchPhaseResponse])
async def get_research_phases(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all active research phases."""
    result = await db.execute(
        select(ResearchPhase)
        .where(ResearchPhase.is_active == True)
        .order_by(ResearchPhase.display_order)
    )
    return result.scalars().all()


@router.get("/research-phases/{phase_id}", response_model=ResearchPhaseResponse)
async def get_research_phase(
    phase_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific research phase."""
    result = await db.execute(
        select(ResearchPhase).where(ResearchPhase.id == phase_id)
    )
    phase = result.scalar_one_or_none()

    if not phase:
        raise HTTPException(status_code=404, detail="Research phase not found")

    return phase


@router.get("/fiscal-year")
async def get_current_fiscal_year(
    current_user: User = Depends(get_current_user),
):
    """Get current fiscal year."""
    return {"fiscal_year": settings.get_current_fiscal_year()}
