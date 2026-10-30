"""Auth router supporting mock/JWT token issuance for demo gardener."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user import User

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login", summary="Login and retrieve JWT token")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Create user if demo
        user = User(name="Jakarta Gardener", email=req.email, role="gardener")
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "role": user.role},
    }
