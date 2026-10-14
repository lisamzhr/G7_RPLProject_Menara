"""Tests for dashboard summary endpoint."""

def test_dashboard_summary(client):
    res = client.get("/api/v1/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_zones" in data
    assert "zones_ok" in data
    assert "weather_summary" in data
    assert data["weather_summary"]["attribution"] == "BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)"
