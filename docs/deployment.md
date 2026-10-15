# Deployment Guide

This guide covers deployment instructions for the **RoofGarden Monitoring System** to production hosting providers:
- **Frontend SPA**: [Vercel](https://vercel.com)
- **Backend API & Scheduled Jobs**: [Render](https://render.com)
- **Database & Authentication**: [Supabase](https://supabase.com)

---

## 1. Database Setup on Supabase

1. **Create Supabase Project**:
   - Create a new project in the Southeast Asia (Singapore) region for lowest latency to Jakarta.
2. **Enable pgvector & TimescaleDB Extensions**:
   - In Supabase Dashboard &rarr; **Database** &rarr; **Extensions**:
     - Enable `vector` (pgvector).
     - (Optional) Enable `timescaledb` if supported on your Supabase compute tier.
3. **Run Alembic Migrations**:
   - Obtain the connection URI from **Project Settings &rarr; Database &rarr; Connection string (URI)** (use Session/Transaction pooler or Direct connection).
   - Set in your deployment environment:
     ```bash
     DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
     ```
   - Run migrations from local machine or CI/CD:
     ```bash
     cd backend
     alembic upgrade head
     ```
4. **Seed Baseline Botanical Data**:
   ```bash
   python scripts/seed_demo_data.py
   ```

---

## 2. Backend Deployment on Render

1. **Create Web Service on Render**:
   - Connect your GitHub repository.
   - **Root Directory**: `backend` (or root with Dockerfile).
   - **Environment**: `Docker` (or `Python 3.11`).
   - If using Python directly:
     - **Build Command**: `pip install -e ../ai && pip install -e .`
     - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
2. **Set Environment Variables on Render**:
   - `DATABASE_URL`: Your Supabase connection string.
   - `SECRET_KEY`: High-entropy random 32+ character JWT secret string.
   - `INTERNAL_TOKEN`: Random token string used for cron triggers.
   - `ANTHROPIC_API_KEY`: Anthropic Claude API key.
   - `ENVIRONMENT`: `production`
   - `LOG_LEVEL`: `INFO`
3. **Cron Worker (Overcoming Render Free Tier Sleep)**:
   - On Render free tier, web services sleep after 15 minutes of inactivity.
   - Configure a free cron monitor (such as [cron-job.org](https://cron-job.org) or GitHub Actions scheduled workflow) to send a POST request every 15 minutes:
     ```bash
     curl -X POST https://your-render-app.onrender.com/api/v1/internal/evaluate \
          -H "X-Internal-Token: $INTERNAL_TOKEN"
     ```
   - This keeps the service awake and triggers the automated botanical health evaluation.

---

## 3. Frontend Deployment on Vercel

1. **Import Repository in Vercel**:
   - Select the `roofgarden` repo.
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
2. **Set Environment Variables on Vercel**:
   - `VITE_API_BASE_URL`: `https://your-render-app.onrender.com/api/v1`
   - `VITE_SUPABASE_URL`: `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `your-supabase-anon-key`
3. **Deploy**:
   - Hit **Deploy**. The SPA routes are properly handled via [`vercel.json`](../frontend/vercel.json).

---

## 4. Hardware ESP32 Deployment

1. **Compile and Flash Firmware**:
   - Open `hardware/firmware` in VS Code PlatformIO.
   - Copy `include/secrets.example.h` to `include/secrets.h`.
   - Update `WIFI_SSID`, `WIFI_PASS`, `API_BASE_URL` (points to your Render URL: `https://your-render-app.onrender.com/api/v1`), and `NODE_API_KEY`.
   - Connect ESP32 via Micro-USB and upload:
     ```bash
     pio run -t upload
     pio device monitor
     ```
2. **Field Deployment**:
   - Place sensor probe in container root zone.
   - Seal the enclosure against rain (IP65 waterproof rating).
