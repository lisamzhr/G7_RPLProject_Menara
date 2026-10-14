"""Scheduled job: evaluate all zones every 15 minutes."""

import logging

from app.core.database import SessionLocal
from app.models.plant_zone import PlantZone
from app.services.ai_runner import run_evaluation_for_zone

logger = logging.getLogger("roofgarden.jobs.evaluate_zones")


def job_evaluate_all_zones():
    logger.info("Executing scheduled job: evaluate_zones")
    db = SessionLocal()
    try:
        zones = db.query(PlantZone).all()
        for zone in zones:
            run_evaluation_for_zone(db, zone)
        logger.info(f"Completed evaluation for {len(zones)} plant zones")
    except Exception as e:
        logger.error(f"Error during evaluate_zones job: {e}")
    finally:
        db.close()
