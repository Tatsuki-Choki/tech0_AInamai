from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_current_user, get_current_admin, get_current_teacher_or_admin
from app.models import User, UserRole, Student, Teacher, StudentTeacher
from app.schemas.user import (
    UserResponse,
    UserUpdate,
    StudentProfileUpdate,
    StudentProfileResponse,
    TeacherProfileUpdate,
    TeacherProfileResponse,
    StudentWithProfileResponse,
    TeacherWithProfileResponse,
    RoleUpdateRequest,
    StudentTeacherAssignment,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/profile", response_model=UserResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
):
    """Get current user's profile."""
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's profile."""
    if update_data.name:
        current_user.name = update_data.name
    if update_data.avatar_url is not None:
        current_user.avatar_url = update_data.avatar_url

    current_user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/student-profile", response_model=StudentProfileResponse)
async def get_student_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's student profile."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this endpoint",
        )

    result = await db.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )

    return student


@router.put("/student-profile", response_model=StudentProfileResponse)
async def update_student_profile(
    update_data: StudentProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's student profile."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this endpoint",
        )

    result = await db.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )

    if update_data.grade is not None:
        student.grade = update_data.grade
    if update_data.class_name is not None:
        student.class_name = update_data.class_name
    if update_data.student_number is not None:
        student.student_number = update_data.student_number

    student.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(student)
    return student


@router.get("/teachers", response_model=List[TeacherWithProfileResponse])
async def get_assigned_teachers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    fiscal_year: Optional[int] = None,
):
    """Get teachers assigned to current student."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this endpoint",
        )

    # Get student profile
    result = await db.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Get assigned teachers
    year = fiscal_year or settings.get_current_fiscal_year()
    result = await db.execute(
        select(StudentTeacher)
        .options(selectinload(StudentTeacher.teacher).selectinload(Teacher.user))
        .where(
            StudentTeacher.student_id == student.id,
            StudentTeacher.fiscal_year == year,
            StudentTeacher.is_active == True,
        )
    )
    relations = result.scalars().all()

    teachers = []
    for rel in relations:
        teacher = rel.teacher
        user = teacher.user
        teachers.append(TeacherWithProfileResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            role=user.role,
            profile=TeacherProfileResponse(
                id=teacher.id,
                user_id=teacher.user_id,
                department=teacher.department,
                employee_number=teacher.employee_number,
            ),
        ))

    return teachers


@router.get("/students", response_model=List[StudentWithProfileResponse])
async def get_assigned_students(
    current_user: User = Depends(get_current_teacher_or_admin),
    db: AsyncSession = Depends(get_db),
    fiscal_year: Optional[int] = None,
):
    """Get students assigned to current teacher."""
    # Get teacher profile
    result = await db.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    # Get assigned students
    year = fiscal_year or settings.get_current_fiscal_year()
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

    students = []
    for rel in relations:
        student = rel.student
        user = student.user
        students.append(StudentWithProfileResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            role=user.role,
            profile=StudentProfileResponse(
                id=student.id,
                user_id=student.user_id,
                grade=student.grade,
                class_name=student.class_name,
                student_number=student.student_number,
            ),
        ))

    return students


# Admin endpoints
@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: UUID,
    request: RoleUpdateRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's role (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    new_role = request.role

    # Update role
    user.role = new_role
    user.updated_at = datetime.utcnow()

    # Handle profile changes
    if old_role == UserRole.STUDENT and new_role == UserRole.TEACHER:
        # Create teacher profile if not exists
        result = await db.execute(select(Teacher).where(Teacher.user_id == user.id))
        if not result.scalar_one_or_none():
            teacher = Teacher(
                user_id=user.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(teacher)

    elif old_role == UserRole.TEACHER and new_role == UserRole.STUDENT:
        # Create student profile if not exists
        result = await db.execute(select(Student).where(Student.user_id == user.id))
        if not result.scalar_one_or_none():
            student = Student(
                user_id=user.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(student)

    await db.commit()
    await db.refresh(user)
    return user


@router.get("/", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    role: Optional[UserRole] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List all users (admin only)."""
    query = select(User)
    if role:
        query = query.where(User.role == role)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
