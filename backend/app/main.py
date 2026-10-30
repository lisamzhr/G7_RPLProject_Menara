"""FastAPI Application Entry Point for RoofGarden Backend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # Ensure all models are registered with Base.metadata
from app.api.v1.api import api_router
from app.core.database import Base, engine
from app.core.logging import logger, setup_logging
from app.jobs.scheduler import shutdown_scheduler, start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    logger.info("Starting RoofGarden Backend application...")
    # Create DB tables if not present (useful for local development & SQLite)
    Base.metadata.create_all(bind=engine)
    if engine.dialect.name == "sqlite":
        with engine.begin() as conn:
            conn.exec_driver_sql("""
            CREATE VIEW IF NOT EXISTS readings_hourly AS
            SELECT
                node_id,
                strftime('%Y-%m-%d %H:00:00', ts) AS hour_bucket,
                AVG(soil_moisture_pct) AS avg_moisture,
                MIN(soil_moisture_pct) AS min_moisture,
                MAX(soil_moisture_pct) AS max_moisture,
                AVG(temperature_c) AS avg_temp,
                MIN(temperature_c) AS min_temp,
                MAX(temperature_c) AS max_temp,
                AVG(humidity_pct) AS avg_humidity,
                MIN(humidity_pct) AS min_humidity,
                MAX(humidity_pct) AS max_humidity,
                AVG(lux) AS avg_lux,
                MIN(lux) AS min_lux,
                MAX(lux) AS max_lux,
                COUNT(*) AS sample_count
            FROM sensor_readings
            WHERE is_valid = 1
            GROUP BY node_id, strftime('%Y-%m-%d %H:00:00', ts);
            """)
            conn.exec_driver_sql("""
            CREATE VIEW IF NOT EXISTS readings_daily AS
            SELECT
                node_id,
                strftime('%Y-%m-%d 00:00:00', ts) AS day_bucket,
                AVG(soil_moisture_pct) AS avg_moisture,
                MIN(soil_moisture_pct) AS min_moisture,
                MAX(soil_moisture_pct) AS max_moisture,
                AVG(temperature_c) AS avg_temp,
                MIN(temperature_c) AS min_temp,
                MAX(temperature_c) AS max_temp,
                AVG(humidity_pct) AS avg_humidity,
                MIN(humidity_pct) AS min_humidity,
                MAX(humidity_pct) AS max_humidity,
                AVG(lux) AS avg_lux,
                MIN(lux) AS min_lux,
                MAX(lux) AS max_lux,
                COUNT(*) AS sample_count
            FROM sensor_readings
            WHERE is_valid = 1
            GROUP BY node_id, strftime('%Y-%m-%d 00:00:00', ts);
            """)
    start_scheduler()
    yield
    # Shutdown
    logger.info("Shutting down RoofGarden Backend...")
    shutdown_scheduler()


app = FastAPI(
    title="RoofGarden IoT & AI Monitoring API",
    description="Backend API for IoT sensor ingestion, BMKG microclimate evaluation, and human-in-the-loop rooftop garden monitoring.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "roofgarden-backend", "version": "0.1.0"}


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "RoofGarden IoT & AI Monitoring API is running",
        "docs_url": "/docs",
        "api_v1_prefix": "/api/v1",
    }
