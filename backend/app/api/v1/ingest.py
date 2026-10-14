"""Sensor telemetry ingestion router."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import verify_node_key
from app.schemas.readings import ReadingIngestRequest, ReadingIngestResponse
from app.services.ingestion_service import ingest_reading

router = APIRouter()


@router.post(
    "/readings",
    response_model=ReadingIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest sensor telemetry from ESP32 node",
)
def post_sensor_reading(
    reading_in: ReadingIngestRequest,
    x_node_key: str = Depends(verify_node_key),
    db: Session = Depends(get_db),
):
    """Receive and validate sensor readings. Out-of-bounds readings are tagged is_valid=False.

    Duplicate (node_id, ts) readings are deduplicated safely.
    Node last_seen_at timestamp is refreshed.
    """
    return ingest_reading(db, reading_in, x_node_key)
