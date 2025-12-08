from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from app.models import UserRole


class UserBase(BaseModel):
    email: EmailStr
    name: str
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    role: UserRole = UserRole.STUDENT


class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class StudentProfileBase(BaseModel):
    grade: Optional[int] = None
    class_name: Optional[str] = None
    student_number: Optional[str] = None


class StudentProfileUpdate(StudentProfileBase):
    pass


class StudentProfileResponse(StudentProfileBase):
    id: UUID
    user_id: UUID

    class Config:
        from_attributes = True


class TeacherProfileBase(BaseModel):
    department: Optional[str] = None
    employee_number: Optional[str] = None


class TeacherProfileUpdate(TeacherProfileBase):
    pass


class TeacherProfileResponse(TeacherProfileBase):
    id: UUID
    user_id: UUID

    class Config:
        from_attributes = True


class StudentWithProfileResponse(BaseModel):
    id: UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    role: UserRole
    profile: Optional[StudentProfileResponse] = None

    class Config:
        from_attributes = True


class TeacherWithProfileResponse(BaseModel):
    id: UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    role: UserRole
    profile: Optional[TeacherProfileResponse] = None

    class Config:
        from_attributes = True


class RoleUpdateRequest(BaseModel):
    """Request to update user role (admin only)."""
    role: UserRole


class StudentTeacherAssignment(BaseModel):
    """Request to assign a teacher to a student."""
    teacher_id: UUID
    is_primary: bool = False
    fiscal_year: int
