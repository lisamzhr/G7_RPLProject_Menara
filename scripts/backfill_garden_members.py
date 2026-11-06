"""One-off: make each garden's creator an owner member.
Optional arg: email of an extra user to add as member of ALL gardens (for testing)."""
import sys

from sqlalchemy import func

import app.models  # noqa: F401
from app.core.database import get_db
from app.models.garden import Garden
from app.models.garden_member import GardenMember
from app.models.user import User

db = next(get_db())
extra = None
if len(sys.argv) > 1:
    extra = db.query(User).filter(func.lower(User.email) == sys.argv[1].strip().lower()).first()
    print("Extra user:", extra.email if extra else "NOT FOUND")

added = 0
for g in db.query(Garden).all():
    pairs = [(g.user_id, "owner")] + ([(extra.id, "member")] if extra else [])
    for uid, role in pairs:
        if not db.query(GardenMember).filter_by(garden_id=g.id, user_id=uid).first():
            db.add(GardenMember(garden_id=g.id, user_id=uid, role=role))
            added += 1
db.commit()
print(f"Added {added} memberships")