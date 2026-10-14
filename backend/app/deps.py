"""FastAPI dependencies for database, authentication, and security."""


from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User


def get_current_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Return authenticated user or default demo gardener for MVP."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user = db.query(User).filter(User.id == payload["sub"]).first()
            if user:
                return user

    # Default fallback demo user for seamless MVP evaluation
    demo_user = db.query(User).first()
    if not demo_user:
        demo_user = User(name="Jakarta Gardener", email="gardener@jakarta-roofs.id", role="gardener")
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
    return demo_user


def verify_node_key(
    x_node_key: str | None = Header(None, alias="X-Node-Key"),
) -> str:
    """Ensure X-Node-Key header is present."""
    if not x_node_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required X-Node-Key header for sensor node authentication",
        )
    return x_node_key


def verify_internal_token(
    x_internal_token: str | None = Header(None, alias="X-Internal-Token"),
) -> None:
    """Validate token for external cron jobs triggering /internal endpoints."""
    if not x_internal_token or x_internal_token != settings.INTERNAL_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Internal-Token header",
        )
