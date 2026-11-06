from app.models.garden import Garden
from app.models.plant_zone import PlantZone


def test_get_and_update_profile(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 200
    user_data = res.json()
    assert user_data["email"] == "test@garden.id"

    # Update profile
    patch_res = client.patch(
        "/api/v1/auth/me",
        json={"name": "Updated Gardener", "email": "updated@roofgarden.id"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Updated Gardener"
    assert patch_res.json()["email"] == "updated@roofgarden.id"

    # Verify update reflected in get
    res2 = client.get("/api/v1/auth/me")
    assert res2.json()["name"] == "Updated Gardener"


def test_get_categories(client):
    res = client.get("/api/v1/gardens/categories")
    assert res.status_code == 200
    cats = res.json()
    assert len(cats) >= 1
    assert any("threshold_profile" in c for c in cats)


def test_create_and_delete_zone(client, db_session):
    garden = db_session.query(Garden).first()
    res = client.post(
        f"/api/v1/gardens/{garden.id}/zones",
        json={
            "category_key": "leafy",
            "label": "Bed Beta Test",
            "plant_names": ["Kale", "Spinach"],
        },
    )
    assert res.status_code == 201
    created_zone = res.json()
    assert created_zone["label"] == "Bed Beta Test"
    assert created_zone["plant_names"] == ["Kale", "Spinach"]
    zone_id = created_zone["id"]

    # Delete zone
    del_res = client.delete(f"/api/v1/zones/{zone_id}")
    assert del_res.status_code == 204

    # Verify deleted
    assert db_session.query(PlantZone).filter(PlantZone.id == zone_id).first() is None


def test_list_nodes(client):
    res = client.get("/api/v1/nodes")
    assert res.status_code == 200
    nodes = res.json()
    assert isinstance(nodes, list)
    assert len(nodes) >= 1
    assert "status" in nodes[0]


def test_create_and_delete_garden(client, db_session):
    # Create garden
    res = client.post(
        "/api/v1/gardens",
        json={
            "name": "Temporary Test Garden",
            "location_name": "Test Rooftop Facility",
            "lat": -6.2146,
            "lon": 106.8451,
            "elevation_m": 42.0,
            "adm4_code": "31.74.02.1001",
        },
    )
    assert res.status_code == 201
    garden_data = res.json()
    garden_id = garden_data["id"]

    # Verify present in list
    list_res = client.get("/api/v1/gardens")
    assert any(g["id"] == garden_id for g in list_res.json())

    # Delete garden
    del_res = client.delete(f"/api/v1/gardens/{garden_id}")
    assert del_res.status_code == 204

    # Verify no longer in list or db
    list_res2 = client.get("/api/v1/gardens")
    assert not any(g["id"] == garden_id for g in list_res2.json())
    assert db_session.query(Garden).filter(Garden.id == garden_id).first() is None
