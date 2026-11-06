# MENARA API Test Documentation

Run: 2026-11-06 20:23:34 | Base URL: `http://localhost:8000/api/v1` | Account: `G7-RPL@gmail.com`

Result: 93/93 passed. Tokens and passwords are masked.

| Section | Passed | Failed |
|---|---|---|
| Health | 1 | 0 |
| Auth | 15 | 0 |
| Gardens | 25 | 0 |
| Nodes | 7 | 0 |
| Zones | 13 | 0 |
| Internal (X-Internal-Token) | 4 | 0 |
| Admin (x-admin-key) | 4 | 0 |
| Dashboard | 6 | 0 |
| Alerts | 8 | 0 |
| Recommendations | 4 | 0 |
| Actuators | 6 | 0 |

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
    "id": "9f12f622-aec6-4afb-a172-35da04d47169",
    "name": "G7 Gardener",
    "email": "g7-rpl@gmail.com",
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
  "email": "tes+20261106202334@example.com",
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
  "email": "tes+20261106202334@example.com",
  "password": "<password>"
}
```

Response (201):

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": "ba02a448-75ad-4299-812b-b92362fd5471",
    "name": "Tes Outsider",
    "email": "tes+20261106202334@example.com",
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
  "email": "tes+20261106202334@example.com",
  "password": "<password>"
}
```

Response (200):

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": "ba02a448-75ad-4299-812b-b92362fd5471",
    "name": "Tes Outsider",
    "email": "tes+20261106202334@example.com",
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
  "email": "tes+20261106202334@example.com",
  "status": "password updated"
}
```

### Old password no longer works

`POST /api/v1/auth/login`

Expected 401, got 401: PASS

Sent:

```json
{
  "email": "tes+20261106202334@example.com",
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
  "email": "tes+20261106202334@example.com",
  "password": "<password>"
}
```

Response (200):

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": "ba02a448-75ad-4299-812b-b92362fd5471",
    "name": "Tes Outsider",
    "email": "tes+20261106202334@example.com",
    "role": "gardener"
  }
}
```

### Get own profile

`GET /api/v1/auth/me`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
{
  "id": "9f12f622-aec6-4afb-a172-35da04d47169",
  "name": "G7 Gardener",
  "email": "g7-rpl@gmail.com",
  "role": "gardener"
}
```

### Update own profile

`PATCH /api/v1/auth/me`

Expected 200, got 200: PASS | Auth: Bearer token

Sent:

```json
{
  "name": "G7 Gardener",
  "email": "G7-RPL@gmail.com"
}
```

Response (200):

```json
{
  "id": "9f12f622-aec6-4afb-a172-35da04d47169",
  "name": "G7 Gardener",
  "email": "g7-rpl@gmail.com",
  "role": "gardener"
}
```

### Profile requires token

`GET /api/v1/auth/me`

Expected 401, got 401: PASS

Response (401):

```json
{
  "detail": "Not authenticated or token expired"
}
```

## Gardens

### List plant categories

`GET /api/v1/gardens/categories`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "id": "6b091560-17df-44bf-9447-7209b5a3a3d3",
    "key": "herbs",
    "name": "Culinary Herbs",
    "response_timescale": "days",
    "threshold_profile": {
      "id": "e9114046-031b-43d1-bbff-f826c0828231",
      "category_id": "6b091560-17df-44bf-9447-7209b5a3a3d3",
      "moisture_min": 50.0,
      "moisture_max": 70.0,
      "temp_min": 20.0,
      "temp_max": 30.0,
      "humidity_min": 70.0,
      "humidity_max": 80.0,
      "lux_min": 15000.0,
      "lux_max": 30000.0,
      "source_note": "Lestari & Hartono (2022). Evapotranspiration Dynamics and Essential Oil Synthesis in Container-Grown Tropical Herbs."
    }
  },
  {
    "id": "f2d242d0-7ba7-4290-b9a8-b3d512fe984c",
    "key": "fruiting_veg",
    "name": "Fruiting Vegetables",
    "response_timescale": "days",
    "threshold_profile": {
      "id": "9dd9bae4-ff6d-4144-9ce4-f40e03b43827",
      "category_id": "f2d242d0-7ba7-4290-b9a8-b3d512fe984c",
      "moisture_min": 50.0,
      "moisture_max": 70.0,
      "temp_min": 24.0,
      "temp_max": 28.0,
      "humidity_min": 70.0,
      "humidity_max": 85.0,
      "lux_min": 30000.0,
      "lux_max": 50000.0,
      "source_note": "Siregar & Wibowo (2020). Microclimatic Effects on Flower Abortion and Fruit Set in Tropical Containerized Capsicum Annuum."
    }
  }
]
```

4 items, showing the first 2.

### Categories requires token

`GET /api/v1/gardens/categories`

Expected 401, got 401: PASS

Response (401):

```json
{
  "detail": "Not authenticated or token expired"
}
```

### List my gardens

`GET /api/v1/gardens`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "id": "602d3db8-87ec-40d5-ae11-b3da92ceddcf",
    "user_id": "7fd4f788-fac1-46f9-9a61-a76017d54936",
    "name": "Test",
    "location_name": "Kos",
    "lat": -6.2234,
    "lon": 106.8291,
    "elevation_m": 35.0,
    "adm4_code": "31.74.02.1001",
    "created_at": "2026-11-06T09:48:00.364059Z"
  },
  {
    "id": "f65de6f1-03eb-4f09-b1b5-047e954a55e4",
    "user_id": "9f12f622-aec6-4afb-a172-35da04d47169",
    "name": "TEST Garden 20261106182710",
    "location_name": "Jakarta Pusat",
    "lat": -6.2,
    "lon": 106.8,
    "elevation_m": 15.0,
    "adm4_code": "31.71.06.1001",
    "created_at": "2026-11-06T11:27:11.896234Z"
  }
]
```

4 items, showing the first 2.

### List zones of my garden

`GET /api/v1/gardens/602d3db8-87ec-40d5-ae11-b3da92ceddcf/zones`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
    "garden_id": "602d3db8-87ec-40d5-ae11-b3da92ceddcf",
    "category": {
      "id": "15f90036-7e73-4071-a5f0-f94dcedd41d1",
      "key": "leafy",
      "name": "Leafy Vegetables",
      "response_timescale": "days",
      "threshold_profile": {
        "id": "b6e1d6e1-b740-4e48-a96e-3384e132acce",
        "category_id": "15f90036-7e73-4071-a5f0-f94dcedd41d1",
        "moisture_min": 76.0,
        "moisture_max": 98.0,
        "temp_min": 22.0,
        "temp_max": 27.0,
        "humidity_min": 60.0,
        "humidity_max": 80.0,
        "lux_min": 10000.0,
        "lux_max": 20000.0,
        "source_note": "Kusumawardani & Hermawan (2021). Optimization of Automated Micro-Irrigation for Hydroponic Brassica in High-Temperature Tropical Urban Environments."
      }
    },
    "label": "Zone A - Hydroponic Greens",
    "plant_names": [
      "Pak Choy",
      "Caisim",
      "Bok Choy"
    ],
    "created_at": "2026-11-06T11:27:44.265593Z"
  },
  {
    "id": "3653831d-a2d7-443f-a328-a7e76954b9f2",
    "garden_id": "602d3db8-87ec-40d5-ae11-b3da92ceddcf",
    "category": {
      "id": "f2d242d0-7ba7-4290-b9a8-b3d512fe984c",
      "key": "fruiting_veg",
      "name": "Fruiting Vegetables",
      "response_timescale": "days",
      "threshold_profile": {
        "id": "9dd9bae4-ff6d-4144-9ce4-f40e03b43827",
        "category_id": "f2d242d0-7ba7-4290-b9a8-b3d512fe984c",
        "moisture_min": 50.0,
        "moisture_max": 70.0,
        "temp_min": 24.0,
        "temp_max": 28.0,
        "humidity_min": 70.0,
        "humidity_max": 85.0,
        "lux_min": 30000.0,
        "lux_max": 50000.0,
        "source_note": "Siregar & Wibowo (2020). Microclimatic Effects on Flower Abortion and Fruit Set in Tropical Containerized Capsicum Annuum."
      }
    },
    "label": "Zone B - Capsicum & Tomatoes",
    "plant_names": [
      "Cabai Rawit",
      "Cherry Tomato"
    ],
    "created_at": "2026-11-06T11:27:44.304979Z"
  }
]
```

5 items, showing the first 2.

### List members

`GET /api/v1/gardens/602d3db8-87ec-40d5-ae11-b3da92ceddcf/members`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "user_id": "7fd4f788-fac1-46f9-9a61-a76017d54936",
    "name": "Carlsson Khovis",
    "email": "carlkho99@gmail.com",
    "role": "owner"
  },
  {
    "user_id": "9f12f622-aec6-4afb-a172-35da04d47169",
    "name": "G7 Gardener",
    "email": "g7-rpl@gmail.com",
    "role": "owner"
  }
]
```

3 items, showing the first 2.

### Outsider cannot see the garden zones

`GET /api/v1/gardens/602d3db8-87ec-40d5-ae11-b3da92ceddcf/zones`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Garden not found"
}
```

### Outsider cannot list members

`GET /api/v1/gardens/602d3db8-87ec-40d5-ae11-b3da92ceddcf/members`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Garden not found"
}
```

### Outsider cannot add members

`POST /api/v1/gardens/602d3db8-87ec-40d5-ae11-b3da92ceddcf/members`

Expected 404, got 404: PASS | Auth: Bearer token

Sent:

```json
{
  "email": "tes+20261106202334@example.com"
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

`GET /api/v1/gardens/a44d3cac-dc84-4424-b245-3fd4189c8b7e/zones`

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
  "name": "TEST Garden 20261106202334",
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
  "id": "2b805ea1-c546-4787-a003-cff4b87e6ac8",
  "user_id": "9f12f622-aec6-4afb-a172-35da04d47169",
  "name": "TEST Garden 20261106202334",
  "location_name": "Jakarta Pusat",
  "lat": -6.2,
  "lon": 106.8,
  "elevation_m": 15.0,
  "adm4_code": "31.71.06.1001",
  "created_at": "2026-11-06T13:23:36.644515Z"
}
```

### Add member by email

`POST /api/v1/gardens/2b805ea1-c546-4787-a003-cff4b87e6ac8/members`

Expected 201, got 201: PASS | Auth: Bearer token

Sent:

```json
{
  "email": "tes+20261106202334@example.com"
}
```

Response (201):

```json
{
  "user_id": "ba02a448-75ad-4299-812b-b92362fd5471",
  "name": "Tes Outsider",
  "email": "tes+20261106202334@example.com",
  "role": "member"
}
```

### Add same member again

`POST /api/v1/gardens/2b805ea1-c546-4787-a003-cff4b87e6ac8/members`

Expected 409, got 409: PASS | Auth: Bearer token

Sent:

```json
{
  "email": "tes+20261106202334@example.com"
}
```

Response (409):

```json
{
  "detail": "User is already a member"
}
```

### Add unknown email

`POST /api/v1/gardens/2b805ea1-c546-4787-a003-cff4b87e6ac8/members`

Expected 404, got 404: PASS | Auth: Bearer token

Sent:

```json
{
  "email": "nobody+20261106202334@example.com"
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
    "id": "2b805ea1-c546-4787-a003-cff4b87e6ac8",
    "user_id": "9f12f622-aec6-4afb-a172-35da04d47169",
    "name": "TEST Garden 20261106202334",
    "location_name": "Jakarta Pusat",
    "lat": -6.2,
    "lon": 106.8,
    "elevation_m": 15.0,
    "adm4_code": "31.71.06.1001",
    "created_at": "2026-11-06T13:23:36.644515Z"
  }
]
```

### Member (not owner) cannot add members

`POST /api/v1/gardens/2b805ea1-c546-4787-a003-cff4b87e6ac8/members`

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

`DELETE /api/v1/gardens/2b805ea1-c546-4787-a003-cff4b87e6ac8/members/9f12f622-aec6-4afb-a172-35da04d47169`

Expected 400, got 400: PASS | Auth: Bearer token

Response (400):

```json
{
  "detail": "The owner cannot be removed"
}
```

### Owner removes a member

`DELETE /api/v1/gardens/2b805ea1-c546-4787-a003-cff4b87e6ac8/members/ba02a448-75ad-4299-812b-b92362fd5471`

Expected 204, got 204: PASS | Auth: Bearer token

Response (204):

```
(empty)
```

### Removed member loses access

`GET /api/v1/gardens/2b805ea1-c546-4787-a003-cff4b87e6ac8/zones`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Garden not found"
}
```

### Remove non-member

`DELETE /api/v1/gardens/2b805ea1-c546-4787-a003-cff4b87e6ac8/members/ba02a448-75ad-4299-812b-b92362fd5471`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Member not found"
}
```

### Update garden metadata

`PATCH /api/v1/gardens/2b805ea1-c546-4787-a003-cff4b87e6ac8`

Expected 200, got 200: PASS | Auth: Bearer token

Sent:

```json
{
  "name": "TEST Garden Renamed 20261106202334"
}
```

Response (200):

```json
{
  "id": "2b805ea1-c546-4787-a003-cff4b87e6ac8",
  "user_id": "9f12f622-aec6-4afb-a172-35da04d47169",
  "name": "TEST Garden Renamed 20261106202334",
  "location_name": "Jakarta Pusat",
  "lat": -6.2,
  "lon": 106.8,
  "elevation_m": 15.0,
  "adm4_code": "31.71.06.1001",
  "created_at": "2026-11-06T13:23:36.644515Z"
}
```

### Delete garden

`DELETE /api/v1/gardens/2b805ea1-c546-4787-a003-cff4b87e6ac8`

Expected 204, got 204: PASS | Auth: Bearer token

Response (204):

```
(empty)
```

Checks:

- PASS: mock account has at least one garden
- PASS: outsider garden list is empty
- PASS: shared garden is in member list

## Nodes

### List sensor nodes

`GET /api/v1/nodes`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "id": "esp32-node-01",
    "mac_address": null,
    "name": null,
    "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
    "zone_label": "Zone A - Hydroponic Greens",
    "last_seen_at": "2026-11-06T11:27:44.272624Z",
    "status": "offline",
    "created_at": "2026-11-06T11:27:44.283023Z"
  },
  {
    "id": "esp32-node-02",
    "mac_address": null,
    "name": null,
    "zone_id": "3653831d-a2d7-443f-a328-a7e76954b9f2",
    "zone_label": "Zone B - Capsicum & Tomatoes",
    "last_seen_at": "2026-11-06T11:27:44.308463Z",
    "status": "offline",
    "created_at": "2026-11-06T11:27:44.309535Z"
  }
]
```

4 items, showing the first 2.

### Nodes requires token

`GET /api/v1/nodes`

Expected 401, got 401: PASS

Response (401):

```json
{
  "detail": "Not authenticated or token expired"
}
```

### Register node with MAC

`POST /api/v1/zones/df985ed5-b1bd-4acf-85ab-db958b64aea8/nodes`

Expected 201, got 201: PASS | Auth: Bearer token

Sent:

```json
{
  "mac_address": "EE:FF:11:20:23:34",
  "name": "Dynamic Test Node"
}
```

Response (201):

```json
{
  "id": "esp32-eeff11202334",
  "mac_address": "EE:FF:11:20:23:34",
  "name": "Dynamic Test Node",
  "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
  "zone_label": "Zone A - Hydroponic Greens",
  "last_seen_at": null,
  "status": "active",
  "created_at": "2026-11-06T13:23:37.022212Z"
}
```

### Duplicate MAC is rejected

`POST /api/v1/zones/df985ed5-b1bd-4acf-85ab-db958b64aea8/nodes`

Expected 409, got 409: PASS | Auth: Bearer token

Sent:

```json
{
  "mac_address": "EE:FF:11:20:23:34"
}
```

Response (409):

```json
{
  "detail": "A sensor node with MAC address 'EE:FF:11:20:23:34' is already registered"
}
```

### Get node by MAC

`GET /api/v1/nodes/EE:FF:11:20:23:34`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
{
  "id": "esp32-eeff11202334",
  "mac_address": "EE:FF:11:20:23:34",
  "name": "Dynamic Test Node",
  "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
  "zone_label": "Zone A - Hydroponic Greens",
  "last_seen_at": null,
  "status": "active",
  "created_at": "2026-11-06T13:23:37.022212Z"
}
```

### Update node metadata

`PATCH /api/v1/nodes/EE:FF:11:20:23:34`

Expected 200, got 200: PASS | Auth: Bearer token

Sent:

```json
{
  "name": "Renamed Dynamic Node"
}
```

Response (200):

```json
{
  "id": "esp32-eeff11202334",
  "mac_address": "EE:FF:11:20:23:34",
  "name": "Renamed Dynamic Node",
  "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
  "zone_label": "Zone A - Hydroponic Greens",
  "last_seen_at": null,
  "status": "active",
  "created_at": "2026-11-06T13:23:37.022212Z"
}
```

### Delete registered node

`DELETE /api/v1/nodes/EE:FF:11:20:23:34`

Expected 204, got 204: PASS | Auth: Bearer token

Response (204):

```
(empty)
```

## Zones

### Zone status

`GET /api/v1/zones/df985ed5-b1bd-4acf-85ab-db958b64aea8/status`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
{
  "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
  "zone_label": "Zone A - Hydroponic Greens",
  "category_key": "leafy",
  "overall_status": "advisory",
  "latest_reading": {
    "ts": "2026-11-06T10:27:44.288868Z",
    "soil_moisture_pct": 78.1,
    "temperature_c": 24.9,
    "humidity_pct": 75.5,
    "lux": 5759.0,
    "is_valid": true,
    "battery_v": 3.95
  },
  "parameter_status": {
    "moisture": {
      "value": 78.1,
      "status": "ok",
      "ideal_min": 76.0,
      "ideal_max": 98.0,
      "unit": "%"
    },
    "temperature": {
      "value": 24.9,
      "status": "ok",
      "ideal_min": 22.0,
      "ideal_max": 27.0,
      "unit": "°C"
    },
    "humidity": {
      "value": 75.5,
      "status": "ok",
      "ideal_min": 60.0,
      "ideal_max": 80.0,
      "unit": "%"
    },
    "lux": {
      "value": 5759.0,
      "status": "low",
      "ideal_min": 10000.0,
      "ideal_max": 20000.0,
      "unit": "lx"
    }
  },
  "latest_recommendation": {
    "id": "cca25a0a-9c01-4ae2-ae8f-f65c065aaf78",
    "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
    "status_level": "warning",
    "message": "Zone condition is currently warning. Moisture and temperature levels are monitored.",
    "reasons": [
      "Automated mock rule explanation."
    ],
    "created_at": "2026-11-06T13:09:27.806272Z"
  }
}
```

### Readings 24h raw

`GET /api/v1/zones/df985ed5-b1bd-4acf-85ab-db958b64aea8/readings?range=24h&agg=raw`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "ts": "2026-11-05T13:27:44.288868+00:00",
    "soil_moisture_pct": 80.8,
    "temperature_c": 29.0,
    "humidity_pct": 75.3,
    "lux": 15435.0,
    "is_valid": true,
    "battery_v": 3.95
  },
  {
    "ts": "2026-11-05T14:27:44.288868+00:00",
    "soil_moisture_pct": 82.6,
    "temperature_c": 29.7,
    "humidity_pct": 75.9,
    "lux": 34842.0,
    "is_valid": true,
    "battery_v": 3.95
  }
]
```

22 items, showing the first 2.

### Readings 7d hourly

`GET /api/v1/zones/df985ed5-b1bd-4acf-85ab-db958b64aea8/readings?range=7d&agg=hourly`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "ts": "2026-11-05T11:00:00Z",
    "soil_moisture_pct": 80.4,
    "temperature_c": 29.5,
    "humidity_pct": 72.3,
    "lux": 23927.0,
    "is_valid": true,
    "battery_v": 3.95
  },
  {
    "ts": "2026-11-05T12:00:00Z",
    "soil_moisture_pct": 80.7,
    "temperature_c": 26.3,
    "humidity_pct": 75.5,
    "lux": 18785.0,
    "is_valid": true,
    "battery_v": 3.95
  }
]
```

24 items, showing the first 2.

### Readings invalid range

`GET /api/v1/zones/df985ed5-b1bd-4acf-85ab-db958b64aea8/readings?range=1y`

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
      "msg": "String should match pattern '^(24h|7d|30d)$'",
      "input": "1y",
      "ctx": {
        "pattern": "^(24h|7d|30d)$"
      }
    }
  ]
}
```

### Readings invalid agg

`GET /api/v1/zones/df985ed5-b1bd-4acf-85ab-db958b64aea8/readings?agg=minute`

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

`POST /api/v1/zones/df985ed5-b1bd-4acf-85ab-db958b64aea8/evaluate`

Expected 200/429, got 200: PASS | Auth: Bearer token

Response (200):

```json
{
  "id": "879b9216-caf9-4caa-a5ae-b8150a3cd462",
  "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
  "status_level": "warning",
  "message": "Warning: Environmental parameters are out of bounds for Leafy Vegetables. Temperature is 24.9°C and moisture is 78.1%.",
  "reasons": [
    "Soil Moisture is 78.1% (approaching limit 76.0-98.0%)",
    "Solar Illuminance is 5759.0lx (outside ideal range 10000.0-20000.0lx)"
  ],
  "created_at": "2026-11-06T13:23:40.258982Z"
}
```

### Outsider cannot read zone status

`GET /api/v1/zones/df985ed5-b1bd-4acf-85ab-db958b64aea8/status`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Zone not found"
}
```

### Outsider cannot read zone readings

`GET /api/v1/zones/df985ed5-b1bd-4acf-85ab-db958b64aea8/readings`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Zone not found"
}
```

### Outsider cannot evaluate zone

`POST /api/v1/zones/df985ed5-b1bd-4acf-85ab-db958b64aea8/evaluate`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Zone not found"
}
```

### Unknown zone id

`GET /api/v1/zones/a44d3cac-dc84-4424-b245-3fd4189c8b7e/status`

Expected 404, got 404: PASS | Auth: Bearer token

Response (404):

```json
{
  "detail": "Zone not found"
}
```

### Create plant zone

`POST /api/v1/gardens/602d3db8-87ec-40d5-ae11-b3da92ceddcf/zones`

Expected 201, got 201: PASS | Auth: Bearer token

Sent:

```json
{
  "category_key": "leafy",
  "label": "Test Zone 20261106202334",
  "plant_names": [
    "Spinach"
  ]
}
```

Response (201):

```json
{
  "id": "cbb5a4e7-1fbf-4d99-8433-54686092f6a6",
  "garden_id": "602d3db8-87ec-40d5-ae11-b3da92ceddcf",
  "category": {
    "id": "15f90036-7e73-4071-a5f0-f94dcedd41d1",
    "key": "leafy",
    "name": "Leafy Vegetables",
    "response_timescale": "days",
    "threshold_profile": {
      "id": "b6e1d6e1-b740-4e48-a96e-3384e132acce",
      "category_id": "15f90036-7e73-4071-a5f0-f94dcedd41d1",
      "moisture_min": 76.0,
      "moisture_max": 98.0,
      "temp_min": 22.0,
      "temp_max": 27.0,
      "humidity_min": 60.0,
      "humidity_max": 80.0,
      "lux_min": 10000.0,
      "lux_max": 20000.0,
      "source_note": "Kusumawardani & Hermawan (2021). Optimization of Automated Micro-Irrigation for Hydroponic Brassica in High-Temperature Tropical Urban Environments."
    }
  },
  "label": "Test Zone 20261106202334",
  "plant_names": [
    "Spinach"
  ],
  "created_at": "2026-11-06T13:23:40.338067Z"
}
```

### Delete plant zone

`DELETE /api/v1/zones/cbb5a4e7-1fbf-4d99-8433-54686092f6a6`

Expected 204, got 204: PASS | Auth: Bearer token

Response (204):

```
(empty)
```

Checks:

- PASS: readings is a list

## Internal (X-Internal-Token)

### Evaluate without token

`POST /api/v1/internal/evaluate?zone_id=df985ed5-b1bd-4acf-85ab-db958b64aea8`

Expected 403, got 403: PASS

Response (403):

```json
{
  "detail": "Invalid or missing X-Internal-Token header"
}
```

### Evaluate with wrong token

`POST /api/v1/internal/evaluate?zone_id=df985ed5-b1bd-4acf-85ab-db958b64aea8`

Expected 403, got 403: PASS | Header: X-Internal-Token

Response (403):

```json
{
  "detail": "Invalid or missing X-Internal-Token header"
}
```

### Evaluate one zone with internal token

`POST /api/v1/internal/evaluate?zone_id=df985ed5-b1bd-4acf-85ab-db958b64aea8`

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
    "id": "7fd4f788-fac1-46f9-9a61-a76017d54936",
    "name": "Carlsson Khovis",
    "email": "carlkho99@gmail.com",
    "role": "gardener",
    "has_password": "<password>"
  },
  {
    "id": "9f12f622-aec6-4afb-a172-35da04d47169",
    "name": "G7 Gardener",
    "email": "g7-rpl@gmail.com",
    "role": "gardener",
    "has_password": "<password>"
  }
]
```

11 items, showing the first 2.

Checks:

- PASS: user list has no password hashes

## Dashboard

### Summary (all my gardens)

`GET /api/v1/dashboard/summary`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
{
  "total_zones": 7,
  "zones_ok": 0,
  "zones_need_attention": 7,
  "active_alerts_count": 38,
  "weather_summary": {
    "location": "Kos",
    "forecast": "Cerah Berawan (Partly Cloudy)",
    "temp_c": 28.0,
    "rain_probability_pct": 40.0,
    "attribution": "BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)",
    "humidity_pct": 77.0,
    "wind_speed_kmh": 4.8,
    "icon_url": "https://api-apps.bmkg.go.id/storage/icon/cuaca/cerah berawan-pm.svg",
    "local_datetime": "2026-11-06 20:00:00"
  },
  "top_recommendations": [
    {
      "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
      "zone_label": "Zone A - Hydroponic Greens",
      "status_level": "warning",
      "message": "Warning: Environmental parameters are out of bounds for Leafy Vegetables. Temperature is 24.9°C and moisture is 78.1%."
    },
    {
      "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
      "zone_label": "Zone A - Hydroponic Greens",
      "status_level": "warning",
      "message": "Warning: Environmental parameters are out of bounds for Leafy Vegetables. Temperature is 24.9°C and moisture is 78.1%."
    },
    {
      "zone_id": "5e03ee66-8a9e-48b5-a33b-2af0a96750f2",
      "zone_label": "Test 2",
      "status_level": "warning",
      "message": "Zone condition is currently warning. Moisture and temperature levels are monitored."
    }
  ]
}
```

### Summary for one garden

`GET /api/v1/dashboard/summary?garden_id=602d3db8-87ec-40d5-ae11-b3da92ceddcf`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
{
  "total_zones": 5,
  "zones_ok": 0,
  "zones_need_attention": 5,
  "active_alerts_count": 34,
  "weather_summary": {
    "location": "Kos",
    "forecast": "Cerah Berawan (Partly Cloudy)",
    "temp_c": 28.0,
    "rain_probability_pct": 40.0,
    "attribution": "BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)",
    "humidity_pct": 77.0,
    "wind_speed_kmh": 4.8,
    "icon_url": "https://api-apps.bmkg.go.id/storage/icon/cuaca/cerah berawan-pm.svg",
    "local_datetime": "2026-11-06 20:00:00"
  },
  "top_recommendations": [
    {
      "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
      "zone_label": "Zone A - Hydroponic Greens",
      "status_level": "warning",
      "message": "Warning: Environmental parameters are out of bounds for Leafy Vegetables. Temperature is 24.9°C and moisture is 78.1%."
    },
    {
      "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
      "zone_label": "Zone A - Hydroponic Greens",
      "status_level": "warning",
      "message": "Warning: Environmental parameters are out of bounds for Leafy Vegetables. Temperature is 24.9°C and moisture is 78.1%."
    },
    {
      "zone_id": "2628efaa-ccaa-4f67-8083-7f7e964d95f1",
      "zone_label": "Zone D - Citrus Tabulampot",
      "status_level": "warning",
      "message": "Zone condition is currently warning. Moisture and temperature levels are monitored."
    }
  ]
}
```

### Outsider summary for my garden

`GET /api/v1/dashboard/summary?garden_id=602d3db8-87ec-40d5-ae11-b3da92ceddcf`

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
    "location": "Menteng, Kota Adm. Jakarta Pusat",
    "forecast": "Cerah Berawan (Partly Cloudy)",
    "temp_c": 28.0,
    "rain_probability_pct": 40.0,
    "attribution": "BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)",
    "humidity_pct": 77.0,
    "wind_speed_kmh": 4.8,
    "icon_url": "https://api-apps.bmkg.go.id/storage/icon/cuaca/cerah berawan-pm.svg",
    "local_datetime": "2026-11-06 20:00:00"
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
    "id": "dc1d7396-9363-465b-9e80-19a07117a3a0",
    "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
    "zone_label": "Zone A - Hydroponic Greens",
    "level": "warning",
    "type": "action_add_light",
    "message": "Action 'add_light' requires confirmation: Action 'add_light' cannot be triggered autonomously | Sensor telemetry is stale (10556s old)",
    "requires_confirmation": true,
    "resolved_at": null,
    "created_at": "2026-11-06T13:23:40.804208Z"
  },
  {
    "id": "0091395b-4452-467c-9961-783ec0ab5879",
    "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
    "zone_label": "Zone A - Hydroponic Greens",
    "level": "warning",
    "type": "action_add_light",
    "message": "Action 'add_light' requires confirmation: Action 'add_light' cannot be triggered autonomously | Sensor telemetry is stale (10553s old)",
    "requires_confirmation": true,
    "resolved_at": null,
    "created_at": "2026-11-06T13:23:40.256304Z"
  }
]
```

38 items, showing the first 2.

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

`POST /api/v1/alerts/a44d3cac-dc84-4424-b245-3fd4189c8b7e/confirm`

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

`POST /api/v1/alerts/a44d3cac-dc84-4424-b245-3fd4189c8b7e/override`

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

`POST /api/v1/alerts/dc1d7396-9363-465b-9e80-19a07117a3a0/confirm`

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

`POST /api/v1/alerts/dc1d7396-9363-465b-9e80-19a07117a3a0/override`

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
    "id": "6bfca5bd-dac0-4138-bc7a-95f3ddc5d01a",
    "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
    "status_level": "warning",
    "message": "Warning: Environmental parameters are out of bounds for Leafy Vegetables. Temperature is 24.9°C and moisture is 78.1%.",
    "reasons": [
      "Soil Moisture is 78.1% (approaching limit 76.0-98.0%)",
      "Solar Illuminance is 5759.0lx (outside ideal range 10000.0-20000.0lx)"
    ],
    "created_at": "2026-11-06T13:23:40.805260Z"
  },
  {
    "id": "879b9216-caf9-4caa-a5ae-b8150a3cd462",
    "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
    "status_level": "warning",
    "message": "Warning: Environmental parameters are out of bounds for Leafy Vegetables. Temperature is 24.9°C and moisture is 78.1%.",
    "reasons": [
      "Soil Moisture is 78.1% (approaching limit 76.0-98.0%)",
      "Solar Illuminance is 5759.0lx (outside ideal range 10000.0-20000.0lx)"
    ],
    "created_at": "2026-11-06T13:23:40.258982Z"
  }
]
```

51 items, showing the first 2.

### Filter by zone

`GET /api/v1/recommendations?zone_id=df985ed5-b1bd-4acf-85ab-db958b64aea8`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[
  {
    "id": "6bfca5bd-dac0-4138-bc7a-95f3ddc5d01a",
    "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
    "status_level": "warning",
    "message": "Warning: Environmental parameters are out of bounds for Leafy Vegetables. Temperature is 24.9°C and moisture is 78.1%.",
    "reasons": [
      "Soil Moisture is 78.1% (approaching limit 76.0-98.0%)",
      "Solar Illuminance is 5759.0lx (outside ideal range 10000.0-20000.0lx)"
    ],
    "created_at": "2026-11-06T13:23:40.805260Z"
  },
  {
    "id": "879b9216-caf9-4caa-a5ae-b8150a3cd462",
    "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
    "status_level": "warning",
    "message": "Warning: Environmental parameters are out of bounds for Leafy Vegetables. Temperature is 24.9°C and moisture is 78.1%.",
    "reasons": [
      "Soil Moisture is 78.1% (approaching limit 76.0-98.0%)",
      "Solar Illuminance is 5759.0lx (outside ideal range 10000.0-20000.0lx)"
    ],
    "created_at": "2026-11-06T13:23:40.258982Z"
  }
]
```

17 items, showing the first 2.

### Outsider filters my zone

`GET /api/v1/recommendations?zone_id=df985ed5-b1bd-4acf-85ab-db958b64aea8`

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
    "id": "7351da59-56b0-4656-bc70-5f12a2bada84",
    "zone_id": "df985ed5-b1bd-4acf-85ab-db958b64aea8",
    "type": "sprinkler",
    "driver": "relay",
    "max_on_seconds": 60,
    "min_interval_minutes": 120,
    "last_action": null
  }
]
```

### Outsider lists actuators

`GET /api/v1/actuators`

Expected 200, got 200: PASS | Auth: Bearer token

Response (200):

```json
[]
```

### Invalid command is rejected

`POST /api/v1/actuators/a44d3cac-dc84-4424-b245-3fd4189c8b7e/command`

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

`POST /api/v1/actuators/a44d3cac-dc84-4424-b245-3fd4189c8b7e/command`

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

`POST /api/v1/actuators/7351da59-56b0-4656-bc70-5f12a2bada84/command`

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

Checks:

- PASS: outsider actuator list is empty

## Cleanup

Each run creates one `TEST Garden` and one `tes+...@example.com` user:

```
docker compose exec db psql -U postgres -d roofgarden -c "DELETE FROM gardens WHERE name LIKE 'TEST Garden %'; DELETE FROM users WHERE email LIKE 'tes+%@example.com';"
```
