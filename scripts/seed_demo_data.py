"""Seed script for RoofGarden database: categories, profiles, demo garden, zones, nodes, and past 24h telemetry."""

import random
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Add backend and ai to path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"
ai_dir = root_dir / "ai"
sys.path.append(str(backend_dir))
sys.path.append(str(ai_dir))

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_api_key
from app.models.actuator import Actuator
from app.models.garden import Garden
from app.models.plant_category import PlantCategory
from app.models.plant_zone import PlantZone
from app.models.recommendation import Recommendation
from app.models.sensor_node import SensorNode
from app.models.sensor_reading import SensorReading
from app.models.threshold_profile import ThresholdProfile
from app.models.user import User


def seed_database():
    print("[Seed] Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Demo User
        user = db.query(User).filter(User.email == "gardener@jakarta-roofs.id").first()
        if not user:
            user = User(
                name="Siti Rahmawati",
                email="gardener@jakarta-roofs.id",
                role="gardener",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"[Seed] Created demo user: {user.name}")

        # 2. Categories & Literature Threshold Profiles
        categories_data = [
            {
                "key": "leafy",
                "name": "Leafy Vegetables",
                "response_timescale": "days",
                "moisture_min": 76.0,
                "moisture_max": 98.0,
                "temp_min": 22.0,
                "temp_max": 27.0,
                "humidity_min": 60.0,
                "humidity_max": 80.0,
                "lux_min": 10000.0,
                "lux_max": 20000.0,
                "source_note": "Kusumawardani & Hermawan (2021). Optimization of Automated Micro-Irrigation for Hydroponic Brassica in High-Temperature Tropical Urban Environments.",
            },
            {
                "key": "fruiting_veg",
                "name": "Fruiting Vegetables",
                "response_timescale": "days",
                "moisture_min": 50.0,
                "moisture_max": 70.0,
                "temp_min": 24.0,
                "temp_max": 28.0,
                "humidity_min": 70.0,
                "humidity_max": 85.0,
                "lux_min": 30000.0,
                "lux_max": 50000.0,
                "source_note": "Siregar & Wibowo (2020). Microclimatic Effects on Flower Abortion and Fruit Set in Tropical Containerized Capsicum Annuum.",
            },
            {
                "key": "herbs",
                "name": "Culinary Herbs",
                "response_timescale": "days",
                "moisture_min": 50.0,
                "moisture_max": 70.0,
                "temp_min": 20.0,
                "temp_max": 30.0,
                "humidity_min": 70.0,
                "humidity_max": 80.0,
                "lux_min": 15000.0,
                "lux_max": 30000.0,
                "source_note": "Lestari & Hartono (2022). Evapotranspiration Dynamics and Essential Oil Synthesis in Container-Grown Tropical Herbs.",
            },
            {
                "key": "fruit_potted",
                "name": "Potted Fruit Trees (Tabulampot)",
                "response_timescale": "weeks",
                "moisture_min": 70.0,
                "moisture_max": 100.0,
                "temp_min": 22.0,
                "temp_max": 30.0,
                "humidity_min": 50.0,
                "humidity_max": 70.0,
                "lux_min": 30000.0,
                "lux_max": 50000.0,
                "source_note": "Prasetyo & Setiawan (2019). Water Deficit Stress and Root Zone Thermal Management in Potted Fruit Trees (Tabulampot) Under Urban Heat Island Conditions. Strict floor: root damage occurs below 65% moisture.",
            },
        ]

        cat_map = {}
        for cdata in categories_data:
            cat = db.query(PlantCategory).filter(PlantCategory.key == cdata["key"]).first()
            if not cat:
                cat = PlantCategory(
                    key=cdata["key"],
                    name=cdata["name"],
                    response_timescale=cdata["response_timescale"],
                )
                db.add(cat)
                db.commit()
                db.refresh(cat)

                profile = ThresholdProfile(
                    category_id=cat.id,
                    moisture_min=cdata["moisture_min"],
                    moisture_max=cdata["moisture_max"],
                    temp_min=cdata["temp_min"],
                    temp_max=cdata["temp_max"],
                    humidity_min=cdata["humidity_min"],
                    humidity_max=cdata["humidity_max"],
                    lux_min=cdata["lux_min"],
                    lux_max=cdata["lux_max"],
                    source_note=cdata["source_note"],
                )
                db.add(profile)
                db.commit()
            cat_map[cdata["key"]] = cat

        print(f"[Seed] Verified {len(cat_map)} categories and threshold profiles.")

        # 3. Demo Garden
        garden = db.query(Garden).first()
        if not garden:
            garden = Garden(
                user_id=user.id,
                name="Menteng Rooftop Garden",
                location_name="Jakarta Pusat, DKI Jakarta",
                lat=-6.1931,
                lon=106.8242,
                elevation_m=24.5,
                adm4_code="31.71.06.1001",
            )
            db.add(garden)
            db.commit()
            db.refresh(garden)
            print(f"[Seed] Created demo garden: {garden.name}")

        # 4. Plant Zones
        zones_data = [
            {
                "label": "Zone A - Hydroponic Greens",
                "cat_key": "leafy",
                "plants": ["Pak Choy", "Caisim", "Bok Choy"],
                "node_id": "esp32-node-01",
            },
            {
                "label": "Zone B - Capsicum & Tomatoes",
                "cat_key": "fruiting_veg",
                "plants": ["Cabai Rawit", "Cherry Tomato"],
                "node_id": "esp32-node-02",
            },
            {
                "label": "Zone C - Aromatic Herbs",
                "cat_key": "herbs",
                "plants": ["Kemangi", "Peppermint", "Lemongrass"],
                "node_id": "esp32-node-03",
            },
            {
                "label": "Zone D - Citrus Tabulampot",
                "cat_key": "fruit_potted",
                "plants": ["Jeruk Limau", "Jambu Kristal"],
                "node_id": "esp32-node-04",
            },
        ]

        default_api_key = "dev-node-api-key-secret-12345"
        key_hash = hash_api_key(default_api_key)

        for zdata in zones_data:
            zone = db.query(PlantZone).filter(PlantZone.label == zdata["label"]).first()
            if not zone:
                zone = PlantZone(
                    garden_id=garden.id,
                    category_id=cat_map[zdata["cat_key"]].id,
                    label=zdata["label"],
                    plant_names=zdata["plants"],
                )
                db.add(zone)
                db.commit()
                db.refresh(zone)

                # Sensor Node
                node = SensorNode(
                    id=zdata["node_id"],
                    zone_id=zone.id,
                    api_key_hash=key_hash,
                    last_seen_at=datetime.now(UTC),
                    status="active",
                )
                db.add(node)

                # Actuator on Zone A (Sprinkler)
                if zdata["cat_key"] == "leafy":
                    sprinkler = Actuator(
                        zone_id=zone.id,
                        type="sprinkler",
                        driver="relay",
                        max_on_seconds=60,
                        min_interval_minutes=120,
                    )
                    db.add(sprinkler)

                # Initial Recommendation
                rec = Recommendation(
                    zone_id=zone.id,
                    status_level="normal",
                    message=f"{zone.label} is currently in healthy condition. Sensor metrics align with ideal parameters.",
                    reasons=["Soil moisture and ambient microclimate are well-balanced."],
                )
                db.add(rec)
                db.commit()

                # Seed past 24h readings
                now = datetime.now(UTC)
                readings = []
                for i in range(24, 0, -1):
                    reading_time = now - timedelta(hours=i)
                    # Baseline moisture around ideal
                    base_m = 80.0 if zdata["cat_key"] == "leafy" else 60.0
                    if zdata["cat_key"] == "fruit_potted":
                        base_m = 75.0

                    r = SensorReading(
                        node_id=zdata["node_id"],
                        ts=reading_time,
                        soil_moisture_pct=round(base_m + random.uniform(-3.0, 3.0), 1),
                        temperature_c=round(26.0 + random.uniform(-2.0, 4.0), 1),
                        humidity_pct=round(70.0 + random.uniform(-5.0, 8.0), 1),
                        lux=round(max(random.uniform(5000.0, 35000.0), 0.0), 0),
                        battery_v=3.95,
                        is_valid=True,
                    )
                    readings.append(r)
                db.bulk_save_objects(readings)
                db.commit()

        print("[Seed] Successfully seeded all zones, nodes, actuators, and past 24h readings.")
        print(f"[Seed] Sensor Node Default API Key: '{default_api_key}'")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
