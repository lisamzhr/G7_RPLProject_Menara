# MENARA Project Guidelines & Domain Rules

## 1. Domain Terminology
- Avoid the ambiguous term "device" in frontend routes, UI text, API schemas, and documentation.
- Use explicit domain terms:
  - **Sensor Nodes**: Telemetry input hardware (e.g., ESP32 reporting soil moisture, ambient temperature, humidity, lux).
  - **Actuators**: Output control hardware (e.g., irrigation pumps, mister solenoid valves, grow lights).
- Use route `/actuators` (with backwards-compatible redirect from `/devices`).
- Frontend navigation and views must consistently reflect "Actuators" and "Sensor Nodes".

## 2. Frontend UI & Button Styling
- Never render raw, unstyled `<button>` elements with transparent or browser-default backgrounds.
- Always apply standard classes from `frontend/src/styles/app-shell.css`:
  - Primary actions: `.app-btn-primary` (Solid Forest Green)
  - Secondary/Cancel actions: `.app-btn-secondary` (Soft Sage)
  - Destructive triggers: `.app-btn-danger` (Subtle Crimson)
  - Destructive confirmations: `.app-btn-danger-solid` (Solid Crimson)
  - Filter chips / tabs: `.zone-chip` (Sage inactive, Forest Green active)
- All authenticated views must be rendered within `Layout.tsx` (`AppShell`).

## 3. External API Robustness & BMKG Ingestion
- When consuming BMKG weather data, parse nested multi-day time-series slots (`data[0]['cuaca']`) and match to the slot closest to `datetime.now(UTC)`.
- Derive rain probability percentage via calibrated meteorological heuristics (`rain_chance_from_desc(desc, tp)`).
- Provide official BMKG weather icon URLs (`https://api.bmkg.go.id/static/icon/...svg`) and fallbacks.
- Normalize database timestamps with `ensure_utc()` to avoid naive/aware datetime errors with SQLite and PostgreSQL.
- Always include `User-Agent: MENARA-roofgarden/1.0` on external requests.

## 4. Git & PR Management
- When updating PR titles or descriptions via the GitHub CLI, use the REST API (`gh api -X PATCH /repos/{owner}/{repo}/pulls/{number}`) to avoid GraphQL `read:org` scope limitations on personal access tokens.
