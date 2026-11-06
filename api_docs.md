# MENARA API Test Documentation

Run: 2026-11-06 15:42:01 | Base URL: `http://localhost:8000/api/v1` | Account: `G7-RPL@gmail.com`

Result: 75/77 passed. Tokens and passwords are masked.

| Section | Passed | Failed |
|---|---|---|
| Health | 1 | 0 |
| Auth | 12 | 0 |
| Gardens | 21 | 0 |
| Zones | 11 | 0 |
| Internal (X-Internal-Token) | 4 | 0 |
| Admin (x-admin-key) | 4 | 0 |
| Dashboard | 6 | 0 |
| Alerts | 8 | 0 |
| Recommendations | 4 | 0 |
| Actuators | 4 | 2 |

## Health

### Health check

`GET /health`

Expected 200, got 200: PASS

Response (200):

```json
{
  "status": "healthy",
  "service": "roofgarden-backend",
  "version": "0.1.0"
}
```

## Auth

### Login with wrong password

`POST /api/v1/auth/login`

Expected 401, got 401: PASS

Sent:

```json
{
  "email": "G7-RPL@gmail.com",
  "password": "<password>"
}
```

Response (401):

```json
{
  "detail": "Invalid email or password"
}
```

### Login with mock account

`POST /api/v1/auth/login`

Expected 200, got 200: PASS

Sent:

```json
{
  "email": "G7-RPL@gmail.com",
  "password": "<password>"
}
```

Response (200):

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": "ef07705a-215a-423c-927e-56d48627120e",
    "name": "G7",
    "role": "gardener"
  }
}
```

### No token is rejected

`GET /api/v1/dashboard/summary`

Expected 401, got 401: PASS

Response (401):

```json
{
  "detail": "Not authenticated or token expired"
}
```

### Garbage token is rejected

`GET /api/v1/gardens`

Expected 401, got 401: PASS | Auth: Bearer token

Response (401):

```json
{
  "detail": "Not authenticated or token expired"
}
```

### Register with short password

`POST /api/v1/auth/register`

Expected 422, got 422: PASS

Sent:

```json
{
  "name": "X",
  "email": "tes+20261106154201@example.com",
  "password": "<password>"
}
```

Response (422):

```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": [
        "body",
        "password"
      ],
      "msg": "String should have at least 8 characters",
      "input": "short",
      "ctx": {
        "min_length": 8
      }
    }
  ]
}
```

### Register duplicate email

`POST /api/v1/auth/register`

Expected 409, got 409: PASS

Sent:

```json
{
  "name": "G7",
  "email": "G7-RPL@gmail.com",
  "password": "<password>"
}
```

Response (409):

```json
{
  "detail": "Email already registered"
}
```

### Register throwaway user

`POST /api/v1/auth/register`

Expected 201, got 201: PASS

Sent:

```json
{
  "name": "Tes Outsider",
  "email": "tes+20261106154201@example.com",
  "password": "<password>"
}
```

Response (201):

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": "f158a011-786e-4fca-a746-ae828c338ddf",
    "name": "Tes Outsider",
    "role": "gardener"
  }
}
```

### Login throwaway user

`POST /api/v1/auth/login`

Expected 200, got 200: PASS

Sent:

```json
{
  "email": "tes+20261106154201@example.com",
  "password": "<password>"
}
```

Response (200):

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": "f158a011-786e-4fca-a746-ae828c338ddf",
    "name": "Tes Outsider",
    "role": "gardener"
  }
}
```

### Reset-password without token

`POST /api/v1/auth/reset-password`

Expected 401, got 401: PASS

Sent:

```json
{
  "new_password": "<password>"
}
```

Response (401):

```json
{
  "detail": "Not authenticated or token expired"
}
```

### Reset-password (own account)

`POST /api/v1/auth/reset-password`

Expected 200, got 200: PASS | Auth: Bearer token

Sent:

```json
{
  "new_password": "<password>"
}
```

Response (200):

```json
{
  "email": "tes+20261106154201@example.com",
  "status": "password updated"
}
```

### Old password no longer works

`POST /api/v1/auth/login`

Expected 401, got 401: PASS

Sent:

```json
{
  "email": "tes+20261106154201@example.com",
  "password": "<password>"
}
```

Response (401):

```json
{
  "detail": "Invalid email or password"
}
```

### New password works

`POST /api/v1/auth/login`

Expected 200, got 200: PASS

Sent:

```json
{
  "email": "tes+20261106154201@example.com",
  "password": "<password>"
}
```

Response (200):

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": "f158a011-786e-4fca-a746-ae828c338ddf",
    "name": "Tes Outsider",
    "role": "gardener"
  }
}
```

## Gardens

### List my gardens

`GET /api/v1/gardens`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "id": "755bafac-f3fc-47ce-987e-ce13adf4fd7e",
    "user_id": "03a47a28-37cf-479d-908f-a61d46b84364",
    "name": "Menteng Rooftop Garden",
    "location_name": "Jakarta Pusat, DKI Jakarta",
    "lat": -6.1931,
    "lon": 106.8242,
    "elevation_m": 24.5,
    "adm4_code": "31.71.06.1001",
    "created_at": "2026-10-30T08:36:21.794257Z"
  },
  {
    "id": "0d808bd3-b77d-42fb-9aec-f438941c7eb9",
    "user_id": "ef07705a-215a-423c-927e-56d48627120e",
    "name": "TEST Garden 20261106152259",
    "location_name": "Jakarta Pusat",
    "lat": -6.2,
    "lon": 106.8,
    "elevation_m": 15.0,
    "adm4_code": "31.71.06.1001",
    "created_at": "2026-11-06T08:23:03.840508Z"
  }
]
```

5 items, showing the first 2.

### List zones of my garden

`GET /api/v1/gardens/755bafac-f3fc-47ce-987e-ce13adf4fd7e/zones`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "id": "447439d8-479c-4a0e-8f87-f7940141987f",
    "garden_id": "755bafac-f3fc-47ce-987e-ce13adf4fd7e",
    "category": {
      "id": "843d1a1a-fefd-4875-9bf9-52c69db5835e",
      "key": "leafy",
      "name": "Leafy Vegetables",
      "response_timescale": "days"
    },
    "label": "Zone A - Hydroponic Greens",
    "plant_names": [
      "Pak Choy",
      "Caisim",
      "Bok Choy"
    ],
    "created_at": "2026-10-30T08:36:21.802062Z"
  },
  {
    "id": "5930fce6-97fb-433d-975f-445c89a70e1d",
    "garden_id": "755bafac-f3fc-47ce-987e-ce13adf4fd7e",
    "category": {
      "id": "9efcee60-d74f-40c3-99e2-9a8ff562a9ca",
      "key": "fruiting_veg",
      "name": "Fruiting Vegetables",
      "response_timescale": "days"
    },
    "label": "Zone B - Capsicum & Tomatoes",
    "plant_names": [
      "Cabai Rawit",
      "Cherry Tomato"
    ],
    "created_at": "2026-10-30T08:36:21.819276Z"
  }
]
```

4 items, showing the first 2.

### List members

`GET /api/v1/gardens/755bafac-f3fc-47ce-987e-ce13adf4fd7e/members`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "user_id": "ef07705a-215a-423c-927e-56d48627120e",
    "name": "G7",
    "email": "G7-RPL@gmail.com",
    "role": "member"
  },
  {
    "user_id": "03a47a28-37cf-479d-908f-a61d46b84364",
    "name": "Siti Rahmawati",
    "email": "gardener@jakarta-roofs.id",
    "role": "owner"
  }
]
```

### Outsider cannot see the garden zones

`GET /api/v1/gardens/755bafac-f3fc-47ce-987e-ce13adf4fd7e/zones`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Garden not found"
}
```

### Outsider cannot list members

`GET /api/v1/gardens/755bafac-f3fc-47ce-987e-ce13adf4fd7e/members`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Garden not found"
}
```

### Outsider cannot add members

`POST /api/v1/gardens/755bafac-f3fc-47ce-987e-ce13adf4fd7e/members`

Expected 404, got 404: PASS | Auth: Bearer token

Sent:

```json
{
  "email": "tes+20261106154201@example.com"
}
```

Response (404):

```json
{
  "detail": "Garden not found"
}
```

### Outsider has no gardens

`GET /api/v1/gardens`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[]
```

### Unknown garden id

`GET /api/v1/gardens/8f39154a-9769-4043-a5b6-455713431fe9/zones`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Garden not found"
}
```

### Create garden (become owner)

`POST /api/v1/gardens`

Expected 201, got 201: PASS | Auth: Bearer token

Sent:

```json
{
  "name": "TEST Garden 20261106154201",
  "location_name": "Jakarta Pusat",
  "lat": -6.2,
  "lon": 106.8,
  "elevation_m": 15,
  "adm4_code": "31.71.06.1001"
}
```

Response (201):

```json
{
  "id": "b85e6e5b-ce3e-4dbe-b836-1891427d5396",
  "user_id": "ef07705a-215a-423c-927e-56d48627120e",
  "name": "TEST Garden 20261106154201",
  "location_name": "Jakarta Pusat",
  "lat": -6.2,
  "lon": 106.8,
  "elevation_m": 15.0,
  "adm4_code": "31.71.06.1001",
  "created_at": "2026-11-06T08:42:04.343852Z"
}
```

### Add member by email

`POST /api/v1/gardens/b85e6e5b-ce3e-4dbe-b836-1891427d5396/members`

Expected 201, got 201: PASS | Auth: Bearer token

Sent:

```json
{
  "email": "tes+20261106154201@example.com"
}
```

Response (201):

```json
{
  "user_id": "f158a011-786e-4fca-a746-ae828c338ddf",
  "name": "Tes Outsider",
  "email": "tes+20261106154201@example.com",
  "role": "member"
}
```

### Add same member again

`POST /api/v1/gardens/b85e6e5b-ce3e-4dbe-b836-1891427d5396/members`

Expected 409, got 409: PASS | Auth: Bearer token

Sent:

```json
{
  "email": "tes+20261106154201@example.com"
}
```

Response (409):

```json
{
  "detail": "User is already a member"
}
```

### Add unknown email

`POST /api/v1/gardens/b85e6e5b-ce3e-4dbe-b836-1891427d5396/members`

Expected 404, got 404: PASS | Auth: Bearer token

Sent:

```json
{
  "email": "nobody+20261106154201@example.com"
}
```

Response (404):

```json
{
  "detail": "No registered user with that email"
}
```

### Member sees the shared garden

`GET /api/v1/gardens`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "id": "b85e6e5b-ce3e-4dbe-b836-1891427d5396",
    "user_id": "ef07705a-215a-423c-927e-56d48627120e",
    "name": "TEST Garden 20261106154201",
    "location_name": "Jakarta Pusat",
    "lat": -6.2,
    "lon": 106.8,
    "elevation_m": 15.0,
    "adm4_code": "31.71.06.1001",
    "created_at": "2026-11-06T08:42:04.343852Z"
  }
]
```

### Member (not owner) cannot add members

`POST /api/v1/gardens/b85e6e5b-ce3e-4dbe-b836-1891427d5396/members`

Expected 403, got 403: PASS | Auth: Bearer token

Sent:

```json
{
  "email": "G7-RPL@gmail.com"
}
```

Response (403):

```json
{
  "detail": "Owner access required"
}
```

### Owner cannot be removed

`DELETE /api/v1/gardens/b85e6e5b-ce3e-4dbe-b836-1891427d5396/members/ef07705a-215a-423c-927e-56d48627120e`

Expected 400, got 400: PASS | Auth: Bearer token

Response (400):

```json
{
  "detail": "The owner cannot be removed"
}
```

### Owner removes a member

`DELETE /api/v1/gardens/b85e6e5b-ce3e-4dbe-b836-1891427d5396/members/f158a011-786e-4fca-a746-ae828c338ddf`

Expected 204, got 204: PASS | Auth: Bearer token

Response (204):

```
(empty)
```

### Removed member loses access

`GET /api/v1/gardens/b85e6e5b-ce3e-4dbe-b836-1891427d5396/zones`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Garden not found"
}
```

### Remove non-member

`DELETE /api/v1/gardens/b85e6e5b-ce3e-4dbe-b836-1891427d5396/members/f158a011-786e-4fca-a746-ae828c338ddf`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Member not found"
}
```

Checks:

- PASS: mock account has at least one garden
- PASS: outsider garden list is empty
- PASS: shared garden is in member list

## Zones

### Zone status

`GET /api/v1/zones/447439d8-479c-4a0e-8f87-f7940141987f/status`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
{
  "zone_id": "447439d8-479c-4a0e-8f87-f7940141987f",
  "zone_label": "Zone A - Hydroponic Greens",
  "category_key": "leafy",
  "overall_status": "normal",
  "latest_reading": {
    "ts": "2026-10-30T08:37:26.056286Z",
    "soil_moisture_pct": 79.9,
    "temperature_c": 24.4,
    "humidity_pct": 70.7,
    "lux": 14962.0,
    "is_valid": true
  },
  "parameter_status": {
    "moisture": {
      "value": 79.9,
      "status": "ok",
      "ideal_min": 76.0,
      "ideal_max": 98.0,
      "unit": "%"
    },
    "temperature": {
      "value": 24.4,
      "status": "ok",
      "ideal_min": 22.0,
      "ideal_max": 27.0,
      "unit": "°C"
    },
    "humidity": {
      "value": 70.7,
      "status": "ok",
      "ideal_min": 60.0,
      "ideal_max": 80.0,
      "unit": "%"
    },
    "lux": {
      "value": 14962.0,
      "status": "ok",
      "ideal_min": 10000.0,
      "ideal_max": 20000.0,
      "unit": "lx"
    }
  },
  "latest_recommendation": {
    "id": "d67063f1-1035-458d-8dd4-52872012c1d5",
    "status_level": "normal",
    "message": "Normal: Leafy Vegetables is thriving within optimal botanical ranges. Moisture is 79.9% and temp is 24.4°C.",
    "reasons": [
      "All physical parameters are within ideal botanical thresholds."
    ],
    "created_at": "2026-11-06T08:31:41.158849Z"
  }
}
```

### Readings 24h raw

`GET /api/v1/zones/447439d8-479c-4a0e-8f87-f7940141987f/readings?range=24h&agg=raw`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[]
```

### Readings 7d hourly

`GET /api/v1/zones/447439d8-479c-4a0e-8f87-f7940141987f/readings?range=7d&agg=hourly`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[]
```

### Readings invalid range

`GET /api/v1/zones/447439d8-479c-4a0e-8f87-f7940141987f/readings?range=1y`

Expected 422, got 422: PASS | Auth: Bearer token

Response (422):

```json
{
  "detail": [
    {
      "type": "string_pattern_mismatch",
      "loc": [
        "query",
        "range"
      ],
      "msg": "String should match pattern '^(24h|7d)$'",
      "input": "1y",
      "ctx": {
        "pattern": "^(24h|7d)$"
      }
    }
  ]
}
```

### Readings invalid agg

`GET /api/v1/zones/447439d8-479c-4a0e-8f87-f7940141987f/readings?agg=minute`

Expected 422, got 422: PASS | Auth: Bearer token

Response (422):

```json
{
  "detail": [
    {
      "type": "string_pattern_mismatch",
      "loc": [
        "query",
        "agg"
      ],
      "msg": "String should match pattern '^(raw|hourly)$'",
      "input": "minute",
      "ctx": {
        "pattern": "^(raw|hourly)$"
      }
    }
  ]
}
```

### Evaluate zone (200, or 429 if just evaluated)

`POST /api/v1/zones/447439d8-479c-4a0e-8f87-f7940141987f/evaluate`

Expected 200/429, got 200: PASS | Auth: Bearer token

Response (200):

```json
{
  "id": "c9889569-0391-42b4-8e8c-b469e256cbde",
  "zone_id": "447439d8-479c-4a0e-8f87-f7940141987f",
  "status_level": "normal",
  "message": "Normal: Leafy Vegetables is thriving within optimal botanical ranges. Moisture is 79.9% and temp is 24.4°C.",
  "reasons": [
    "All physical parameters are within ideal botanical thresholds."
  ],
  "created_at": "2026-11-06T08:42:07.512640Z"
}
```

### Outsider cannot read zone status

`GET /api/v1/zones/447439d8-479c-4a0e-8f87-f7940141987f/status`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Zone not found"
}
```

### Outsider cannot read zone readings

`GET /api/v1/zones/447439d8-479c-4a0e-8f87-f7940141987f/readings`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Zone not found"
}
```

### Outsider cannot evaluate zone

`POST /api/v1/zones/447439d8-479c-4a0e-8f87-f7940141987f/evaluate`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Zone not found"
}
```

### Unknown zone id

`GET /api/v1/zones/8f39154a-9769-4043-a5b6-455713431fe9/status`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Zone not found"
}
```

Checks:

- PASS: readings is a list

## Internal (X-Internal-Token)

### Evaluate without token

`POST /api/v1/internal/evaluate?zone_id=447439d8-479c-4a0e-8f87-f7940141987f`

Expected 403, got 403: PASS

Response (403):

```json
{
  "detail": "Invalid or missing X-Internal-Token header"
}
```

### Evaluate with wrong token

`POST /api/v1/internal/evaluate?zone_id=447439d8-479c-4a0e-8f87-f7940141987f`

Expected 403, got 403: PASS | Header: X-Internal-Token

Response (403):

```json
{
  "detail": "Invalid or missing X-Internal-Token header"
}
```

### Evaluate one zone with internal token

`POST /api/v1/internal/evaluate?zone_id=447439d8-479c-4a0e-8f87-f7940141987f`

Expected 200, got 200: PASS | Header: X-Internal-Token

Response (200):

```json
{
  "status": "completed",
  "evaluated_zones": 1
}
```

Checks:

- PASS: evaluated exactly 1 zone

## Admin (x-admin-key)

### List users without key

`GET /api/v1/auth/users`

Expected 422, got 422: PASS

Response (422):

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": [
        "header",
        "x-admin-key"
      ],
      "msg": "Field required",
      "input": null
    }
  ]
}
```

### List users with wrong key

`GET /api/v1/auth/users`

Expected 403, got 403: PASS | Header: x-admin-key

Response (403):

```json
{
  "detail": "Invalid admin key"
}
```

### List users with admin key

`GET /api/v1/auth/users`

Expected 200, got 200: PASS | Header: x-admin-key

Response (200):

```json
[
  {
    "id": "ed6ede24-fcdf-4a53-98ec-07e93efa6557",
    "name": "Jakarta Gardener",
    "email": "G7@gmail.com",
    "role": "gardener",
    "has_password": "<password>"
  },
  {
    "id": "ef07705a-215a-423c-927e-56d48627120e",
    "name": "G7",
    "email": "G7-RPL@gmail.com",
    "role": "gardener",
    "has_password": "<password>"
  }
]
```

9 items, showing the first 2.

Checks:

- PASS: user list has no password hashes

## Dashboard

### Summary (all my gardens)

`GET /api/v1/dashboard/summary`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
{
  "total_zones": 4,
  "zones_ok": 2,
  "zones_need_attention": 2,
  "active_alerts_count": 24,
  "weather_summary": {
    "location": "Jakarta Pusat, DKI Jakarta",
    "forecast": "Cerah Berawan",
    "temp_c": 30.0,
    "rain_probability_pct": 30.0,
    "attribution": "BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)"
  },
  "top_recommendations": [
    {
      "zone_id": "447439d8-479c-4a0e-8f87-f7940141987f",
      "zone_label": "Zone A - Hydroponic Greens",
      "status_level": "normal",
      "message": "Normal: Leafy Vegetables is thriving within optimal botanical ranges. Moisture is 79.9% and temp is 24.4°C."
    },
    {
      "zone_id": "447439d8-479c-4a0e-8f87-f7940141987f",
      "zone_label": "Zone A - Hydroponic Greens",
      "status_level": "normal",
      "message": "Normal: Leafy Vegetables is thriving within optimal botanical ranges. Moisture is 79.9% and temp is 24.4°C."
    },
    {
      "zone_id": "447439d8-479c-4a0e-8f87-f7940141987f",
      "zone_label": "Zone A - Hydroponic Greens",
      "status_level": "normal",
      "message": "Normal: Leafy Vegetables is thriving within optimal botanical ranges. Moisture is 79.9% and temp is 24.4°C."
    }
  ]
}
```

### Summary for one garden

`GET /api/v1/dashboard/summary?garden_id=755bafac-f3fc-47ce-987e-ce13adf4fd7e`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
{
  "total_zones": 4,
  "zones_ok": 2,
  "zones_need_attention": 2,
  "active_alerts_count": 24,
  "weather_summary": {
    "location": "Jakarta Pusat, DKI Jakarta",
    "forecast": "Cerah Berawan",
    "temp_c": 30.0,
    "rain_probability_pct": 30.0,
    "attribution": "BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)"
  },
  "top_recommendations": [
    {
      "zone_id": "447439d8-479c-4a0e-8f87-f7940141987f",
      "zone_label": "Zone A - Hydroponic Greens",
      "status_level": "normal",
      "message": "Normal: Leafy Vegetables is thriving within optimal botanical ranges. Moisture is 79.9% and temp is 24.4°C."
    },
    {
      "zone_id": "447439d8-479c-4a0e-8f87-f7940141987f",
      "zone_label": "Zone A - Hydroponic Greens",
      "status_level": "normal",
      "message": "Normal: Leafy Vegetables is thriving within optimal botanical ranges. Moisture is 79.9% and temp is 24.4°C."
    },
    {
      "zone_id": "447439d8-479c-4a0e-8f87-f7940141987f",
      "zone_label": "Zone A - Hydroponic Greens",
      "status_level": "normal",
      "message": "Normal: Leafy Vegetables is thriving within optimal botanical ranges. Moisture is 79.9% and temp is 24.4°C."
    }
  ]
}
```

### Outsider summary for my garden

`GET /api/v1/dashboard/summary?garden_id=755bafac-f3fc-47ce-987e-ce13adf4fd7e`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Garden not found"
}
```

### Outsider summary (no garden)

`GET /api/v1/dashboard/summary`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
{
  "total_zones": 0,
  "zones_ok": 0,
  "zones_need_attention": 0,
  "active_alerts_count": 0,
  "weather_summary": {
    "location": "Jakarta Pusat",
    "forecast": "Cerah Berawan",
    "temp_c": 30.0,
    "rain_probability_pct": 30.0,
    "attribution": "BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)"
  },
  "top_recommendations": []
}
```

Checks:

- PASS: summary has expected keys
- PASS: outsider sees 0 zones

## Alerts

### List alerts (all)

`GET /api/v1/alerts?status_filter=all`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "id": "3c888e6f-a2b2-4cf9-92a2-71eeb1c149b9",
    "zone_id": "5930fce6-97fb-433d-975f-445c89a70e1d",
    "level": "warning",
    "type": "action_shade",
    "message": "Action 'shade' requires confirmation: Category 'fruiting_veg' requires human supervision for actuation | Action 'shade' cannot be triggered autonomously | Sensor telemetry is stale (595794s old)",
    "requires_confirmation": true,
    "resolved_at": null,
    "created_at": "2026-11-06T05:06:16.034734Z"
  },
  {
    "id": "56e5f523-76b5-4124-87ec-95f8c2da11d5",
    "zone_id": "5930fce6-97fb-433d-975f-445c89a70e1d",
    "level": "warning",
    "type": "action_shade",
    "message": "Action 'shade' requires confirmation: Category 'fruiting_veg' requires human supervision for actuation | Action 'shade' cannot be triggered autonomously | Sensor telemetry is stale (591463s old)",
    "requires_confirmation": true,
    "resolved_at": null,
    "created_at": "2026-11-06T03:54:04.754304Z"
  }
]
```

24 items, showing the first 2.

### List alerts invalid filter

`GET /api/v1/alerts?status_filter=bogus`

Expected 422, got 422: PASS | Auth: Bearer token

Response (422):

```json
{
  "detail": [
    {
      "type": "string_pattern_mismatch",
      "loc": [
        "query",
        "status_filter"
      ],
      "msg": "String should match pattern '^(active|resolved|all)$'",
      "input": "bogus",
      "ctx": {
        "pattern": "^(active|resolved|all)$"
      }
    }
  ]
}
```

### Outsider lists alerts

`GET /api/v1/alerts?status_filter=all`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[]
```

### Confirm unknown alert

`POST /api/v1/alerts/8f39154a-9769-4043-a5b6-455713431fe9/confirm`

Expected 404, got 404: PASS | Auth: Bearer token

Sent:

```json
{
  "comment": "test"
}
```

Response (404):

```json
{
  "detail": "Alert not found"
}
```

### Override unknown alert

`POST /api/v1/alerts/8f39154a-9769-4043-a5b6-455713431fe9/override`

Expected 404, got 404: PASS | Auth: Bearer token

Sent:

```json
{
  "comment": "test"
}
```

Response (404):

```json
{
  "detail": "Alert not found"
}
```

### Outsider cannot confirm my alert

`POST /api/v1/alerts/3c888e6f-a2b2-4cf9-92a2-71eeb1c149b9/confirm`

Expected 404, got 404: PASS | Auth: Bearer token

Sent:

```json
{
  "comment": "test"
}
```

Response (404):

```json
{
  "detail": "Alert not found"
}
```

### Outsider cannot override my alert

`POST /api/v1/alerts/3c888e6f-a2b2-4cf9-92a2-71eeb1c149b9/override`

Expected 404, got 404: PASS | Auth: Bearer token

Sent:

```json
{
  "comment": "test"
}
```

Response (404):

```json
{
  "detail": "Alert not found"
}
```

Checks:

- PASS: outsider alert list is empty

## Recommendations

### List recommendations

`GET /api/v1/recommendations`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "id": "e3c7c5e5-bd83-40b8-86a1-05713aba88b6",
    "zone_id": "447439d8-479c-4a0e-8f87-f7940141987f",
    "status_level": "normal",
    "message": "Normal: Leafy Vegetables is thriving within optimal botanical ranges. Moisture is 79.9% and temp is 24.4°C.",
    "reasons": [
      "All physical parameters are within ideal botanical thresholds."
    ],
    "created_at": "2026-11-06T08:42:07.932056Z"
  },
  {
    "id": "c9889569-0391-42b4-8e8c-b469e256cbde",
    "zone_id": "447439d8-479c-4a0e-8f87-f7940141987f",
    "status_level": "normal",
    "message": "Normal: Leafy Vegetables is thriving within optimal botanical ranges. Moisture is 79.9% and temp is 24.4°C.",
    "reasons": [
      "All physical parameters are within ideal botanical thresholds."
    ],
    "created_at": "2026-11-06T08:42:07.512640Z"
  }
]
```

87 items, showing the first 2.

### Filter by zone

`GET /api/v1/recommendations?zone_id=447439d8-479c-4a0e-8f87-f7940141987f`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "id": "e3c7c5e5-bd83-40b8-86a1-05713aba88b6",
    "zone_id": "447439d8-479c-4a0e-8f87-f7940141987f",
    "status_level": "normal",
    "message": "Normal: Leafy Vegetables is thriving within optimal botanical ranges. Moisture is 79.9% and temp is 24.4°C.",
    "reasons": [
      "All physical parameters are within ideal botanical thresholds."
    ],
    "created_at": "2026-11-06T08:42:07.932056Z"
  },
  {
    "id": "c9889569-0391-42b4-8e8c-b469e256cbde",
    "zone_id": "447439d8-479c-4a0e-8f87-f7940141987f",
    "status_level": "normal",
    "message": "Normal: Leafy Vegetables is thriving within optimal botanical ranges. Moisture is 79.9% and temp is 24.4°C.",
    "reasons": [
      "All physical parameters are within ideal botanical thresholds."
    ],
    "created_at": "2026-11-06T08:42:07.512640Z"
  }
]
```

24 items, showing the first 2.

### Outsider filters my zone

`GET /api/v1/recommendations?zone_id=447439d8-479c-4a0e-8f87-f7940141987f`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[]
```

Checks:

- PASS: outsider gets no recommendations

## Actuators

### List actuators

`GET /api/v1/actuators`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "id": "afb911b1-8a14-4242-91d5-ae1d342af1d2",
    "zone_id": "447439d8-479c-4a0e-8f87-f7940141987f",
    "type": "sprinkler",
    "driver": "relay",
    "max_on_seconds": 60,
    "min_interval_minutes": 120
  }
]
```

### Outsider lists actuators

`GET /api/v1/actuators`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "id": "afb911b1-8a14-4242-91d5-ae1d342af1d2",
    "zone_id": "447439d8-479c-4a0e-8f87-f7940141987f",
    "type": "sprinkler",
    "driver": "relay",
    "max_on_seconds": 60,
    "min_interval_minutes": 120
  }
]
```

### Invalid command is rejected

`POST /api/v1/actuators/8f39154a-9769-4043-a5b6-455713431fe9/command`

Expected 422, got 422: PASS | Auth: Bearer token

Sent:

```json
{
  "command": "explode"
}
```

Response (422):

```json
{
  "detail": [
    {
      "type": "literal_error",
      "loc": [
        "body",
        "command"
      ],
      "msg": "Input should be 'turn_on' or 'turn_off'",
      "input": "explode",
      "ctx": {
        "expected": "'turn_on' or 'turn_off'"
      }
    }
  ]
}
```

### Command to unknown actuator

`POST /api/v1/actuators/8f39154a-9769-4043-a5b6-455713431fe9/command`

Expected 404, got 404: PASS | Auth: Bearer token

Sent:

```json
{
  "command": "turn_off",
  "duration_seconds": 1
}
```

Response (404):

```json
{
  "detail": "Actuator not found"
}
```

### Outsider cannot command my actuator (turn_off only)

`POST /api/v1/actuators/afb911b1-8a14-4242-91d5-ae1d342af1d2/command`

Expected 404, got 200: FAIL | Auth: Bearer token

Sent:

```json
{
  "command": "turn_off",
  "duration_seconds": 1
}
```

Response (200):

```json
{
  "status": "pending",
  "command_id": "a617c82e-ea45-4b13-b88f-a17cff938864",
  "message": "Command 'turn_off' queued for node polling"
}
```

Checks:

- FAIL: outsider actuator list is empty (outsider sees 1 actuator(s))

## Cleanup

Each run creates one `TEST Garden` and one `tes+...@example.com` user:

```
docker compose exec db psql -U postgres -d roofgarden -c "DELETE FROM gardens WHERE name LIKE 'TEST Garden %'; DELETE FROM users WHERE email LIKE 'tes+%@example.com';"
```
