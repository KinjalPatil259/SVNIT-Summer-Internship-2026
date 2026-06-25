"""
EquationAI — Auth Service
User registration, authentication, and JWT management.
"""

from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from app.core.exceptions import AuthenticationError, ValidationError
from app.core.logging_config import get_logger

logger = get_logger("auth_service")


def register_user(db: Session, email: str, username: str, password: str) -> User:
    """Register a new user. Raises ValidationError if email/username taken."""
    # Check email uniqueness
    if db.query(User).filter(User.email == email).first():
        raise ValidationError(f"Email '{email}' is already registered.")

    # Check username uniqueness
    if db.query(User).filter(User.username == username).first():
        raise ValidationError(f"Username '{username}' is already taken.")

    user = User(
        email=email,
        username=username,
        hashed_password=hash_password(password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info(f"New user registered: {username} ({email})")
    return user


def authenticate_user(db: Session, email: str, password: str) -> tuple:
    """
    Authenticate user by email and password.
    Returns (user, access_token) or raises AuthenticationError.
    """
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(password, user.hashed_password):
        raise AuthenticationError("Invalid email or password.")

    if not user.is_active:
        raise AuthenticationError("Account is deactivated.")

    token = create_access_token(subject=user.id, role=user.role)
    logger.info(f"User authenticated: {user.username}")

    return user, token


def get_user_by_id(db: Session, user_id: int) -> User:
    """Get a user by ID. Returns None if not found."""
    return db.query(User).filter(User.id == user_id).first()
