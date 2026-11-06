"""Gardens router: access is by membership."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, get_garden_for_member
from app.models.garden import Garden
from app.models.garden_member import GardenMember
from app.models.plant_zone import PlantZone
from app.models.user import User
from app.schemas.gardens import AddMemberRequest, GardenCreate, GardenOut, MemberOut
from app.schemas.zones import CategoryOut, ZoneOut

router = APIRouter()


@router.get("", response_model=list[GardenOut], summary="List gardens I belong to")
def list_gardens(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Garden)
        .join(GardenMember, GardenMember.garden_id == Garden.id)
        .filter(GardenMember.user_id == current_user.id)
        .order_by(Garden.name)
        .all()
    )


@router.post(
    "",
    response_model=GardenOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a garden (you become its owner)",
)
def create_garden(
    req: GardenCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    garden = Garden(user_id=current_user.id, **req.model_dump())
    db.add(garden)
    db.flush()
    db.add(GardenMember(garden_id=garden.id, user_id=current_user.id, role="owner"))
    db.commit()
    db.refresh(garden)
    return garden


@router.get("/{id}/zones", response_model=list[ZoneOut], summary="List plant zones in garden")
def list_garden_zones(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    garden = get_garden_for_member(db, id, current_user)
    zones = db.query(PlantZone).filter(PlantZone.garden_id == garden.id).all()
    result = []
    for z in zones:
        result.append(
            ZoneOut(
                id=z.id,
                garden_id=z.garden_id,
                category=CategoryOut(
                    id=z.category.id,
                    key=z.category.key,
                    name=z.category.name,
                    response_timescale=z.category.response_timescale,
                ),
                label=z.label,
                plant_names=z.plant_names if isinstance(z.plant_names, list) else [],
                created_at=z.created_at,
            )
        )
    return result


@router.get("/{id}/members", response_model=list[MemberOut], summary="List garden members")
def list_members(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    garden = get_garden_for_member(db, id, current_user)
    rows = (
        db.query(User, GardenMember.role)
        .join(GardenMember, GardenMember.user_id == User.id)
        .filter(GardenMember.garden_id == garden.id)
        .order_by(User.name)
        .all()
    )
    return [MemberOut(user_id=u.id, name=u.name, email=u.email, role=r) for u, r in rows]


@router.post(
    "/{id}/members",
    response_model=MemberOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a registered user to the garden (owner only)",
)
def add_member(
    id: str,
    req: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    garden = get_garden_for_member(db, id, current_user, owner_only=True)
    email = req.email.strip().lower()
    target = db.query(User).filter(func.lower(User.email) == email).first()
    if not target:
        raise HTTPException(status_code=404, detail="No registered user with that email")
    if db.query(GardenMember).filter_by(garden_id=garden.id, user_id=target.id).first():
        raise HTTPException(status_code=409, detail="User is already a member")
    db.add(GardenMember(garden_id=garden.id, user_id=target.id, role="member"))
    db.commit()
    return MemberOut(user_id=target.id, name=target.name, email=target.email, role="member")


@router.delete(
    "/{id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a member (owner), or leave the garden (yourself)",
)
def remove_member(
    id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    garden = get_garden_for_member(db, id, current_user)
    member = db.query(GardenMember).filter_by(garden_id=garden.id, user_id=user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "owner":
        raise HTTPException(status_code=400, detail="The owner cannot be removed")
    requester_is_owner = (
        db.query(GardenMember)
        .filter_by(garden_id=garden.id, user_id=current_user.id, role="owner")
        .first()
        is not None
    )
    if not requester_is_owner and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Owner access required")
    db.delete(member)
    db.commit()