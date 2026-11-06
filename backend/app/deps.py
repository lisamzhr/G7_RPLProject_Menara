"""FastAPI dependencies for database, authentication, and security."""

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Return the authenticated user, or reject with 401."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None:
        raise unauthorized
    payload = decode_access_token(creds.credentials)
    if not payload or "sub" not in payload:
        raise unauthorized
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise unauthorized
    return user


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