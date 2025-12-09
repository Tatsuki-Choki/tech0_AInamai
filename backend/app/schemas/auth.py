from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

from app.models import UserRole


class GoogleAuthRequest(BaseModel):
    """Request for Google OAuth callback."""
    code: str
    redirect_uri: Optional[str] = None
    requested_role: Optional[str] = "student"  # student or teacher


class TokenResponse(BaseModel):
    """Response containing JWT tokens."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"


class UserResponse(BaseModel):
    """User information response."""
    id: UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    role: UserRole

    class Config:
        from_attributes = True


class GoogleUserInfo(BaseModel):
    """Google OAuth user info."""
    id: str
    email: str
    name: str
    picture: Optional[str] = None


class PasswordLoginRequest(BaseModel):
    """Request for password-based login."""
    email: str
    password: str


# Update forward reference
TokenResponse.model_rebuild()
