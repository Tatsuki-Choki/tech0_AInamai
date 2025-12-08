from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.models import User
from app.schemas.auth import GoogleAuthRequest, TokenResponse, UserResponse
from app.services.auth import authenticate_with_google

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/google/login")
async def google_login():
    """Get Google OAuth login URL."""
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
        "&access_type=offline"
        "&prompt=consent"
    )
    return {"auth_url": google_auth_url}


@router.post("/google/callback", response_model=TokenResponse)
async def google_callback(
    request: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback and return JWT token."""
    try:
        result = await authenticate_with_google(
            db=db,
            code=request.code,
            redirect_uri=request.redirect_uri,
        )
        return result
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to authenticate with Google: {e.response.text}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}",
        )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Get current authenticated user information."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
        role=current_user.role,
    )


@router.post("/logout")
async def logout():
    """Logout endpoint (JWT is stateless, so just return success)."""
    return {"message": "Logged out successfully"}
