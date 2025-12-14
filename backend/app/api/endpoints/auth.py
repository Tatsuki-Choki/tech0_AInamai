from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
import logging
import traceback
import base64
import urllib.parse

from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.models import User
from app.schemas.auth import GoogleAuthRequest, TokenResponse, UserResponse, PasswordLoginRequest
from app.services.auth import authenticate_with_google, authenticate_with_password

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Frontend URL for redirect after OAuth (from environment variable)


@router.get("/google/login")
async def google_login(role: str = "student"):
    """Get Google OAuth login URL with role in state."""
    import base64
    state = base64.urlsafe_b64encode(f"role={role}".encode()).decode()
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
        "&access_type=offline"
        "&prompt=consent"
        f"&state={state}"
    )
    return {"auth_url": google_auth_url}


@router.get("/google/callback")
async def google_callback_get(
    code: str = Query(...),
    state: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback (GET redirect from Google)."""
    try:
        # Decode role from state
        requested_role = "student"
        if state:
            try:
                decoded_state = base64.urlsafe_b64decode(state).decode()
                if decoded_state.startswith("role="):
                    requested_role = decoded_state.split("=")[1]
            except Exception:
                pass

        result = await authenticate_with_google(
            db=db,
            code=code,
            redirect_uri=settings.GOOGLE_REDIRECT_URI,
            requested_role=requested_role,
        )

        # Redirect to frontend with token
        redirect_url = f"{settings.FRONTEND_URL}/auth/callback?token={result.access_token}&role={requested_role}"
        return RedirectResponse(url=redirect_url)

    except httpx.HTTPStatusError as e:
        logger.error(f"Google HTTP error: {e.response.text}")
        logger.error(traceback.format_exc())
        error_msg = urllib.parse.quote(f"Google認証に失敗しました: {e.response.text}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error={error_msg}")
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        logger.error(traceback.format_exc())
        error_msg = urllib.parse.quote(f"認証に失敗しました: {str(e)}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error={error_msg}")


@router.post("/google/callback", response_model=TokenResponse)
async def google_callback_post(
    request: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback (POST from frontend)."""
    try:
        result = await authenticate_with_google(
            db=db,
            code=request.code,
            redirect_uri=request.redirect_uri,
            requested_role=request.requested_role,
        )
        return result
    except httpx.HTTPStatusError as e:
        logger.error(f"Google HTTP error: {e.response.text}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to authenticate with Google: {e.response.text}",
        )
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        logger.error(traceback.format_exc())
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


@router.post("/login", response_model=TokenResponse)
async def password_login(
    request: PasswordLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user with email and password (for test accounts)."""
    result = await authenticate_with_password(
        db=db,
        email=request.email,
        password=request.password,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
        )

    return result
