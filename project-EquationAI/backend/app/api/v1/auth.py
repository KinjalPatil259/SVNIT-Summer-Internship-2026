"""
EquationAI — Auth Routes
User registration, login, and profile endpoints.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserProfile
from app.services import auth_service
from app.api.deps import require_auth
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    user = auth_service.register_user(
        db=db,
        email=request.email,
        username=request.username,
        password=request.password,
    )
    _, token = auth_service.authenticate_user(db=db, email=request.email, password=request.password)

    return TokenResponse(
        access_token=token,
        user=UserProfile(
            id=user.id,
            email=user.email,
            username=user.username,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate and receive a JWT access token."""
    user, token = auth_service.authenticate_user(
        db=db,
        email=request.email,
        password=request.password,
    )

    return TokenResponse(
        access_token=token,
        user=UserProfile(
            id=user.id,
            email=user.email,
            username=user.username,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
        ),
    )


@router.get("/me", response_model=UserProfile)
async def get_profile(user: User = Depends(require_auth)):
    """Get the current authenticated user's profile."""
    return UserProfile(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
    )
