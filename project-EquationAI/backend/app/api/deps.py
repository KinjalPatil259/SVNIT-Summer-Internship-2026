"""
EquationAI — API Dependencies
Shared dependency injection for database sessions and authentication.
"""

from typing import Optional
from fastapi import Depends, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_access_token
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.models.user import User
from app.core.logging_config import get_logger

logger = get_logger("deps")


async def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Optional auth dependency — returns User if valid token provided, None otherwise.
    Use this for endpoints that work for both authenticated and anonymous users.
    """
    if not authorization:
        return None

    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    token = parts[1]
    payload = decode_access_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user = db.query(User).filter(User.id == int(user_id)).first()
    return user


async def require_auth(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """
    Required auth dependency — raises 401 if no valid token.
    Use this for protected endpoints.
    """
    if not authorization:
        raise AuthenticationError("Authorization header is required.")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AuthenticationError("Invalid authorization header format. Use: Bearer <token>")

    token = parts[1]
    payload = decode_access_token(token)
    if not payload:
        raise AuthenticationError("Invalid or expired access token.")

    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationError("Invalid token payload.")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise AuthenticationError("User not found.")

    if not user.is_active:
        raise AuthenticationError("Account is deactivated.")

    return user


async def require_admin(user: User = Depends(require_auth)) -> User:
    """
    Admin-only dependency — raises 403 if user is not an admin.
    """
    if user.role != "admin":
        raise AuthorizationError("Admin access required.")
    return user
