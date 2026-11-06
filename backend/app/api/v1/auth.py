import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.deps import get_current_user
from app.models.user import User

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=8, max_length=72)


def _token_response(user: User) -> dict:
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    }


@router.post("/register", status_code=status.HTTP_201_CREATED, summary="Register new gardener")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    if db.query(User).filter(func.lower(User.email) == email_clean).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        name=req.name,
        email=email_clean,
        role="gardener",
        password_hash=get_password_hash(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_response(user)


@router.post("/login", summary="Login and retrieve JWT token")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email_clean).first()
    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _token_response(user)

def require_admin_key(x_admin_key: str = Header(...)):
    if not secrets.compare_digest(x_admin_key, settings.INTERNAL_TOKEN):
        raise HTTPException(status_code=403, detail="Invalid admin key")


@router.get(
    "/users",
    summary="List all users (admin key required)",
    dependencies=[Depends(require_admin_key)],
)
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.email).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "has_password": bool(u.password_hash),
        }
        for u in users
    ]

class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=72)


@router.post("/reset-password", summary="Change own password (Bearer token required)")
def reset_password(
    req: ResetPasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.password_hash = get_password_hash(req.new_password)
    db.commit()
    return {"email": user.email, "status": "password updated"}


class UpdateProfileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=3, max_length=255)


@router.get("/me", summary="Get profile of currently logged-in user")
def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


@router.patch("/me", summary="Update profile (name, email) of currently logged-in user")
def update_me(
    req: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    clean_email = req.email.strip().lower()
    clean_name = req.name.strip()
    existing = db.query(User).filter(User.email == clean_email, User.id != user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already in use by another account",
        )
    user.name = clean_name
    user.email = clean_email
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }