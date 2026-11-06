"""BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) weather forecast and CAP alert client."""

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.base import ensure_utc
from app.models.weather_cache import WeatherCache

logger = logging.getLogger("roofgarden.bmkg")

BMKG_ATTRIBUTION = "BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)"
CACHE_TTL_MINUTES = 15
DEFAULT_USER_AGENT = "MENARA-roofgarden/1.0"


def rain_chance_from_desc(desc: str, tp: float = 0.0) -> float:
    """Heuristic rain probability (%) derived from BMKG weather_desc and precipitation."""
    d = (desc or "").lower()
    chance = 15.0
    if "petir" in d or "lebat" in d:
        chance = 90.0
    elif "hujan sedang" in d:
        chance = 80.0
    elif "hujan" in d:
        chance = 70.0
    elif "berawan tebal" in d or "mendung" in d:
        chance = 40.0
    elif "kabut" in d or "kabur" in d or "asap" in d:
        chance = 20.0
    elif "cerah berawan" in d:
        chance = 15.0
    elif "cerah" in d:
        chance = 5.0
    elif "berawan" in d:
        chance = 20.0

    if tp > 2.0:
        chance = max(chance, 75.0)
    elif tp > 0.0:
        chance = max(chance, 40.0)

    return float(round(chance, 1))


def _flatten_slots(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten nested cuaca array from BMKG API response."""
    slots: list[dict[str, Any]] = []
    for loc in payload.get("data", []):
        for day in loc.get("cuaca", []):
            if isinstance(day, list):
                for slot in day:
                    if isinstance(slot, dict):
                        slots.append(slot)
            elif isinstance(day, dict):
                slots.append(day)
    return slots


def _slot_time(slot: dict[str, Any]) -> datetime | None:
    """Extract and parse timestamp from slot."""
    dt = slot.get("datetime")
    if dt:
        try:
            return datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            pass
    udt = slot.get("utc_datetime")
    if udt:
        try:
            return datetime.strptime(udt, "%Y-%m-%d %H:%M:%S").replace(tzinfo=UTC)
        except (ValueError, TypeError):
            pass
    return None


def extract_current_weather(
    payload: dict[str, Any], now: datetime | None = None
) -> dict[str, Any] | None:
    """Extract current weather summary from BMKG API payload."""
    slots = _flatten_slots(payload)
    if not slots:
        # Check if legacy or test mock format with root keys
        if "cuaca" in payload and isinstance(payload["cuaca"], str):
            return {
                "forecast": payload.get("cuaca", "Cerah Berawan"),
                "temp_c": float(payload.get("suhu", 30.0)),
                "rain_probability_pct": float(payload.get("peluang_hujan", 30.0)),
                "attribution": BMKG_ATTRIBUTION,
            }
        return None

    now = now or datetime.now(UTC)
    slots_with_time: list[tuple[datetime, dict[str, Any]]] = []
    for s in slots:
        t = _slot_time(s)
        if t is not None:
            slots_with_time.append((t, s))

    if slots_with_time:
        closest_slot = min(
            slots_with_time, key=lambda item: abs((item[0] - now).total_seconds())
        )[1]
    else:
        closest_slot = slots[0]

    lokasi = payload.get("lokasi", {})
    desa = lokasi.get("desa", "")
    kotkab = lokasi.get("kotkab", "")
    loc_display = f"{desa}, {kotkab}" if desa and kotkab else (desa or kotkab or "Indonesia")

    desc = closest_slot.get("weather_desc") or "Cerah Berawan"
    desc_en = closest_slot.get("weather_desc_en")
    if desc_en and desc.lower() != desc_en.lower():
        forecast = f"{desc} ({desc_en})"
    else:
        forecast = desc

    try:
        temp_c = float(closest_slot.get("t", 30.0))
    except (ValueError, TypeError):
        temp_c = 30.0

    try:
        tp = float(closest_slot.get("tp", 0.0) or 0.0)
    except (ValueError, TypeError):
        tp = 0.0

    rain_prob = rain_chance_from_desc(desc, tp)

    result: dict[str, Any] = {
        "location": loc_display,
        "forecast": forecast,
        "temp_c": temp_c,
        "rain_probability_pct": rain_prob,
        "attribution": BMKG_ATTRIBUTION,
    }

    if "hu" in closest_slot:
        try:
            result["humidity_pct"] = float(closest_slot["hu"])
        except (ValueError, TypeError):
            pass

    if "ws" in closest_slot:
        try:
            result["wind_speed_kmh"] = float(closest_slot["ws"])
        except (ValueError, TypeError):
            pass

    if closest_slot.get("image"):
        result["icon_url"] = closest_slot["image"]

    if closest_slot.get("local_datetime"):
        result["local_datetime"] = closest_slot["local_datetime"]

    return result


class BMKGClient:
    def __init__(self, base_url: str = settings.BMKG_BASE_URL):
        self.base_url = base_url

    async def get_forecast(self, db: Session, adm4_code: str) -> dict[str, Any]:
        """Fetch weather forecast for Indonesian adm4 code, with database caching."""
        cached = db.query(WeatherCache).filter(WeatherCache.adm4_code == adm4_code).first()
        now = datetime.now(UTC)

        if cached and cached.fetched_at:
            fetched_at_utc = ensure_utc(cached.fetched_at)
            if fetched_at_utc and (now - fetched_at_utc < timedelta(minutes=CACHE_TTL_MINUTES)):
                return cached.payload

        # Cache miss or expired: fetch from BMKG API
        url = f"{self.base_url}/prakiraan-cuaca?adm4={adm4_code}"
        headers = {"User-Agent": DEFAULT_USER_AGENT}
        try:
            async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    parsed = extract_current_weather(data, now=now)
                    if parsed:
                        payload = parsed
                        payload["raw"] = data
                        if not cached:
                            cached = WeatherCache(
                                adm4_code=adm4_code, fetched_at=now, payload=payload
                            )
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

        if cached and cached.payload:
            return cached.payload

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

        if cached and cached.fetched_at:
            fetched_at_utc = ensure_utc(cached.fetched_at)
            if fetched_at_utc and (now - fetched_at_utc < timedelta(minutes=CACHE_TTL_MINUTES)):
                return cached.payload

        url = f"{self.base_url}/prakiraan-cuaca?adm4={adm4_code}"
        headers = {"User-Agent": DEFAULT_USER_AGENT}
        try:
            with httpx.Client(timeout=10.0, headers=headers) as client:
                res = client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    parsed = extract_current_weather(data, now=now)
                    if parsed:
                        payload = parsed
                        payload["raw"] = data
                        if not cached:
                            cached = WeatherCache(
                                adm4_code=adm4_code, fetched_at=now, payload=payload
                            )
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

        if cached and cached.payload:
            return cached.payload

        return {
            "forecast": "Cerah Berawan (Partly Cloudy)",
            "temp_c": 30.5,
            "rain_probability_pct": 25.0,
            "attribution": BMKG_ATTRIBUTION,
        }
