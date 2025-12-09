from datetime import datetime
from typing import Optional
import uuid

import httpx
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token
from app.models import User, UserRole, Student, Teacher, StreakRecord
from app.schemas.auth import GoogleUserInfo, TokenResponse, UserResponse

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)


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
    requested_role: str = "student",
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

    # Determine role based on request
    role = UserRole.TEACHER if requested_role == "teacher" else UserRole.STUDENT

    # Create new user
    user = User(
        id=uuid.uuid4(),
        email=google_info.email,
        name=google_info.name,
        avatar_url=google_info.picture,
        google_id=google_info.id,
        role=role,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(user)
    await db.flush()

    if role == UserRole.TEACHER:
        # Create teacher profile
        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(teacher)
    else:
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
    requested_role: Optional[str] = "student",
) -> TokenResponse:
    """Authenticate user with Google OAuth code and return JWT tokens."""
    # Exchange code for Google access token
    google_access_token = await exchange_google_code(code, redirect_uri)

    # Get user info from Google
    google_info = await get_google_user_info(google_access_token)

    # Get or create user
    user = await get_or_create_user(db, google_info, requested_role or "student")

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


async def authenticate_with_password(
    db: AsyncSession,
    email: str,
    password: str,
) -> Optional[TokenResponse]:
    """Authenticate user with email and password."""
    # Find user by email
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if not user:
        return None

    # Check password
    if not user.password_hash:
        return None

    if not verify_password(password, user.password_hash):
        return None

    if not user.is_active:
        return None

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
