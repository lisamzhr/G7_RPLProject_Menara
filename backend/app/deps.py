"""FastAPI dependencies for database, authentication, and security."""

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.garden import Garden
from app.models.garden_member import GardenMember
from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.plant_zone import PlantZone

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

def member_garden_ids(user: User):
    """Subquery of garden ids the user belongs to. Use: Model.garden_id.in_(member_garden_ids(user))."""
    return select(GardenMember.garden_id).where(GardenMember.user_id == user.id)


def get_garden_for_member(
    db: Session, garden_id: str, user: User, owner_only: bool = False
) -> Garden:
    """Return the garden if user is a member. 404 if not a member, 403 if owner required."""
    row = (
        db.query(Garden, GardenMember.role)
        .join(GardenMember, GardenMember.garden_id == Garden.id)
        .filter(Garden.id == garden_id, GardenMember.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Garden not found")
    garden, role = row
    if owner_only and role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner access required")
    return garden

def member_zone_ids(user: User):
    """Subquery of zone ids inside gardens the user belongs to."""
    return select(PlantZone.id).where(PlantZone.garden_id.in_(member_garden_ids(user)))

def get_zone_for_member(db: Session, zone_id: str, user: User) -> PlantZone:
    zone = (
        db.query(PlantZone)
        .filter(PlantZone.id == zone_id, PlantZone.id.in_(member_zone_ids(user)))
        .first()
    )
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    return zone