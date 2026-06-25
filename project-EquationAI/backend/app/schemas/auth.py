"""
EquationAI — Auth Schemas
Request/response models for authentication endpoints.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=6, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserProfile"


class UserProfile(BaseModel):
    id: int
    email: str
    username: str
    role: str
    is_active: bool
    created_at: str

    model_config = {"from_attributes": True}


# Resolve forward reference
TokenResponse.model_rebuild()
