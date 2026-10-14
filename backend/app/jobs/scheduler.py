"""APScheduler setup for background monitoring and health jobs."""

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.jobs.check_node_health import job_check_node_health
from app.jobs.evaluate_zones import job_evaluate_all_zones
from app.jobs.verify_actions import job_verify_actuator_responses

logger = logging.getLogger("roofgarden.scheduler")
scheduler = BackgroundScheduler()


def start_scheduler():
    """Register and start all background jobs."""
    try:
        scheduler.add_job(
            job_evaluate_all_zones,
            "interval",
            minutes=settings.JOB_EVALUATE_ZONES_INTERVAL_MINUTES,
            id="job_evaluate_all_zones",
            replace_existing=True,
        )

        scheduler.add_job(
            job_check_node_health,
            "interval",
            minutes=settings.JOB_CHECK_NODE_HEALTH_INTERVAL_MINUTES,
            id="job_check_node_health",
            replace_existing=True,
        )

        scheduler.add_job(
            job_verify_actuator_responses,
            "interval",
            minutes=settings.JOB_VERIFY_ACTIONS_INTERVAL_MINUTES,
            id="job_verify_actuator_responses",
            replace_existing=True,
        )

        scheduler.start()
        logger.info("APScheduler background jobs successfully started.")
    except Exception as e:
        logger.warning(f"Failed to start APScheduler (might already be running or in test runner): {e}")


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler shutdown.")
