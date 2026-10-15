import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.db import pool
from app.deps import get_current_user, require_role
from app.security import create_access_token, hash_password, verify_password

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=100)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


@router.post("/signup", status_code=201)
def signup(body: SignupIn):
    email = body.email.lower()
    try:
        with pool.connection() as conn:
            # The role is never taken from the request: new users are always agents.
            row = conn.execute(
                "INSERT INTO users (email, password_hash, full_name) "
                "VALUES (%s, %s, %s) ON CONFLICT (email) DO NOTHING "
                "RETURNING id, email, full_name, role",
                [email, hash_password(body.password), body.full_name],
            ).fetchone()
    except Exception:
        logger.exception("Database error during signup")
        raise HTTPException(status_code=503, detail="Database is not available. Please try again.")

    if row is None:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    return row


@router.post("/login")
def login(body: LoginIn):
    email = body.email.lower()
    try:
        with pool.connection() as conn:
            user = conn.execute(
                "SELECT id, email, full_name, role, is_active, password_hash "
                "FROM users WHERE email = %s",
                [email],
            ).fetchone()
    except Exception:
        logger.exception("Database error during login")
        raise HTTPException(status_code=503, detail="Database is not available. Please try again.")

    # Same message for a wrong email and a wrong password
    if (
        user is None
        or not user["is_active"]
        or not verify_password(body.password, user["password_hash"])
    ):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    try:
        token = create_access_token(user["id"], user["role"])
    except RuntimeError:
        logger.exception("Could not create a token")
        raise HTTPException(status_code=500, detail="Login is not configured on the server")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
        },
    }


@router.get("/me")
def me(user=Depends(get_current_user)):
    return user


@router.get("/users")
def list_users(admin=Depends(require_role("admin"))):
    try:
        with pool.connection() as conn:
            return conn.execute(
                "SELECT id, email, full_name, role, is_active, created_at "
                "FROM users ORDER BY id"
            ).fetchall()
    except Exception:
        logger.exception("Database error while listing users")
        raise HTTPException(status_code=503, detail="Database is not available. Please try again.")