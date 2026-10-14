"""Root v1 API router unifying all subrouters."""

from fastapi import APIRouter

from app.api.v1 import (
    actuators,
    alerts,
    auth,
    dashboard,
    gardens,
    ingest,
    internal,
    nodes,
    recommendations,
    zones,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(ingest.router, prefix="/ingest", tags=["Ingestion"])
api_router.include_router(nodes.router, prefix="/nodes", tags=["Nodes"])
api_router.include_router(gardens.router, prefix="/gardens", tags=["Gardens"])
api_router.include_router(zones.router, prefix="/zones", tags=["Zones"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])
api_router.include_router(actuators.router, prefix="/actuators", tags=["Actuators"])
api_router.include_router(internal.router, prefix="/internal", tags=["Internal"])
