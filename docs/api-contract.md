# API Contract Specification

Base URL: `/api/v1`

All authenticated endpoints require an `Authorization: Bearer <jwt_token>` header unless explicitly noted. Hardware ingestion and polling endpoints authenticate using either the `X-Node-MAC: <mac_address>` header (recommended, dynamically registered per plant zone via the web dashboard) or legacy `X-Node-Key: <node_api_key>`. Unregistered MAC addresses are strictly rejected with `401 Unauthorized` (auto-discovery is disabled).

---

## 1. Authentication & Profile Endpoints

### 1.1 Register User
- **Method / Path**: `POST /api/v1/auth/register`
- **Request Body**:
```json
{
  "email": "gardener@example.com",
  "password": "Password123!",
  "name": "Jakarta Gardener",
  "role": "gardener"
}
```
- **Response `201 Created`**:
```json
{
  "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "email": "gardener@example.com",
  "name": "Jakarta Gardener",
  "role": "gardener",
  "created_at": "2026-11-01T08:00:00Z"
}
```
- **Error Responses**:
  - `400 Bad Request`: Email already registered.
  - `422 Unprocessable Entity`: Validation failure (short password, invalid email format).

---

### 1.2 Login & Token Generation
- **Method / Path**: `POST /api/v1/auth/login`
- **Request Body**:
```json
{
  "email": "gardener@example.com",
  "password": "Password123!"
}
```
- **Response `200 OK`**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "user": {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "email": "gardener@example.com",
    "name": "Jakarta Gardener",
    "role": "gardener"
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: Invalid credentials.

---

### 1.3 Get Current User Profile
- **Method / Path**: `GET /api/v1/auth/me`
- **Auth**: Bearer JWT
- **Response `200 OK`**:
```json
{
  "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "email": "gardener@example.com",
  "name": "Jakarta Gardener",
  "role": "gardener",
  "created_at": "2026-11-01T08:00:00Z"
}
```

---

### 1.4 Update Current User Profile
- **Method / Path**: `PATCH /api/v1/auth/me`
- **Auth**: Bearer JWT
- **Request Body**:
```json
{
  "name": "Jakarta Master Gardener",
  "email": "updated_email@example.com"
}
```
- **Response `200 OK`**:
```json
{
  "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "email": "updated_email@example.com",
  "name": "Jakarta Master Gardener",
  "role": "gardener",
  "created_at": "2026-11-01T08:00:00Z"
}
```
- **Error Responses**:
  - `400 Bad Request`: Email already in use by another user.

---

### 1.5 Password Reset
- **Method / Path**: `POST /api/v1/auth/reset-password`
- **Request Body**:
```json
{
  "email": "gardener@example.com",
  "new_password": "NewSecurePassword456!"
}
```
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "detail": "Password updated successfully"
}
```

---

## 2. Hardware & Ingestion Endpoints

### 2.1 Ingest Sensor Reading
- **Method / Path**: `POST /api/v1/ingest/readings`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Node-MAC: <mac_address>` (recommended for registered ESP32 nodes) OR `X-Node-Key: <node_api_key>`
- **Request Body**:
```json
{
  "node_id": "esp32-node-01",
  "mac_address": "24:6F:28:01:00:01",
  "ts": "2026-11-06T15:30:00Z",
  "soil_moisture_pct": 68.5,
  "temperature_c": 28.2,
  "humidity_pct": 74.0,
  "lux": 34500.0,
  "battery_v": 3.95,
  "is_valid": true
}
```
*Note: `mac_address` can be provided in header (`X-Node-MAC`) or body. When `X-Node-MAC` or `mac_address` is provided, `node_id` is optional. `ts` is optional (defaults to server UTC time if omitted or unsynced < year 2000). Out-of-bounds metrics are flagged `is_valid: false`.*
- **Response `201 Created`**:
```json
{
  "status": "success",
  "reading_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "node_id": "esp32-node-01",
  "is_valid": true,
  "recorded_at": "2026-11-06T15:30:00Z"
}
```
- **Error Responses**:
  - `401 Unauthorized`: Missing authentication, invalid API key, or unregistered MAC address (auto-discovery disabled).

---

### 2.2 Poll Pending Actuator Commands (Node Polling)
- **Method / Path**: `GET /api/v1/nodes/{id}/commands`
- **Path Parameter**: `{id}` can be either the sensor node UUID/identifier or its hardware MAC address.
- **Headers**:
  - `X-Node-MAC: <mac_address>` OR `X-Node-Key: <node_api_key>`
- **Response `200 OK`**:
```json
[
  {
    "command_id": "5f64d7c2-1a2b-4c3d-8e4f-5a6b7c8d9e0f",
    "actuator_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "command": "turn_on",
    "duration_seconds": 30,
    "requested_at": "2026-11-06T15:31:00Z"
  }
]
```

---

### 2.3 Acknowledge Command Execution
- **Method / Path**: `POST /api/v1/nodes/{id}/commands/{cid}/ack`
- **Path Parameter**: `{id}` can be either the sensor node UUID/identifier or its hardware MAC address.
- **Headers**:
  - `X-Node-MAC: <mac_address>` OR `X-Node-Key: <node_api_key>`
- **Request Body**:
```json
{
  "status": "acked",
  "executed_at": "2026-11-06T15:31:05Z",
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

## 3. Gardens, Members & Zones

### 3.1 List Plant Categories & Botanical Thresholds
- **Method / Path**: `GET /api/v1/gardens/categories`
- **Auth**: Bearer JWT
- **Response `200 OK`**:
```json
[
  {
    "key": "leafy",
    "name": "Leafy Vegetables",
    "response_timescale": "days",
    "ideal_ranges": {
      "moisture": {"min": 76.0, "max": 98.0, "unit": "%"},
      "temperature": {"min": 22.0, "max": 27.0, "unit": "°C"},
      "humidity": {"min": 60.0, "max": 80.0, "unit": "%"},
      "lux": {"min": 10000.0, "max": 20000.0, "unit": "lx"}
    }
  },
  {
    "key": "fruiting_veg",
    "name": "Fruiting Vegetables",
    "response_timescale": "days",
    "ideal_ranges": {
      "moisture": {"min": 50.0, "max": 70.0, "unit": "%"},
      "temperature": {"min": 24.0, "max": 28.0, "unit": "°C"},
      "humidity": {"min": 70.0, "max": 85.0, "unit": "%"},
      "lux": {"min": 30000.0, "max": 50000.0, "unit": "lx"}
    }
  }
]
```

---

### 3.2 List Gardens
- **Method / Path**: `GET /api/v1/gardens`
- **Auth**: Bearer JWT
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
    "role": "owner",
    "created_at": "2026-10-01T08:00:00Z"
  }
]
```

---

### 3.3 Create Garden
- **Method / Path**: `POST /api/v1/gardens`
- **Auth**: Bearer JWT
- **Request Body**:
```json
{
  "name": "Kebun Atap Tebet",
  "location_name": "Tebet Barat, Jakarta Selatan",
  "lat": -6.2345,
  "lon": 106.8456,
  "elevation_m": 18.0,
  "adm4_code": "31.74.01.1001"
}
```
- **Response `201 Created`**:
```json
{
  "id": "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a",
  "name": "Kebun Atap Tebet",
  "location_name": "Tebet Barat, Jakarta Selatan",
  "lat": -6.2345,
  "lon": 106.8456,
  "elevation_m": 18.0,
  "adm4_code": "31.74.01.1001",
  "role": "owner",
  "created_at": "2026-11-06T10:00:00Z"
}
```

---

### 3.4 Get Garden Details
- **Method / Path**: `GET /api/v1/gardens/{id}`
- **Auth**: Bearer JWT
- **Response `200 OK`**: Full garden object.

---

### 3.5 Update Garden
- **Method / Path**: `PATCH /api/v1/gardens/{id}`
- **Auth**: Bearer JWT (Owner only)
- **Request Body**:
```json
{
  "name": "Kebun Atap Tebet Hijau",
  "elevation_m": 22.0
}
```
- **Response `200 OK`**: Updated garden object.
- **Error Responses**:
  - `403 Forbidden`: User is a member, not the garden owner.

---

### 3.6 Delete Garden
- **Method / Path**: `DELETE /api/v1/gardens/{id}`
- **Auth**: Bearer JWT (Owner only)
- **Response `200 OK`**:
```json
{
  "status": "deleted",
  "garden_id": "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a"
}
```
*Note: Cascades deletion to zones, threshold profiles, alerts, and member associations.*

---

### 3.7 Garden Member Management
- **List Members**: `GET /api/v1/gardens/{id}/members`
- **Add Member**: `POST /api/v1/gardens/{id}/members`
  - Body: `{"email": "colleague@example.com", "role": "member"}`
  - Response: `201 Created`
- **Remove Member**: `DELETE /api/v1/gardens/{id}/members/{user_id}`
  - Response: `200 OK`

---

### 3.8 List Garden Zones
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

### 3.9 Create Zone
- **Method / Path**: `POST /api/v1/gardens/{id}/zones`
- **Auth**: Bearer JWT (Owner only)
- **Request Body**:
```json
{
  "category_key": "leafy",
  "label": "Zone B - Lettuce Bed",
  "plant_names": ["Romaine", "Butterhead"]
}
```
- **Response `201 Created`**: Returns newly created zone object.

---

### 3.10 Delete Zone
- **Method / Path**: `DELETE /api/v1/zones/{id}`
- **Auth**: Bearer JWT (Owner only)
- **Response `200 OK`**:
```json
{
  "status": "deleted",
  "zone_id": "e2f89c4d-6b5e-4c7b-9f21-728b9c1d3e4f"
}
```

---

### 3.11 Get Zone Status
- **Method / Path**: `GET /api/v1/zones/{id}/status`
- **Response `200 OK`**:
```json
{
  "zone_id": "e2f89c4d-6b5e-4c7b-9f21-728b9c1d3e4f",
  "zone_label": "Zone A - Hydroponic Greens",
  "category_key": "leafy",
  "overall_status": "advisory",
  "latest_reading": {
    "ts": "2026-11-06T15:30:00Z",
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
    "created_at": "2026-11-06T15:30:00Z"
  }
}
```

---

### 3.12 Get Zone Historical Readings
- **Method / Path**: `GET /api/v1/zones/{id}/readings?range=24h&agg=raw`
- **Query Parameters**:
  - `range`: `24h` | `7d` | `30d` (default: `24h`)
  - `agg`: `raw` | `hourly` (default: `raw`)
- **Response `200 OK`**:
```json
[
  {
    "ts": "2026-11-06T15:00:00Z",
    "soil_moisture_pct": 75.0,
    "temperature_c": 28.5,
    "humidity_pct": 66.0,
    "lux": 25000.0
  },
  {
    "ts": "2026-11-06T15:30:00Z",
    "soil_moisture_pct": 74.2,
    "temperature_c": 29.5,
    "humidity_pct": 65.0,
    "lux": 28000.0
  }
]
```

---

## 4. Hardware Management: Sensor Nodes & Actuators

### 4.1 List Sensor Nodes
- **Method / Path**: `GET /api/v1/nodes`
- **Query Parameters**: `garden_id={optional_uuid}`
- **Auth**: Bearer JWT
- **Response `200 OK`**:
```json
[
  {
    "id": "esp32-node-01",
    "mac_address": "24:6F:28:01:00:01",
    "name": "Zone A ESP32 Node",
    "zone_id": "e2f89c4d-6b5e-4c7b-9f21-728b9c1d3e4f",
    "status": "online",
    "last_seen_at": "2026-11-06T15:30:00Z",
    "battery_v": 3.95,
    "created_at": "2026-11-06T10:00:00Z"
  }
]
```

---

### 4.2 Register Sensor Node to Zone (Dynamic MAC Registration)
- **Method / Path**: `POST /api/v1/zones/{id}/nodes`
- **Auth**: Bearer JWT (Garden owner/member)
- **Request Body**:
```json
{
  "mac_address": "24:6F:28:01:00:01",
  "name": "Tomato Bed ESP32"
}
```
- **Response `201 Created`**:
```json
{
  "id": "24:6F:28:01:00:01",
  "mac_address": "24:6F:28:01:00:01",
  "name": "Tomato Bed ESP32",
  "zone_id": "e2f89c4d-6b5e-4c7b-9f21-728b9c1d3e4f",
  "status": "active",
  "last_seen_at": null,
  "battery_v": null,
  "created_at": "2026-11-06T15:35:00Z"
}
```
- **Error Responses**:
  - `400 Bad Request`: Invalid MAC address format (must be 6 pairs of hex digits separated by `:` or `-`).
  - `404 Not Found`: Plant zone does not exist or user lacks access.
  - `409 Conflict`: MAC address is already registered to another plant zone.

---

### 4.3 Get Sensor Node by ID or MAC
- **Method / Path**: `GET /api/v1/nodes/{id}`
- **Path Parameter**: `{id}` can be sensor node identifier or MAC address.
- **Auth**: Bearer JWT
- **Response `200 OK`**: Single `SensorNodeOut` object.
- **Error Responses**:
  - `404 Not Found`: Node does not exist or user lacks access to the parent garden.

---

### 4.4 Update Sensor Node Metadata
- **Method / Path**: `PATCH /api/v1/nodes/{id}`
- **Path Parameter**: `{id}` can be sensor node identifier or MAC address.
- **Auth**: Bearer JWT (Garden owner/member)
- **Request Body**:
```json
{
  "name": "Updated ESP32 Name",
  "zone_id": "b1c2d3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e"
}
```
- **Response `200 OK`**: Updated `SensorNodeOut` object.

---

### 4.5 Unregister / Delete Sensor Node
- **Method / Path**: `DELETE /api/v1/nodes/{id}`
- **Path Parameter**: `{id}` can be sensor node identifier or MAC address.
- **Auth**: Bearer JWT (Garden owner/member)
- **Response `204 No Content`**
- **Error Responses**:
  - `404 Not Found`: Node does not exist or user lacks access to the parent garden.

---

### 4.6 List Actuators
- **Method / Path**: `GET /api/v1/actuators`
- **Query Parameters**: `zone_id={optional_uuid}`
- **Auth**: Bearer JWT
- **Response `200 OK`**:
```json
[
  {
    "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "node_id": "esp32-node-01",
    "zone_id": "e2f89c4d-6b5e-4c7b-9f21-728b9c1d3e4f",
    "name": "Zone A Solenoid Valve",
    "type": "solenoid_valve",
    "state": "off",
    "last_triggered_at": "2026-11-06T14:00:00Z"
  }
]
```

---

### 4.7 Trigger Actuator Manual Command
- **Method / Path**: `POST /api/v1/actuators/{id}/command`
- **Auth**: Bearer JWT
- **Request Body**:
```json
{
  "command": "turn_on",
  "duration_seconds": 30
}
```
*Deterministic Safeguards Enforced:*
- `duration_seconds` is hard-capped to a maximum of **60 seconds**.
- A **300-second (5-minute) cooldown** is strictly enforced between manual activations.
- **Response `200 OK`**:
```json
{
  "status": "pending",
  "command_id": "5f64d7c2-1a2b-4c3d-8e4f-5a6b7c8d9e0f",
  "message": "Command queued for ESP32 node polling"
}
```
- **Error Responses**:
  - `400 Bad Request`: Actuator cooldown active (cannot trigger again until cooldown expires).

---

## 5. Dashboard, Recommendations & Alerts

### 5.1 Get Dashboard Summary
- **Method / Path**: `GET /api/v1/dashboard/summary`
- **Query Parameters**: `garden_id={optional_uuid}`
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
    "humidity_pct": 72.0,
    "wind_speed_kmh": 12.5,
    "rain_probability_pct": 40,
    "icon_url": "https://api.bmkg.go.id/static/icon/cuaca/hujan-ringan-siang.svg",
    "local_datetime": "2026-11-06 15:30 WIB",
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

### 5.2 Recommendations & Alerts
- **List Recommendations**: `GET /api/v1/recommendations?zone_id={id}`
- **List Alerts**: `GET /api/v1/alerts?status=active|resolved|all`
- **Confirm Alert**: `POST /api/v1/alerts/{id}/confirm`
  - Body: `{"comment": "Confirmed by gardener via dashboard"}`
  - Logs feedback decision `confirm` to `Feedback` audit table.
- **Override Alert**: `POST /api/v1/alerts/{id}/override`
  - Body: `{"comment": "Overridden: gardener watered manually already"}`
  - Logs feedback decision `override` to `Feedback` audit table.

---

## 6. Internal Evaluation Worker

### 6.1 Trigger Automated Health Evaluation
- **Method / Path**: `POST /api/v1/internal/evaluate?zone_id={optional_zone_id}`
- **Headers**:
  - `X-Internal-Token: <INTERNAL_TOKEN>`
- **Response `200 OK`**:
```json
{
  "status": "completed",
  "evaluated_zones": 4,
  "timestamp": "2026-11-06T15:35:00Z"
}
```
- **Error Responses**:
  - `401 Unauthorized`: Invalid or missing `X-Internal-Token`.
