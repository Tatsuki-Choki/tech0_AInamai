from datetime import datetime
from typing import Optional
import uuid

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token
from app.models import User, UserRole, Student, Teacher, StreakRecord
from app.schemas.auth import GoogleUserInfo, TokenResponse, UserResponse


GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


async def exchange_google_code(code: str, redirect_uri: Optional[str] = None) -> str:
    """Exchange Google authorization code for access token."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri or settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        response.raise_for_status()
        return response.json()["access_token"]


async def get_google_user_info(access_token: str) -> GoogleUserInfo:
    """Fetch user information from Google."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        data = response.json()
        return GoogleUserInfo(
            id=data["id"],
            email=data["email"],
            name=data.get("name", data["email"].split("@")[0]),
            picture=data.get("picture"),
        )


async def get_or_create_user(
    db: AsyncSession,
    google_info: GoogleUserInfo,
) -> User:
    """Get existing user or create new one from Google OAuth info."""
    # First, try to find by Google ID
    result = await db.execute(
        select(User).where(User.google_id == google_info.id)
    )
    user = result.scalar_one_or_none()

    if user:
        # Update user info from Google
        user.name = google_info.name
        if google_info.picture:
            user.avatar_url = google_info.picture
        user.updated_at = datetime.utcnow()
        await db.commit()
        return user

    # Try to find by email (for pre-registered users)
    result = await db.execute(
        select(User).where(User.email == google_info.email)
    )
    user = result.scalar_one_or_none()

    if user:
        # Link Google account to existing user
        user.google_id = google_info.id
        user.name = google_info.name
        if google_info.picture:
            user.avatar_url = google_info.picture
        user.updated_at = datetime.utcnow()
        await db.commit()
        return user

    # Create new user (簡易方式: デフォルトで生徒として登録)
    user = User(
        id=uuid.uuid4(),
        email=google_info.email,
        name=google_info.name,
        avatar_url=google_info.picture,
        google_id=google_info.id,
        role=UserRole.STUDENT,  # デフォルトは生徒
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(user)
    await db.flush()

    # Create student profile
    student = Student(
        id=uuid.uuid4(),
        user_id=user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(student)
    await db.flush()

    # Create streak record for new student
    streak = StreakRecord(
        id=uuid.uuid4(),
        student_id=student.id,
        current_streak=0,
        max_streak=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(streak)

    await db.commit()
    return user


async def authenticate_with_google(
    db: AsyncSession,
    code: str,
    redirect_uri: Optional[str] = None,
) -> TokenResponse:
    """Authenticate user with Google OAuth code and return JWT tokens."""
    # Exchange code for Google access token
    google_access_token = await exchange_google_code(code, redirect_uri)

    # Get user info from Google
    google_info = await get_google_user_info(google_access_token)

    # Get or create user
    user = await get_or_create_user(db, google_info)

    # Create JWT access token
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
        }
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            role=user.role,
        ),
    )
