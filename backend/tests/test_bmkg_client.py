"""Tests for BMKG client parsing, heuristics, and caching."""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

from app.models.weather_cache import WeatherCache
from app.services.bmkg_client import (
    BMKG_ATTRIBUTION,
    BMKGClient,
    extract_current_weather,
    rain_chance_from_desc,
)

SAMPLE_BMKG_PAYLOAD = {
    "lokasi": {
        "adm1": "31",
        "adm2": "31.71",
        "adm3": "31.71.06",
        "adm4": "31.71.06.1001",
        "provinsi": "DKI Jakarta",
        "kotkab": "Kota Adm. Jakarta Pusat",
        "kecamatan": "Menteng",
        "desa": "Menteng",
    },
    "data": [
        {
            "lokasi": {"desa": "Menteng"},
            "cuaca": [
                [
                    {
                        "datetime": "2026-11-06T00:00:00Z",
                        "utc_datetime": "2026-11-06 00:00:00",
                        "local_datetime": "2026-11-06 07:00:00",
                        "t": 27,
                        "hu": 85,
                        "tp": 0.0,
                        "ws": 5.2,
                        "weather_desc": "Cerah Berawan",
                        "weather_desc_en": "Partly Cloudy",
                        "image": "https://api-apps.bmkg.go.id/storage/icon/cuaca/cerah-berawan-am.svg",
                    },
                    {
                        "datetime": "2026-11-06T06:00:00Z",
                        "utc_datetime": "2026-11-06 06:00:00",
                        "local_datetime": "2026-11-06 13:00:00",
                        "t": 33,
                        "hu": 60,
                        "tp": 3.5,
                        "ws": 12.0,
                        "weather_desc": "Hujan Petir",
                        "weather_desc_en": "Thunderstorm",
                        "image": "https://api-apps.bmkg.go.id/storage/icon/cuaca/hujan-petir.svg",
                    },
                    {
                        "datetime": "2026-11-06T12:00:00Z",
                        "utc_datetime": "2026-11-06 12:00:00",
                        "local_datetime": "2026-11-06 19:00:00",
                        "t": 28,
                        "hu": 78,
                        "tp": 0.5,
                        "ws": 6.8,
                        "weather_desc": "Hujan Ringan",
                        "weather_desc_en": "Light Rain",
                        "image": "https://api-apps.bmkg.go.id/storage/icon/cuaca/hujan-ringan.svg",
                    },
                ]
            ],
        }
    ],
}


def test_rain_chance_heuristics():
    assert rain_chance_from_desc("Hujan Petir") == 90.0
    assert rain_chance_from_desc("Hujan Sedang") == 80.0
    assert rain_chance_from_desc("Hujan Ringan") == 70.0
    assert rain_chance_from_desc("Berawan Tebal") == 40.0
    assert rain_chance_from_desc("Cerah Berawan") == 15.0
    assert rain_chance_from_desc("Cerah") == 5.0
    # Precipitation override
    assert rain_chance_from_desc("Cerah", tp=3.0) == 75.0
    assert rain_chance_from_desc("Cerah", tp=0.2) == 40.0


def test_extract_current_weather_slot_selection():
    # When now is around 06:15 UTC, the 06:00 slot should be chosen
    now = datetime(2026, 11, 6, 6, 15, tzinfo=UTC)
    result = extract_current_weather(SAMPLE_BMKG_PAYLOAD, now=now)
    assert result is not None
    assert result["temp_c"] == 33.0
    assert result["forecast"] == "Hujan Petir (Thunderstorm)"
    assert result["rain_probability_pct"] == 90.0
    assert result["humidity_pct"] == 60.0
    assert result["wind_speed_kmh"] == 12.0
    assert "Menteng" in result["location"]
    assert result["attribution"] == BMKG_ATTRIBUTION

    # When now is around 12:30 UTC, the 12:00 slot should be chosen
    now_later = datetime(2026, 11, 6, 12, 30, tzinfo=UTC)
    result_later = extract_current_weather(SAMPLE_BMKG_PAYLOAD, now=now_later)
    assert result_later is not None
    assert result_later["temp_c"] == 28.0
    assert result_later["forecast"] == "Hujan Ringan (Light Rain)"
    assert result_later["rain_probability_pct"] == 70.0


def test_extract_current_weather_legacy_mock_format():
    legacy = {
        "cuaca": "Hujan Ringan",
        "suhu": 27.5,
        "peluang_hujan": 65.0,
    }
    result = extract_current_weather(legacy)
    assert result is not None
    assert result["forecast"] == "Hujan Ringan"
    assert result["temp_c"] == 27.5
    assert result["rain_probability_pct"] == 65.0
    assert result["attribution"] == BMKG_ATTRIBUTION


def test_bmkg_client_sync_live_and_caching(db_session):
    client = BMKGClient()
    adm4 = "31.71.06.1001"

    # Mock httpx.Client.get returning SAMPLE_BMKG_PAYLOAD
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = SAMPLE_BMKG_PAYLOAD

    with patch("httpx.Client.get", return_value=mock_response):
        forecast = client.get_forecast_sync(db_session, adm4)
        assert forecast is not None
        assert forecast["attribution"] == BMKG_ATTRIBUTION
        assert "Menteng" in forecast.get("location", "")

        # Verify entry was written to WeatherCache
        cache_row = db_session.query(WeatherCache).filter(WeatherCache.adm4_code == adm4).first()
        assert cache_row is not None
        assert cache_row.payload["forecast"] == forecast["forecast"]

        # Second call should use cache without hitting httpx again
        mock_response.json.reset_mock()
        cached_forecast = client.get_forecast_sync(db_session, adm4)
        assert cached_forecast["forecast"] == forecast["forecast"]
        mock_response.json.assert_not_called()


def test_bmkg_client_offline_fallback(db_session):
    client = BMKGClient()
    adm4 = "99.99.99.9999"

    with patch("httpx.Client.get", side_effect=Exception("Network unreachable")):
        forecast = client.get_forecast_sync(db_session, adm4)
        assert forecast is not None
        assert forecast["forecast"] == "Cerah Berawan (Partly Cloudy)"
        assert forecast["temp_c"] == 30.5
        assert forecast["rain_probability_pct"] == 25.0
