"""Klien prakiraan cuaca BMKG (data terbuka) dengan cache dan fail-safe.

Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika), wajib dicantumkan di UI/slide.
Catatan: BMKG tidak menyediakan peluang hujan (%). Nilainya DITURUNKAN dari `weather_desc`
dengan heuristik di `rain_chance_from_desc` (asumsi, bukan data BMKG).
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

logger = logging.getLogger("roofgarden_ai.bmkg")

BMKG_URL = "https://api.bmkg.go.id/publik/prakiraan-cuaca"
TIMEOUT_S = 8
CACHE_TTL_S = 3 * 3600        # BMKG memperbarui data 2x sehari
MAX_STALE_S = 12 * 3600       # cache lama masih boleh dipakai bila BMKG gagal
UNKNOWN_RAIN_PCT = 100.0      # fail-safe: cuaca tidak diketahui -> anggap hujan (gate minta konfirmasi)

_cache: dict[str, tuple[float, list[dict]]] = {}


def rain_chance_from_desc(desc: str) -> float | None:
    """Heuristik peluang hujan (%) dari deskripsi cuaca BMKG. None bila tidak dikenali."""
    d = (desc or "").lower()
    if "petir" in d or "lebat" in d:
        return 90.0
    if "hujan sedang" in d:
        return 80.0
    if "hujan" in d:                       # ringan / lokal / lainnya
        return 70.0
    if "berawan tebal" in d or "mendung" in d:
        return 40.0
    if "cerah" in d or "berawan" in d:     # cerah, cerah berawan, berawan
        return 10.0
    if "kabut" in d or "kabur" in d or "asap" in d:
        return 20.0
    return None


def _download(adm4_code: str) -> dict:
    url = f"{BMKG_URL}?{urlencode({'adm4': adm4_code})}"
    req = Request(url, headers={"User-Agent": "MENARA-roofgarden/1.0"})
    with urlopen(req, timeout=TIMEOUT_S) as resp:
        return json.load(resp)


def _flatten(payload: dict) -> list[dict]:
    slots: list[dict] = []
    for loc in payload.get("data", []):
        for day in loc.get("cuaca", []):
            for slot in day if isinstance(day, list) else [day]:
                if isinstance(slot, dict):
                    slots.append(slot)
    return slots


def _get_slots(adm4_code: str, now_ts: float) -> list[dict] | None:
    cached = _cache.get(adm4_code)
    if cached and now_ts - cached[0] < CACHE_TTL_S:
        return cached[1]
    try:
        slots = _flatten(_download(adm4_code))
        if not slots:
            raise ValueError("payload BMKG kosong")
        _cache[adm4_code] = (now_ts, slots)
        return slots
    except (URLError, TimeoutError, ValueError, OSError) as e:
        logger.warning(f"BMKG gagal untuk {adm4_code}: {e}")
        if cached and now_ts - cached[0] < MAX_STALE_S:
            logger.warning("memakai cache BMKG yang sudah lama")
            return cached[1]
        return None


def _slot_time(slot: dict) -> datetime | None:
    try:
        return datetime.strptime(slot["utc_datetime"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    except (KeyError, ValueError):
        return None


def get_weather_context(adm4_code: str, now: datetime | None = None) -> dict | None:
    """Kembalikan field cuaca untuk ZoneContext, atau None bila BMKG tidak tersedia.

    Peluang hujan = nilai tertinggi (konservatif) dari slot 3-jam yang mencakup
    sekarang sampai 3 jam ke depan.
    """
    now = now or datetime.now(timezone.utc)
    slots = _get_slots(adm4_code, now.timestamp())
    if slots is None:
        return None
    window = []
    for s in slots:
        t = _slot_time(s)
        if t is not None and now - timedelta(hours=3) <= t <= now + timedelta(hours=3):
            window.append((t, s))
    if not window:
        return None
    chances = [(rain_chance_from_desc(s.get("weather_desc", "")), s) for _, s in window]
    known = [(c, s) for c, s in chances if c is not None]
    if not known:
        return None
    rain, worst = max(known, key=lambda x: x[0])
    return {
        "rain_chance_next_3h": rain,
        "weather_forecast_text": f"{worst.get('weather_desc', '?')} (prakiraan BMKG {worst.get('local_datetime', '')})",
        "has_severe_weather_alert": False,   # nowcast peringatan dini belum terhubung
    }


def get_weather_context_or_failsafe(adm4_code: str) -> dict:
    """Seperti get_weather_context, tapi selalu mengembalikan dict (konservatif saat gagal)."""
    ctx = get_weather_context(adm4_code)
    if ctx is not None:
        return ctx
    return {
        "rain_chance_next_3h": UNKNOWN_RAIN_PCT,
        "weather_forecast_text": "Data cuaca BMKG tidak tersedia",
        "has_severe_weather_alert": False,
    }