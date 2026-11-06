"""Tests for garden membership, role permissions, updates, and cascading deletion lifecycle."""

from app.core.security import create_access_token
from app.models.actuator import Actuator
from app.models.garden import Garden
from app.models.garden_member import GardenMember
from app.models.plant_category import PlantCategory
from app.models.plant_zone import PlantZone
from app.models.sensor_node import SensorNode
from app.models.user import User


def test_update_garden_metadata(client, db_session):
    garden = db_session.query(Garden).first()
    assert garden is not None

    res = client.patch(
        f"/api/v1/gardens/{garden.id}",
        json={
            "name": "Updated Rooftop Garden",
            "location_name": "Mega Kuningan, Jakarta",
            "adm4_code": "31.74.02.1002",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Updated Rooftop Garden"
    assert data["location_name"] == "Mega Kuningan, Jakarta"
    assert data["adm4_code"] == "31.74.02.1002"


def test_update_garden_forbidden_for_non_owner(client, db_session):
    garden = db_session.query(Garden).first()
    other_user = User(name="Regular Member", email="member@garden.id", role="gardener")
    db_session.add(other_user)
    db_session.commit()

    # Add as regular member (not owner)
    member_link = GardenMember(garden_id=garden.id, user_id=other_user.id, role="member")
    db_session.add(member_link)
    db_session.commit()

    # Authenticate as other_user
    token = create_access_token({"sub": other_user.id, "email": other_user.email, "role": other_user.role})
    res = client.patch(
        f"/api/v1/gardens/{garden.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Hacked Name"},
    )
    assert res.status_code == 403
    assert "owner access required" in res.json()["detail"].lower()


def test_garden_members_listing_and_invite(client, db_session):
    garden = db_session.query(Garden).first()

    # Create user to invite
    invitee = User(name="Invitee", email="invitee@garden.id", role="gardener")
    db_session.add(invitee)
    db_session.commit()

    # List members before
    res_list = client.get(f"/api/v1/gardens/{garden.id}/members")
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1

    # Invite member
    res_invite = client.post(
        f"/api/v1/gardens/{garden.id}/members",
        json={"email": "invitee@garden.id", "role": "member"},
    )
    assert res_invite.status_code == 201
    assert res_invite.json()["email"] == "invitee@garden.id"
    assert res_invite.json()["role"] == "member"

    # Duplicate invite should be 409
    res_dup = client.post(
        f"/api/v1/gardens/{garden.id}/members",
        json={"email": "invitee@garden.id", "role": "member"},
    )
    assert res_dup.status_code == 409

    # Unknown email should be 404
    res_unknown = client.post(
        f"/api/v1/gardens/{garden.id}/members",
        json={"email": "nonexistent@garden.id", "role": "member"},
    )
    assert res_unknown.status_code == 404


def test_garden_member_removal_and_constraints(client, db_session):
    garden = db_session.query(Garden).first()
    owner = db_session.query(User).filter(User.email == "test@garden.id").first()

    member_user = User(name="To Remove", email="remove@garden.id", role="gardener")
    db_session.add(member_user)
    db_session.commit()

    link = GardenMember(garden_id=garden.id, user_id=member_user.id, role="member")
    db_session.add(link)
    db_session.commit()

    # Owner cannot be removed
    res_owner_del = client.delete(f"/api/v1/gardens/{garden.id}/members/{owner.id}")
    assert res_owner_del.status_code == 400
    assert "owner cannot be removed" in res_owner_del.json()["detail"].lower()

    # Remove regular member -> 204
    res_del = client.delete(f"/api/v1/gardens/{garden.id}/members/{member_user.id}")
    assert res_del.status_code == 204

    # Remove non-member -> 404
    res_del_again = client.delete(f"/api/v1/gardens/{garden.id}/members/{member_user.id}")
    assert res_del_again.status_code == 404


def test_delete_garden_cascades_complete_hierarchy(client, db_session):
    # Setup full hierarchy: Garden -> Zone -> Node & Actuator
    current_user = db_session.query(User).filter(User.email == "test@garden.id").first()
    assert current_user is not None

    cat = db_session.query(PlantCategory).first()
    new_garden = Garden(
        user_id=current_user.id,
        name="Cascade Test Garden",
        location_name="Rooftop B",
        lat=-6.18,
        lon=106.82,
        adm4_code="31.71.06.1001",
    )
    db_session.add(new_garden)
    db_session.commit()

    membership = GardenMember(garden_id=new_garden.id, user_id=current_user.id, role="owner")
    db_session.add(membership)
    db_session.commit()

    zone = PlantZone(garden_id=new_garden.id, category_id=cat.id, label="Cascade Zone")
    db_session.add(zone)
    db_session.commit()

    node = SensorNode(id="node-cascade-test", zone_id=zone.id, api_key_hash="hash123")
    actuator = Actuator(zone_id=zone.id, type="mister", driver="relay")
    db_session.add_all([node, actuator])
    db_session.commit()

    # Delete garden via API
    res = client.delete(f"/api/v1/gardens/{new_garden.id}")
    assert res.status_code == 204

    # Verify everything cascaded cleanly
    assert db_session.query(Garden).filter(Garden.id == new_garden.id).first() is None
    assert db_session.query(PlantZone).filter(PlantZone.garden_id == new_garden.id).first() is None
    assert db_session.query(SensorNode).filter(SensorNode.id == "node-cascade-test").first() is None
    assert db_session.query(Actuator).filter(Actuator.zone_id == zone.id).first() is None
    assert db_session.query(GardenMember).filter(GardenMember.garden_id == new_garden.id).first() is None
