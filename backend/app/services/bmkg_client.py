"""BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) weather forecast and CAP alert client."""

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.weather_cache import WeatherCache

logger = logging.getLogger("roofgarden.bmkg")

BMKG_ATTRIBUTION = "BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)"
CACHE_TTL_MINUTES = 15


class BMKGClient:
    def __init__(self, base_url: str = settings.BMKG_BASE_URL):
        self.base_url = base_url

    async def get_forecast(self, db: Session, adm4_code: str) -> dict[str, Any]:
        """Fetch weather forecast for Indonesian adm4 code, with database caching."""
        cached = db.query(WeatherCache).filter(WeatherCache.adm4_code == adm4_code).first()
        now = datetime.now(UTC)

        if cached and (now - cached.fetched_at < timedelta(minutes=CACHE_TTL_MINUTES)):
            return cached.payload

        # Cache miss or expired: fetch from BMKG API
        url = f"{self.base_url}/prakiraan-cuaca?adm4={adm4_code}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    payload = {
                        "forecast": data.get("cuaca", "Cerah Berawan"),
                        "temp_c": float(data.get("suhu", 30.0)),
                        "rain_probability_pct": float(data.get("peluang_hujan", 30.0)),
                        "attribution": BMKG_ATTRIBUTION,
                        "raw": data,
                    }
                    if not cached:
                        cached = WeatherCache(adm4_code=adm4_code, fetched_at=now, payload=payload)
                        db.add(cached)
                    else:
                        cached.fetched_at = now
                        cached.payload = payload
                    db.commit()
                    return payload
        except Exception as e:
            logger.warning(
                f"Failed to fetch live BMKG forecast for {adm4_code}: {e}. Using cached/fallback."
            )

        # Fallback default if offline or API error
        return {
            "forecast": "Cerah Berawan (Partly Cloudy)",
            "temp_c": 30.5,
            "rain_probability_pct": 25.0,
            "attribution": BMKG_ATTRIBUTION,
        }

    def get_forecast_sync(self, db: Session, adm4_code: str) -> dict[str, Any]:
        """Synchronous version of get_forecast for background workers and schedulers."""
        cached = db.query(WeatherCache).filter(WeatherCache.adm4_code == adm4_code).first()
        now = datetime.now(UTC)

        if cached and (now - cached.fetched_at < timedelta(minutes=CACHE_TTL_MINUTES)):
            return cached.payload

        url = f"{self.base_url}/prakiraan-cuaca?adm4={adm4_code}"
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    payload = {
                        "forecast": data.get("cuaca", "Cerah Berawan"),
                        "temp_c": float(data.get("suhu", 30.0)),
                        "rain_probability_pct": float(data.get("peluang_hujan", 30.0)),
                        "attribution": BMKG_ATTRIBUTION,
                        "raw": data,
                    }
                    if not cached:
                        cached = WeatherCache(adm4_code=adm4_code, fetched_at=now, payload=payload)
                        db.add(cached)
                    else:
                        cached.fetched_at = now
                        cached.payload = payload
                    db.commit()
                    return payload
        except Exception as e:
            logger.warning(
                f"Failed to fetch live BMKG forecast for {adm4_code}: {e}. Using cached/fallback."
            )

        return {
            "forecast": "Cerah Berawan (Partly Cloudy)",
            "temp_c": 30.5,
            "rain_probability_pct": 25.0,
            "attribution": BMKG_ATTRIBUTION,
        }
