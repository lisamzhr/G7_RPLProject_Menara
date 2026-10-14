"""Test configuration and fixtures using in-memory SQLite with StaticPool."""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_api_key
from app.main import app
from app.models.garden import Garden
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
    """Override get_db dependency with test session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
