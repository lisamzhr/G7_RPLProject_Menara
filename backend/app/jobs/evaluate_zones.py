"""Scheduled job: evaluate all zones every 15 minutes."""

import logging

from app.core.database import SessionLocal
from app.models.garden import Garden
from app.models.plant_zone import PlantZone
from app.services.ai_runner import run_evaluation_for_zone
from app.services.bmkg_client import BMKGClient

logger = logging.getLogger("roofgarden.jobs.evaluate_zones")
bmkg = BMKGClient()


def job_evaluate_all_zones():
    logger.info("Executing scheduled job: evaluate_zones")
    db = SessionLocal()
    try:
        garden = db.query(Garden).first()
        adm4 = garden.adm4_code if garden else "31.71.06.1001"
        forecast = bmkg.get_forecast_sync(db, adm4)
        rain_chance = float(forecast.get("rain_probability_pct", 20.0))

        zones = db.query(PlantZone).all()
        for zone in zones:
            run_evaluation_for_zone(db, zone, rain_chance=rain_chance)
        logger.info(
            f"Completed evaluation for {len(zones)} plant zones (BMKG rain chance: {rain_chance}%)"
        )
    except Exception as e:
        logger.error(f"Error during evaluate_zones job: {e}")
    finally:
        db.close()
