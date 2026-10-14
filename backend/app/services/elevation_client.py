"""Open-Elevation API client to query altitude in meters for rooftop gardens."""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger("roofgarden.elevation")


class ElevationClient:
    def __init__(self, base_url: str = settings.OPEN_ELEVATION_BASE_URL):
        self.base_url = base_url

    async def get_elevation_m(self, lat: float, lon: float) -> float:
        """Query altitude in meters from Open-Elevation API."""
        url = f"{self.base_url}?locations={lat},{lon}"
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    results = data.get("results", [])
                    if results and "elevation" in results[0]:
                        return float(results[0]["elevation"])
        except Exception as e:
            logger.warning(f"Could not retrieve live elevation for ({lat}, {lon}): {e}. Using Jakarta rooftop default.")

        return 18.5 # Jakarta average elevation default fallback
