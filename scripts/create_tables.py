import app.models  # noqa: F401
from app.core.database import Base, engine

Base.metadata.create_all(bind=engine)
print("Tables ensured")