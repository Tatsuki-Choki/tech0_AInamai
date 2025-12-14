from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_current_user, get_current_teacher_or_admin
from app.models import User, Ability, ResearchPhase, SeminarLab, Student, Teacher, Book
from app.schemas.research import (
    AbilityResponse,
    ResearchPhaseResponse,
    SeminarLabCreate,
    SeminarLabUpdate,
    SeminarLabResponse,
    SeminarLabListResponse,
)
from app.schemas.master import (
    BookCreate,
    BookUpdate,
    BookResponse,
)

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


# ============ Book Endpoints ============

@router.get("/books", response_model=List[BookResponse])
async def get_books(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all books."""
    result = await db.execute(
        select(Book).where(Book.is_active == True).order_by(Book.title)
    )
    return result.scalars().all()


@router.post("/books", response_model=BookResponse)
async def create_book(
    book_data: BookCreate,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new book. Teacher only."""
    new_book = Book(
        title=book_data.title,
        author=book_data.author,
        publisher=book_data.publisher,
        description=book_data.description,
        isbn=book_data.isbn,
        cover_image_url=book_data.cover_image_url,
        recommended_comment=book_data.recommended_comment,
        is_active=True,
    )
    db.add(new_book)
    await db.commit()
    await db.refresh(new_book)
    return new_book


@router.put("/books/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: UUID,
    book_data: BookUpdate,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a book."""
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
        
    for field, value in book_data.model_dump(exclude_unset=True).items():
        setattr(book, field, value)
        
    await db.commit()
    await db.refresh(book)
    return book


@router.delete("/books/{book_id}")
async def delete_book(
    book_id: UUID,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete (deactivate) a book."""
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
        
    book.is_active = False
    await db.commit()
    return {"message": "Book deactivated successfully"}


# ============ SeminarLab Endpoints ============

@router.get("/seminar-labs", response_model=List[SeminarLabListResponse])
async def get_seminar_labs(
    include_inactive: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all seminar labs with student counts."""
    query = select(SeminarLab).options(
        selectinload(SeminarLab.teacher).selectinload(Teacher.user),
        selectinload(SeminarLab.students),
    )

    if not include_inactive:
        query = query.where(SeminarLab.is_active == True)

    query = query.order_by(SeminarLab.name)
    result = await db.execute(query)
    labs = result.scalars().all()

    response = []
    for lab in labs:
        teacher_name = None
        if lab.teacher and lab.teacher.user:
            teacher_name = lab.teacher.user.name

        response.append(SeminarLabListResponse(
            id=lab.id,
            name=lab.name,
            description=lab.description,
            teacher_name=teacher_name,
            student_count=len(lab.students) if lab.students else 0,
            is_active=lab.is_active,
        ))

    return response


@router.get("/seminar-labs/{lab_id}", response_model=SeminarLabResponse)
async def get_seminar_lab(
    lab_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific seminar lab."""
    result = await db.execute(
        select(SeminarLab)
        .options(
            selectinload(SeminarLab.teacher).selectinload(Teacher.user),
            selectinload(SeminarLab.students),
        )
        .where(SeminarLab.id == lab_id)
    )
    lab = result.scalar_one_or_none()

    if not lab:
        raise HTTPException(status_code=404, detail="Seminar lab not found")

    teacher_name = None
    if lab.teacher and lab.teacher.user:
        teacher_name = lab.teacher.user.name

    return SeminarLabResponse(
        id=lab.id,
        name=lab.name,
        description=lab.description,
        teacher_id=lab.teacher_id,
        teacher_name=teacher_name,
        is_active=lab.is_active,
        student_count=len(lab.students) if lab.students else 0,
        created_at=lab.created_at,
        updated_at=lab.updated_at,
    )


@router.post("/seminar-labs", response_model=SeminarLabResponse)
async def create_seminar_lab(
    lab_data: SeminarLabCreate,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new seminar lab. Teacher only."""
    # Get teacher profile
    result = await db.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = result.scalar_one_or_none()

    new_lab = SeminarLab(
        name=lab_data.name,
        description=lab_data.description,
        teacher_id=teacher.id if teacher else None,
        is_active=True,
    )

    db.add(new_lab)
    await db.commit()
    await db.refresh(new_lab)

    teacher_name = current_user.name if teacher else None

    return SeminarLabResponse(
        id=new_lab.id,
        name=new_lab.name,
        description=new_lab.description,
        teacher_id=new_lab.teacher_id,
        teacher_name=teacher_name,
        is_active=new_lab.is_active,
        student_count=0,
        created_at=new_lab.created_at,
        updated_at=new_lab.updated_at,
    )


@router.put("/seminar-labs/{lab_id}", response_model=SeminarLabResponse)
async def update_seminar_lab(
    lab_id: UUID,
    lab_data: SeminarLabUpdate,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a seminar lab. Teacher only."""
    result = await db.execute(
        select(SeminarLab)
        .options(
            selectinload(SeminarLab.teacher).selectinload(Teacher.user),
            selectinload(SeminarLab.students),
        )
        .where(SeminarLab.id == lab_id)
    )
    lab = result.scalar_one_or_none()

    if not lab:
        raise HTTPException(status_code=404, detail="Seminar lab not found")

    # Update fields
    if lab_data.name is not None:
        lab.name = lab_data.name
    if lab_data.description is not None:
        lab.description = lab_data.description
    if lab_data.is_active is not None:
        lab.is_active = lab_data.is_active

    await db.commit()
    await db.refresh(lab)

    teacher_name = None
    if lab.teacher and lab.teacher.user:
        teacher_name = lab.teacher.user.name

    return SeminarLabResponse(
        id=lab.id,
        name=lab.name,
        description=lab.description,
        teacher_id=lab.teacher_id,
        teacher_name=teacher_name,
        is_active=lab.is_active,
        student_count=len(lab.students) if lab.students else 0,
        created_at=lab.created_at,
        updated_at=lab.updated_at,
    )


@router.delete("/seminar-labs/{lab_id}")
async def delete_seminar_lab(
    lab_id: UUID,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a seminar lab. Will fail if students are assigned."""
    result = await db.execute(
        select(SeminarLab)
        .options(selectinload(SeminarLab.students))
        .where(SeminarLab.id == lab_id)
    )
    lab = result.scalar_one_or_none()

    if not lab:
        raise HTTPException(status_code=404, detail="Seminar lab not found")

    # Check if students are assigned
    if lab.students and len(lab.students) > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete seminar lab with assigned students. Remove students first or deactivate the lab."
        )

    await db.delete(lab)
    await db.commit()

    return {"message": "Seminar lab deleted successfully"}


@router.put("/students/{student_id}/seminar-lab")
async def assign_student_to_seminar_lab(
    student_id: UUID,
    seminar_lab_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Assign or remove a student from a seminar lab. Pass null to remove assignment."""
    result = await db.execute(
        select(Student).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # If assigning to a lab, verify it exists
    if seminar_lab_id:
        lab_result = await db.execute(
            select(SeminarLab).where(SeminarLab.id == seminar_lab_id)
        )
        lab = lab_result.scalar_one_or_none()

        if not lab:
            raise HTTPException(status_code=404, detail="Seminar lab not found")

        if not lab.is_active:
            raise HTTPException(status_code=400, detail="Cannot assign to inactive seminar lab")

    student.seminar_lab_id = seminar_lab_id
    await db.commit()

    return {"message": "Student seminar lab assignment updated successfully"}
