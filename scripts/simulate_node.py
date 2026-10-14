#!/usr/bin/env python3
"""ESP32 Simulator Script for RoofGarden.

Simulates physical hardware node behavior:
- Posts telemetry to /api/v1/ingest/readings
- Polls pending commands from /api/v1/nodes/{id}/commands
- Acknowledges command execution to /api/v1/nodes/{id}/commands/{cid}/ack
- Supports scenarios: normal, dry, heatwave, offline
"""

import argparse
import random
import time
from datetime import UTC, datetime

import requests

DEFAULT_API_URL = "http://localhost:8000/api/v1"
DEFAULT_NODE_ID = "esp32-node-01"
DEFAULT_API_KEY = "dev-node-api-key-secret-12345"


def run_simulator(
    api_url: str,
    node_id: str,
    api_key: str,
    scenario: str,
    interval_sec: int,
    iterations: int,
):
    print(f"=== ESP32 Node Simulator [{node_id}] ===")
    print(f"Target API Base: {api_url}")
    print(f"Scenario: {scenario} | Interval: {interval_sec}s")

    if scenario == "offline":
        print("[Simulator] Simulating offline node (no network activity).")
        time.sleep(interval_sec)
        return

    headers = {
        "Content-Type": "application/json",
        "X-Node-Key": api_key,
    }

    count = 0
    current_moisture = 80.0 if scenario == "normal" else (62.0 if scenario == "dry" else 55.0)

    while iterations == 0 or count < iterations:
        count += 1
        ts = datetime.now(UTC).isoformat()

        # Telemetry generation according to scenario
        if scenario == "normal":
            current_moisture = max(76.0, min(85.0, current_moisture + random.uniform(-0.5, 0.4)))
            temp = round(25.0 + random.uniform(-1.0, 1.5), 1)
            hum = round(72.0 + random.uniform(-3.0, 3.0), 1)
            lux = round(15000.0 + random.uniform(-2000, 3000), 0)
        elif scenario == "dry":
            # Dehydrating soil below 76%
            current_moisture = max(50.0, current_moisture - random.uniform(0.8, 1.5))
            temp = round(28.5 + random.uniform(-0.5, 1.5), 1)
            hum = round(58.0 + random.uniform(-2.0, 2.0), 1)
            lux = round(25000.0 + random.uniform(-1000, 4000), 0)
        elif scenario == "heatwave":
            current_moisture = max(45.0, current_moisture - random.uniform(1.2, 2.0))
            temp = round(34.0 + random.uniform(-0.5, 2.5), 1)
            hum = round(50.0 + random.uniform(-4.0, 2.0), 1)
            lux = round(45000.0 + random.uniform(-2000, 5000), 0)

        payload = {
            "node_id": node_id,
            "ts": ts,
            "soil_moisture_pct": round(current_moisture, 1),
            "temperature_c": temp,
            "humidity_pct": hum,
            "lux": lux,
            "battery_v": round(3.95 + random.uniform(-0.05, 0.05), 2),
        }

        # 1. Post telemetry
        try:
            res = requests.post(f"{api_url}/ingest/readings", json=payload, headers=headers, timeout=5)
            if res.status_code in [200, 201]:
                print(f"[{count}] Ingested: Moisture={payload['soil_moisture_pct']}% Temp={temp}C Hum={hum}% Lux={lux}")
            else:
                print(f"[{count}] Ingest error {res.status_code}: {res.text}")
        except requests.RequestException as e:
            print(f"[{count}] Ingest request failed: {e}")

        # 2. Poll pending commands
        try:
            poll_res = requests.get(f"{api_url}/nodes/{node_id}/commands", headers=headers, timeout=5)
            if poll_res.status_code == 200:
                commands = poll_res.json()
                if commands:
                    print(f"[{count}] Received {len(commands)} pending command(s):")
                    for cmd in commands:
                        cid = cmd["command_id"]
                        action = cmd["command"]
                        duration = cmd["duration_seconds"]
                        print(f"  -> Executing: {action} (Duration: {duration}s)")
                        time.sleep(1) # Simulate valve opening

                        # If watering was commanded, simulate moisture increase!
                        if action == "turn_on":
                            current_moisture = min(92.0, current_moisture + 15.0)
                            print(f"  -> Valve opened! Moisture replenished to {round(current_moisture, 1)}%")

                        # 3. Acknowledge command execution
                        ack_payload = {
                            "status": "acked",
                            "executed_at": datetime.now(UTC).isoformat(),
                            "result": f"Simulated relay executed {action} for {duration}s",
                        }
                        ack_res = requests.post(f"{api_url}/nodes/{node_id}/commands/{cid}/ack", json=ack_payload, headers=headers)
                        print(f"  -> Ack response: {ack_res.status_code}")
        except requests.RequestException as e:
            print(f"[{count}] Poll command failed: {e}")

        if iterations == 0 or count < iterations:
            time.sleep(interval_sec)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Simulate RoofGarden ESP32 sensor node")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Backend API base URL")
    parser.add_argument("--node-id", default=DEFAULT_NODE_ID, help="Node identifier")
    parser.add_argument("--api-key", default=DEFAULT_API_KEY, help="Node API secret key")
    parser.add_argument("--scenario", choices=["normal", "dry", "heatwave", "offline"], default="normal", help="Simulation scenario")
    parser.add_argument("--interval", type=int, default=5, help="Reporting interval in seconds")
    parser.add_argument("--iterations", type=int, default=1, help="Number of reading cycles (0 for infinite loop)")

    args = parser.parse_args()
    run_simulator(
        api_url=args.api_url,
        node_id=args.node_id,
        api_key=args.api_key,
        scenario=args.scenario,
        interval_sec=args.interval,
        iterations=args.iterations,
    )
