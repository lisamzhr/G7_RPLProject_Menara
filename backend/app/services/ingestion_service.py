"""Sensor reading ingestion service handling range validation, deduplication, and node tracking."""

from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import verify_api_key
from app.models.sensor_node import SensorNode
from app.models.sensor_reading import SensorReading
from app.schemas.readings import ReadingIngestRequest, ReadingIngestResponse

# Botanical & physical range constraints
MOISTURE_MIN, MOISTURE_MAX = 0.0, 100.0
TEMP_MIN, TEMP_MAX = -10.0, 70.0
HUMIDITY_MIN, HUMIDITY_MAX = 0.0, 100.0
LUX_MIN, LUX_MAX = 0.0, 120000.0


def validate_reading_ranges(req: ReadingIngestRequest) -> bool:
    """Validate whether all physical telemetry readings fall within physical limits."""
    if not (MOISTURE_MIN <= req.soil_moisture_pct <= MOISTURE_MAX):
        return False
    if not (TEMP_MIN <= req.temperature_c <= TEMP_MAX):
        return False
    if not (HUMIDITY_MIN <= req.humidity_pct <= HUMIDITY_MAX):
        return False
    return LUX_MIN <= req.lux <= LUX_MAX


def ingest_reading(
    db: Session,
    req: ReadingIngestRequest,
    x_node_key: str,
) -> ReadingIngestResponse:
    """Process incoming sensor reading from ESP32 node."""
    # 1. Authenticate Node
    node = db.query(SensorNode).filter(SensorNode.id == req.node_id).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Sensor node '{req.node_id}' is not registered",
        )

    if not verify_api_key(x_node_key, node.api_key_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid node API key credentials",
        )

    # 2. Determine Timestamp & Range Validity
    ts = req.ts or datetime.now(UTC)
    is_valid = validate_reading_ranges(req)

    # 3. Deduplication Check (drop duplicates with same node_id and ts)
    existing = (
        db.query(SensorReading)
        .filter(SensorReading.node_id == req.node_id, SensorReading.ts == ts)
        .first()
    )
    if existing:
        return ReadingIngestResponse(
            status="duplicate_dropped",
            reading_id=existing.id,
            node_id=existing.node_id,
            is_valid=existing.is_valid,
            recorded_at=existing.ts,
        )

    # 4. Persist Reading
    new_reading = SensorReading(
        node_id=req.node_id,
        ts=ts,
        soil_moisture_pct=req.soil_moisture_pct,
        temperature_c=req.temperature_c,
        humidity_pct=req.humidity_pct,
        lux=req.lux,
        battery_v=req.battery_v,
        is_valid=is_valid,
    )
    db.add(new_reading)

    # 5. Update Node Health Tracking
    node.last_seen_at = datetime.now(UTC)
    node.status = "active"

    db.commit()
    db.refresh(new_reading)

    return ReadingIngestResponse(
        status="success",
        reading_id=new_reading.id,
        node_id=new_reading.node_id,
        is_valid=new_reading.is_valid,
        recorded_at=new_reading.ts,
    )
