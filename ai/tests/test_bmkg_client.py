"""Tes klien BMKG tanpa jaringan (payload tiruan)."""

from datetime import datetime, timezone
from pathlib import Path
import sys

# Ensure 'ai' directory is always discoverable even when run directly via python script.py
AI_ROOT = Path(__file__).resolve().parent.parent
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

import pytest

from roofgarden_ai.tools import bmkg_client as b

NOW = datetime(2026, 10, 16, 6, 0, 0, tzinfo=timezone.utc)


def _slot(utc, desc):
    return {"utc_datetime": utc, "local_datetime": utc, "weather_desc": desc, "t": 29, "hu": 80}


PAYLOAD = {"lokasi": {}, "data": [{"lokasi": {}, "cuaca": [[
    _slot("2026-10-16 03:00:00", "Cerah"),
    _slot("2026-10-16 06:00:00", "Berawan"),
    _slot("2026-10-16 09:00:00", "Hujan Sedang"),
    _slot("2026-10-16 18:00:00", "Hujan Lebat"),   # di luar jendela
], []]}]}


@pytest.fixture(autouse=True)
def clear_cache():
    b._cache.clear()


@pytest.mark.parametrize("desc,expected", [
    ("Cerah", 10.0), ("Cerah Berawan", 10.0), ("Berawan Tebal", 40.0),
    ("Hujan Ringan", 70.0), ("Hujan Sedang", 80.0), ("Hujan Petir", 90.0), ("???", None),
])
def test_rain_chance_mapping(desc, expected):
    assert b.rain_chance_from_desc(desc) == expected


def test_context_takes_max_in_window(monkeypatch):
    monkeypatch.setattr(b, "_download", lambda adm4: PAYLOAD)
    ctx = b.get_weather_context("31.71.03.1001", now=NOW)
    assert ctx["rain_chance_next_3h"] == 80.0          # Hujan Lebat 18:00 di luar jendela
    assert "Hujan Sedang" in ctx["weather_forecast_text"]


def test_failure_returns_none_and_failsafe(monkeypatch):
    def boom(adm4):
        raise OSError("offline")
    monkeypatch.setattr(b, "_download", boom)
    assert b.get_weather_context("x", now=NOW) is None
    fs = b.get_weather_context_or_failsafe("x")
    assert fs["rain_chance_next_3h"] == b.UNKNOWN_RAIN_PCT


def test_stale_cache_used_when_download_fails(monkeypatch):
    monkeypatch.setattr(b, "_download", lambda adm4: PAYLOAD)
    assert b.get_weather_context("a", now=NOW) is not None
    b._cache["a"] = (NOW.timestamp() - 5 * 3600, b._cache["a"][1])   # cache 5 jam (> TTL, < MAX_STALE)

    def boom(adm4):
        raise OSError("offline")
    monkeypatch.setattr(b, "_download", boom)
    assert b.get_weather_context("a", now=NOW) is not None


if __name__ == "__main__":
    import sys
    sys.exit(pytest.main([__file__, "-v"]))