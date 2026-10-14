# System Architecture

## 1. System Overview

The **AI Powered Roof Garden Monitoring System** is engineered to address the distinct microclimatic challenges of urban rooftop farming in Jakarta (intense solar radiation, convective tropical downpours, high ambient humidity, and rapid soil dehydration in shallow planter beds).

The architecture enforces a strict separation between **deterministic engineering controls** (telemetry validation, botanical thresholds, actuation limits) and **probabilistic intelligence** (plain-language reasoning, nuanced horticultural explanations).

---

## 2. Component Architecture

### 2.1 Hardware Layer (ESP32 Sensor Nodes)
- **Microcontroller**: ESP32 DevKit V1 (Tensilica Xtensa Dual-Core).
- **Sensors**:
  - Capacitive Soil Moisture Sensor v1.2 (Analog via **ADC1** on GPIO34 to avoid WiFi RF interference).
  - DHT22 / AM2302 (Digital 1-Wire on GPIO4 for ambient temperature and relative humidity).
  - BH1750 (I2C on GPIO21/GPIO22 for ambient solar illuminance in lux).
- **Actuators**:
  - 5V Relay Module (GPIO26, Active-Low) controlling a solenoid irrigation valve.
- **Fail-Safe Firmware Protections**:
  - Hardware timer capping single watering cycle at `RELAY_MAX_ON_SECONDS` (default: 60s).
  - Default relay state is de-energized (OFF) on boot and network brownout.
  - In-RAM Ring Buffer buffering up to 100 unsent readings during WiFi/Internet outages.
  - NTP time synchronization for accurate timestamping during offline buffering.

### 2.2 Backend & Ingestion Engine (FastAPI)
- **Ingestion Pipeline**:
  - Authenticates node via `X-Node-Key` header against `api_key_hash`.
  - Boundary validation:
    - Soil Moisture: `0.0% - 100.0%`
    - Temperature: `-10.0°C - 70.0°C`
    - Relative Humidity: `0.0% - 100.0%`
    - Ambient Lux: `0 - 120,000 lx`
  - Anomaly tagging: Out-of-bounds readings are accepted but flagged with `is_valid = false`.
  - Deduplication: Idempotent upsert/discard on `(node_id, ts)`.
  - Node Health Tracker: Updates `last_seen_at`.
- **Scheduled Background Workers (APScheduler)**:
  - `evaluate_zones`: Evaluates plant health every 15 minutes.
  - `check_node_health`: Flags nodes offline if no reading is observed for `3 × send_interval`.
  - `verify_actions`: Assesses soil moisture response 10 minutes post-irrigation; flags line/valve blockages if moisture fails to increase.
- **External Connectors**:
  - **BMKG API**: Caches 3-day weather forecasts and nowcast CAP alerts for Jakarta administrative codes (`adm4`).
  - **Open-Elevation API**: Queries rooftop altitude in meters to adjust evapotranspiration factors.

### 2.3 Agentic AI Layer (`roofgarden_ai`)
- **Principle of Deterministic Safety**: The Large Language Model (Anthropic Claude) is **never** permitted to decide numerical threshold limits or trigger actuators autonomously.
- **Evaluation Pipeline**:
  1. **Context Aggregator**: Builds `ZoneContext` containing 24h sensor stats, current readings, linear moisture depletion slope, BMKG rain probability, and zone profile.
  2. **Rule Engine**:
     - `status.py`: Categorizes each parameter as `ok`, `near_limit`, or `out_of_range`; zone level as `normal`, `advisory`, or `warning`.
     - `predictor.py`: Evaluates linear slope over the last 6 hours:
       $$\Delta M = \frac{M_{t} - M_{t-6}}{6}$$
       Estimates hours until $M < \text{threshold}_{\min}$.
     - `autonomy.py`: Gating function. An automated irrigation action is approved **only** if:
       - Plant category is low-risk (`leafy` or `herbs`).
       - Action is `water`.
       - Forecasted probability of rain over the next 3 hours is $< 50\%$.
       - Cooldown interval since last watering has elapsed (`min_interval_minutes`).
       - Daily cumulative watering volume does not exceed maximum limit.
       - Sensor node telemetry is recent ($< 2 \times \text{interval}$) and marked `is_valid = true`.
       - *Any violation routes the decision to a human-in-the-loop alert.*
  3. **LLM Generation**: Claude generates empathetic, accessible explanations for the gardener.
  4. **Guardrail Layer**:
     - Validates structured JSON schema.
     - Enforces severity consistency with rule engine output.
     - Numerical verification: Checks that all numbers cited in LLM output match real sensor metrics within $\pm 1$.
     - Rejection of unauthorized action verbs.
     - Fallback: On any guardrail failure, falls back to pre-compiled deterministic templates.

### 2.4 Storage Layer (PostgreSQL + pgvector)
- **Core Entities**: Users, Gardens, Plant Categories, Threshold Profiles, Plant Zones, Sensor Nodes, Actuators.
- **Time-Series Telemetry**: `sensor_readings` indexed by `(node_id, ts DESC)`.
  - Optional TimescaleDB hypertable support enabled dynamically if extension is detected.
  - Aggregation SQL views: `readings_hourly` and `readings_daily`.
- **Knowledge Base**: `knowledge_chunks` storing agronomic journal abstracts with 1536-dimensional embeddings for retrieval.

### 2.5 Presentation Layer (Vite + React SPA)
- Designed specifically for novice gardeners:
  - Color + text indicators (accessible, avoiding color-only signals).
  - Contextual parameter cards comparing live readings to ideal botanical ranges.
  - Interactive "Why?" inspection panel detailing the botanical rationale and source citation.
  - Human-in-the-loop alert approvals (Confirm / Override).
  - Manual device actuation controls respecting hardware limits.
