# API Contract Specification

Base URL: `/api/v1`

---

## 1. Hardware & Ingestion Endpoints

### 1.1 Ingest Sensor Reading
- **Method / Path**: `POST /api/v1/ingest/readings`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Node-Key: <node_api_key>` (required for node authentication)
- **Request Body**:
```json
{
  "node_id": "esp32-node-01",
  "ts": "2026-10-13T15:30:00Z",
  "soil_moisture_pct": 68.5,
  "temperature_c": 28.2,
  "humidity_pct": 74.0,
  "lux": 34500.0,
  "battery_v": 3.95
}
```
*Note: `ts` is optional; defaults to server time if omitted. `battery_v` is optional.*
- **Response `201 Created`**:
```json
{
  "status": "success",
  "reading_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "node_id": "esp32-node-01",
  "is_valid": true,
  "recorded_at": "2026-10-13T15:30:00Z"
}
```
- **Error Responses**:
  - `401 Unauthorized`: Invalid or missing `X-Node-Key`.
  - `422 Unprocessable Entity`: Invalid JSON payload structure.

---

### 1.2 Poll Pending Node Actuator Commands
- **Method / Path**: `GET /api/v1/nodes/{id}/commands`
- **Headers**:
  - `X-Node-Key: <node_api_key>`
- **Response `200 OK`**:
```json
[
  {
    "command_id": "5f64d7c2-1a2b-4c3d-8e4f-5a6b7c8d9e0f",
    "actuator_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "command": "turn_on",
    "duration_seconds": 30,
    "requested_at": "2026-10-13T15:31:00Z"
  }
]
```

---

### 1.3 Acknowledge Command Execution
- **Method / Path**: `POST /api/v1/nodes/{id}/commands/{cid}/ack`
- **Headers**:
  - `X-Node-Key: <node_api_key>`
- **Request Body**:
```json
{
  "status": "acked",
  "executed_at": "2026-10-13T15:31:05Z",
  "result": "Valve opened for 30s successfully"
}
```
- **Response `200 OK`**:
```json
{
  "status": "acknowledged",
  "command_id": "5f64d7c2-1a2b-4c3d-8e4f-5a6b7c8d9e0f"
}
```

---

## 2. Dashboard & Gardening Endpoints

### 2.1 Get Gardens
- **Method / Path**: `GET /api/v1/gardens`
- **Auth**: Bearer JWT (or demo gardener)
- **Response `200 OK`**:
```json
[
  {
    "id": "c1f73b64-4e2b-4fa8-b2dc-215d18d4d732",
    "name": "Menteng Rooftop Garden",
    "location_name": "Jakarta Pusat, DKI Jakarta",
    "lat": -6.1931,
    "lon": 106.8242,
    "elevation_m": 24.5,
    "adm4_code": "31.71.06.1001",
    "created_at": "2026-10-01T08:00:00Z"
  }
]
```

---

### 2.2 Get Garden Zones
- **Method / Path**: `GET /api/v1/gardens/{id}/zones`
- **Response `200 OK`**:
```json
[
  {
    "id": "e2f89c4d-6b5e-4c7b-9f21-728b9c1d3e4f",
    "garden_id": "c1f73b64-4e2b-4fa8-b2dc-215d18d4d732",
    "category": {
      "key": "leafy",
      "name": "Leafy Vegetables",
      "response_timescale": "days"
    },
    "label": "Zone A - Hydroponic Greens",
    "plant_names": ["Bok Choy", "Spinach", "Kale"],
    "created_at": "2026-10-01T08:30:00Z"
  }
]
```

---

### 2.3 Get Zone Status
- **Method / Path**: `GET /api/v1/zones/{id}/status`
- **Response `200 OK`**:
```json
{
  "zone_id": "e2f89c4d-6b5e-4c7b-9f21-728b9c1d3e4f",
  "zone_label": "Zone A - Hydroponic Greens",
  "category_key": "leafy",
  "overall_status": "advisory",
  "latest_reading": {
    "ts": "2026-10-13T15:30:00Z",
    "soil_moisture_pct": 74.2,
    "temperature_c": 29.5,
    "humidity_pct": 65.0,
    "lux": 28000.0,
    "is_valid": true
  },
  "parameter_status": {
    "moisture": {
      "value": 74.2,
      "status": "low",
      "ideal_min": 76.0,
      "ideal_max": 98.0,
      "unit": "%"
    },
    "temperature": {
      "value": 29.5,
      "status": "high",
      "ideal_min": 22.0,
      "ideal_max": 27.0,
      "unit": "°C"
    },
    "humidity": {
      "value": 65.0,
      "status": "ok",
      "ideal_min": 60.0,
      "ideal_max": 80.0,
      "unit": "%"
    },
    "lux": {
      "value": 28000.0,
      "status": "high",
      "ideal_min": 10000.0,
      "ideal_max": 20000.0,
      "unit": "lx"
    }
  },
  "latest_recommendation": {
    "id": "fa123b45-6789-01cd-ef23-456789abcdef",
    "status_level": "advisory",
    "message": "Soil moisture is slightly dry at 74% and midday sun is intense. Consider light watering soon if clouds don't arrive.",
    "created_at": "2026-10-13T15:30:00Z"
  }
}
```

---

### 2.4 Get Zone Historical Readings
- **Method / Path**: `GET /api/v1/zones/{id}/readings?range=24h&agg=raw`
- **Query Parameters**:
  - `range`: `24h` | `7d` (default: `24h`)
  - `agg`: `raw` | `hourly` (default: `raw`)
- **Response `200 OK`**:
```json
[
  {
    "ts": "2026-10-13T15:00:00Z",
    "soil_moisture_pct": 75.0,
    "temperature_c": 28.5,
    "humidity_pct": 66.0,
    "lux": 25000.0
  },
  {
    "ts": "2026-10-13T15:30:00Z",
    "soil_moisture_pct": 74.2,
    "temperature_c": 29.5,
    "humidity_pct": 65.0,
    "lux": 28000.0
  }
]
```

---

### 2.5 Get Dashboard Summary
- **Method / Path**: `GET /api/v1/dashboard/summary`
- **Response `200 OK`**:
```json
{
  "total_zones": 4,
  "zones_ok": 3,
  "zones_need_attention": 1,
  "active_alerts_count": 1,
  "weather_summary": {
    "location": "Menteng, Jakarta Pusat",
    "forecast": "Hujan Ringan (Light Rain)",
    "temp_c": 30.0,
    "rain_probability_pct": 40,
    "attribution": "BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)"
  },
  "top_recommendations": [
    {
      "zone_id": "e2f89c4d-6b5e-4c7b-9f21-728b9c1d3e4f",
      "zone_label": "Zone A - Hydroponic Greens",
      "status_level": "advisory",
      "message": "Soil moisture is at 74%. Rain probability is 40% in 2 hours."
    }
  ]
}
```

---

### 2.6 Recommendations & Alerts
- **`GET /api/v1/recommendations?zone_id={id}`**
- **`GET /api/v1/alerts?status=active`**
- **`POST /api/v1/alerts/{id}/confirm`**:
```json
{
  "comment": "Confirmed by gardener via dashboard"
}
```
- **`POST /api/v1/alerts/{id}/override`**:
```json
{
  "comment": "Overridden: gardener watered manually already"
}
```

---

### 2.7 Actuator Manual Command
- **Method / Path**: `POST /api/v1/actuators/{id}/command`
- **Request Body**:
```json
{
  "command": "turn_on",
  "duration_seconds": 30
}
```
- **Response `200 OK`**:
```json
{
  "status": "pending",
  "command_id": "5f64d7c2-1a2b-4c3d-8e4f-5a6b7c8d9e0f",
  "message": "Command queued for ESP32 node polling"
}
```

---

### 2.8 Internal Evaluation Trigger (External Cron / Worker)
- **Method / Path**: `POST /api/v1/internal/evaluate?zone_id={optional_zone_id}`
- **Headers**:
  - `X-Internal-Token: <INTERNAL_TOKEN>`
- **Response `200 OK`**:
```json
{
  "status": "completed",
  "evaluated_zones": 4,
  "timestamp": "2026-10-13T15:35:00Z"
}
```
