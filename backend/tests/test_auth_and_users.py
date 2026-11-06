"""Comprehensive unit and integration tests for auth, user registration, profiles, and admin APIs."""

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User


def test_register_new_user_success(client, db_session):
    res = client.post(
        "/api/v1/auth/register",
        json={"name": "Alice Farmer", "email": "alice@urbanfarm.id", "password": "securepassword123"},
    )
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alice@urbanfarm.id"
    assert data["user"]["name"] == "Alice Farmer"


def test_register_duplicate_email_conflict(client, db_session):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Bob Farmer", "email": "bob@urbanfarm.id", "password": "password1234"},
    )
    res = client.post(
        "/api/v1/auth/register",
        json={"name": "Bob Duplicate", "email": "bob@urbanfarm.id", "password": "password1234"},
    )
    assert res.status_code == 409
    assert "already registered" in res.json()["detail"].lower()


def test_register_short_password_validation(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"name": "Short Pass", "email": "short@urbanfarm.id", "password": "123"},
    )
    assert res.status_code == 422


def test_login_success(client, db_session):
    # Seed user with password
    user = User(
        name="Login User",
        email="login@urbanfarm.id",
        role="gardener",
        password_hash=get_password_hash("mypassword123"),
    )
    db_session.add(user)
    db_session.commit()

    res = client.post(
        "/api/v1/auth/login",
        json={"email": "login@urbanfarm.id", "password": "mypassword123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["name"] == "Login User"


def test_login_wrong_password(client, db_session):
    user = User(
        name="Wrong Pass User",
        email="wrongpass@urbanfarm.id",
        role="gardener",
        password_hash=get_password_hash("correctpass123"),
    )
    db_session.add(user)
    db_session.commit()

    res = client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpass@urbanfarm.id", "password": "incorrectpassword"},
    )
    assert res.status_code == 401
    assert "invalid email or password" in res.json()["detail"].lower()


def test_login_nonexistent_user(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@urbanfarm.id", "password": "anypassword"},
    )
    assert res.status_code == 401


def test_reset_password_success(client, db_session):
    # client is already authenticated with test user from conftest
    user = db_session.query(User).filter(User.email == "test@garden.id").first()
    assert user is not None

    res = client.post(
        "/api/v1/auth/reset-password",
        json={"new_password": "newsecretpassword123"},
    )
    assert res.status_code == 200
    assert "updated" in res.json().get("status", "").lower()

    # Verify new password works
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "test@garden.id", "password": "newsecretpassword123"},
    )
    assert login_res.status_code == 200


def test_reset_password_unauthorized():
    from fastapi.testclient import TestClient
    from app.main import app

    unauthed = TestClient(app)
    res = unauthed.post(
        "/api/v1/auth/reset-password",
        json={"new_password": "newpassword123"},
    )
    assert res.status_code == 401


def test_get_my_profile_me(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "test@garden.id"
    assert data["name"] == "Test Gardener"
    assert data["role"] == "gardener"


def test_patch_my_profile_me(client, db_session):
    res = client.patch(
        "/api/v1/auth/me",
        json={"name": "Updated Gardener Name", "email": "updated.test@garden.id"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Updated Gardener Name"
    assert data["email"] == "updated.test@garden.id"

    # Confirm in database
    user = db_session.query(User).filter(User.email == "updated.test@garden.id").first()
    assert user is not None
    assert user.name == "Updated Gardener Name"


def test_patch_my_profile_duplicate_email(client, db_session):
    other = User(name="Other", email="other@garden.id", role="gardener")
    db_session.add(other)
    db_session.commit()

    res = client.patch(
        "/api/v1/auth/me",
        json={"name": "My Name", "email": "other@garden.id"},
    )
    assert res.status_code == 409
    assert "already in use" in res.json()["detail"].lower()


def test_admin_list_users_with_key(client, db_session):
    res = client.get(
        "/api/v1/auth/users",
        headers={"x-admin-key": settings.INTERNAL_TOKEN},
    )
    assert res.status_code == 200
    users = res.json()
    assert isinstance(users, list)
    assert len(users) >= 1
    # Security invariant: password_hash must never be in user listing
    for u in users:
        assert "password" not in u
        assert "password_hash" not in u


def test_admin_list_users_missing_or_invalid_key(client):
    res_missing = client.get("/api/v1/auth/users")
    assert res_missing.status_code == 422

    res_invalid = client.get(
        "/api/v1/auth/users",
        headers={"x-admin-key": "invalid-admin-key-xyz"},
    )
    assert res_invalid.status_code == 403
