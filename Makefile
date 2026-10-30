.PHONY: help dev-backend dev-frontend test test-hardware simulate build-mock-firmware run-mock-node seed lint format up down clean

PYTHON ?= python

help:
	@echo "Available commands:"
	@echo "  make up                  - Start Postgres & Backend with docker-compose"
	@echo "  make down                - Stop docker-compose services"
	@echo "  make dev-backend         - Run FastAPI backend locally with uvicorn"
	@echo "  make dev-frontend        - Run Vite React frontend development server"
	@echo "  make test                - Run backend, AI, and hardware firmware test suites"
	@echo "  make test-hardware       - Run ESP32 firmware unit tests natively with PlatformIO"
	@echo "  make build-mock-firmware - Compile ESP32 mock environment firmware with PlatformIO"
	@echo "  make build-native-mock   - Compile native mock node runner using C++ compiler"
	@echo "  make seed                - Seed database with categories, profiles, and demo garden"
	@echo "  make simulate            - Run simulated ESP32 node sending sensor readings (Python)"
	@echo "  make lint                - Lint backend with ruff and frontend with eslint"
	@echo "  make format              - Format backend with ruff"

up:
	docker compose up -d

down:
	docker compose down

dev-backend:
	cd backend && $(PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

test:
	@echo "Running backend tests..."
	cd backend && $(PYTHON) -m pytest -v
	@echo "Running AI tests..."
	cd ai && $(PYTHON) -m pytest -v
	@echo "Running hardware firmware tests..."
	cd hardware/firmware && pio test -e native

test-hardware:
	cd hardware/firmware && pio test -e native

build-mock-firmware:
	cd hardware/firmware && pio run -e esp32dev_mock

build-native-mock:
	g++ -std=c++17 -O2 -I hardware/firmware/src hardware/firmware/src/native_mock_runner.cpp hardware/firmware/src/sensors/mock_sensors.cpp hardware/firmware/src/core/reading_buffer.cpp -lwininet -o hardware/firmware/mock_node.exe

seed:
	$(PYTHON) scripts/seed_demo_data.py

simulate:
	$(PYTHON) scripts/simulate_node.py --scenario normal

lint:
	cd backend && $(PYTHON) -m ruff check app tests
	cd frontend && npm run lint

format:
	cd backend && $(PYTHON) -m ruff format app tests

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
