# AI Powered Roof Garden Monitoring System

An end-to-end, agentic IoT monitoring and automation system specifically tailored for rooftop gardens in tropical microclimates (such as Jakarta, Indonesia). Sensor nodes monitor soil moisture, temperature, humidity, and light conditions. An agentic AI pipeline periodically evaluates plant zones using real-time sensor metrics, official BMKG weather forecasts, and agronomic threshold profiles, producing human-readable explanations and issuing low-risk automated irrigation actions backed by strict deterministic guardrails.

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Hardware ["Hardware / Simulation"]
        ESP32["ESP32 Sensor Node / Simulator"]
        Sensors["DHT22 (Temp/Hum)<br/>Capacitive Soil (ADC1)<br/>BH1750 (Lux)"]
        Actuator["Relay / Sprinkler (Max 60s hard cap)"]
        Sensors --> ESP32
        ESP32 -->|Poll commands & Ack| Actuator
    end

    subgraph Backend ["FastAPI Backend & Ingestion"]
        IngestAPI["/api/v1/ingest/readings<br/>(X-Node-Key Header)"]
        CommandAPI["/api/v1/nodes/{id}/commands"]
        BMKG["BMKG Client<br/>(BMKG Weather Forecast & Nowcast)"]
        Elev["Elevation Client<br/>(Open-Elevation API)"]
        Scheduler["APScheduler<br/>(evaluate_zones, check_node_health, verify_actions)"]
    end

    subgraph Storage ["PostgreSQL + pgvector"]
        DB[("PostgreSQL 16<br/>sensor_readings<br/>plant_zones & profiles<br/>control_actions & alerts<br/>knowledge_chunks")]
    end

    subgraph AI ["roofgarden_ai Module"]
        ContextBuilder["Zone Context Builder"]
        RuleEngine["Deterministic Rule Engine<br/>- Parameter & Zone Status<br/>- Linear Slope Predictor<br/>- Autonomy Safety Gate"]
        LLM["LLM Client (Claude 3.5 Sonnet)<br/>Explanation & Plain-Language Advisory"]
        Guardrails["Guardrail Validation Layer<br/>- Pydantic Schema Validation<br/>- Number & Severity Match<br/>- Fallback Templates"]
    end

    subgraph Frontend ["Frontend Web Dashboard"]
        ViteApp["Vite + React + TypeScript<br/>- Zone Status & Ranges<br/>- 24h / 7d Telemetry Charts<br/>- Human-In-The-Loop Confirmation<br/>- Actuator Controls"]
    end

    ESP32 -->|POST Sensor Readings| IngestAPI
    IngestAPI --> DB
    Scheduler --> ContextBuilder
    ContextBuilder --> DB
    BMKG --> ContextBuilder
    Elev --> DB

    ContextBuilder --> RuleEngine
    RuleEngine --> LLM
    LLM --> Guardrails
    Guardrails -->|Verified Decision| DB

    DB --> CommandAPI
    CommandAPI --> ESP32

    ViteApp <-->|REST API (JWT)| Backend
```

---

## Monorepo Modules

1. **`hardware`**: ESP32 DevKit firmware written in C++ (PlatformIO Arduino framework) interfacing DHT22, BH1750, capacitive soil moisture sensor (ADC1), and an active-low relay with a hardware safety timeout. Includes in-memory ring-buffer for offline resilience.
2. **`backend`**: FastAPI application handling sensor ingestion, background task scheduling via APScheduler, BMKG weather caching, aggregation views, and RESTful APIs.
3. **`ai` (`roofgarden_ai`)**: Pure Python agentic module. Combines deterministic botanical rule engines, linear moisture depletion forecasting, and LLM plain-language reasoning guarded by strict assertion checks and safety fallbacks.
4. **`frontend`**: Responsive Single Page Application built with Vite, React, TypeScript, TanStack Query, Recharts, and Tailwind CSS. Provides a clear UI for beginner urban gardeners.

---

## Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- Docker & Docker Compose (optional for local PostgreSQL)

### 1. Environment Setup
Copy the environment template:
```bash
cp .env.example .env
```

### 2. Backend & Database Quickstart
Run with Docker Compose:
```bash
docker compose up -d
```
Or run locally with Python:
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --port 8000
```

Seed demo data (Jakarta garden, zones, sensor nodes, and literature profiles):
```bash
python scripts/seed_demo_data.py
```

### 3. Simulator Quickstart (No Hardware Required)
Test the entire sensor ingestion and command cycle using the simulator script:
```bash
# In another terminal:
python scripts/simulate_node.py --scenario normal
# Test drying conditions:
python scripts/simulate_node.py --scenario dry
# Test heatwave conditions:
python scripts/simulate_node.py --scenario heatwave
```

### 4. AI Evaluation Quickstart
Run unit tests for the deterministic rule engine, autonomy safety gates, and guardrails:
```bash
cd ai
pytest -v
```

### 5. Frontend Dashboard Quickstart
Start the React web dashboard:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173`.

### 6. Hardware Firmware Quickstart
Inspect and compile firmware with PlatformIO:
```bash
cd hardware/firmware
# Copy secrets template
cp include/secrets.example.h include/secrets.h
# Build firmware
pio run
```

---

## Testing & Quality Assurance
Run tests across backend and AI modules:
```bash
make test
```
Lint and format:
```bash
make lint
make format
```
