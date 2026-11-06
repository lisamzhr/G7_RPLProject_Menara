"""Test configuration and fixtures using in-memory SQLite with StaticPool."""

import os
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.core.database as core_db
import app.core.config as core_config
from app.core.database import Base, get_db
from app.core.security import hash_api_key, create_access_token
from app.main import app
from app.models.garden import Garden
from app.models.garden_member import GardenMember
from app.models.plant_category import PlantCategory
from app.models.plant_zone import PlantZone
from app.models.sensor_node import SensorNode
from app.models.threshold_profile import ThresholdProfile
from app.models.user import User

# StaticPool preserves the same SQLite in-memory database across thread connections
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
core_db.engine = engine
app.engine = engine
import app.main as app_main
app_main.engine = engine
core_config.settings.DATABASE_URL = "sqlite:///:memory:"
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    # Seed baseline fixtures: user, category, profile, garden, zone, node
    user = User(
        name="Test Gardener",
        email="test@garden.id",
        role="gardener",
    )
    session.add(user)
    session.commit()

    cat = PlantCategory(
        key="leafy",
        name="Leafy Greens",
        response_timescale="days",
    )
    session.add(cat)
    session.commit()

    profile = ThresholdProfile(
        category_id=cat.id,
        moisture_min=76.0,
        moisture_max=98.0,
        temp_min=22.0,
        temp_max=27.0,
        humidity_min=60.0,
        humidity_max=80.0,
        lux_min=10000.0,
        lux_max=20000.0,
        source_note="Test literature citation",
    )
    session.add(profile)
    session.commit()

    garden = Garden(
        user_id=user.id,
        name="Test Jakarta Garden",
        location_name="Menteng, Jakarta Pusat",
        lat=-6.1931,
        lon=106.8242,
        elevation_m=20.0,
        adm4_code="31.71.06.1001",
    )
    session.add(garden)
    session.commit()

    member = GardenMember(
        garden_id=garden.id,
        user_id=user.id,
        role="owner",
    )
    session.add(member)
    session.commit()

    zone = PlantZone(
        garden_id=garden.id,
        category_id=cat.id,
        label="Zone 1 - Bok Choy",
        plant_names=["Bok Choy"],
    )
    session.add(zone)
    session.commit()

    node = SensorNode(
        id="esp32-node-test",
        zone_id=zone.id,
        api_key_hash=hash_api_key("valid-secret-key-123"),
        last_seen_at=datetime.now(UTC),
        status="active",
    )
    session.add(node)
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    """Create authenticated test client using the seeded gardener."""

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        user = db_session.query(User).first()

        token = create_access_token({
            "sub": user.id,
            "email": user.email,
            "role": user.role,
        })

        with TestClient(app) as test_client:
            test_client.headers.update({
                "Authorization": f"Bearer {token}"
            })
            yield test_client
    finally:
        app.dependency_overrides.clear()