#include <Arduino.h>
#include "../include/config.h"

// If secrets.h does not exist in build, fall back to secrets.example.h
#if __has_include("../include/secrets.h")
    #include "../include/secrets.h"
#else
    #include "../include/secrets.example.h"
#endif

#include "core/reading_buffer.h"
#include "actuators/relay.h"
#include "net/wifi_manager.h"
#include "net/api_client.h"
#include "net/time_sync.h"

#if MOCK_ENVIRONMENT
#include "sensors/mock_sensors.h"
#else
#include "sensors/soil_moisture.h"
#include "sensors/dht22.h"
#include "sensors/bh1750.h"
#endif

// Global component instances
WiFiManager wifiManager(WIFI_SSID, WIFI_PASS);
TimeSync timeSync(NTP_SERVER, GMT_OFFSET_SEC, DAYLIGHT_OFFSET);
ApiClient apiClient(API_BASE_URL, NODE_ID, NODE_API_KEY);
ReadingBuffer readingBuffer(BUFFER_MAX_READINGS);
RelayActuator sprinklerRelay(RELAY_PIN, RELAY_ACTIVE_LOW, RELAY_MAX_ON_SECONDS);

#if MOCK_ENVIRONMENT
MockSensors mockSensors(MOCK_INITIAL_SOIL_PCT, MOCK_SCENARIO_NORMAL);
#else
SoilMoistureSensor soilSensor(SOIL_PIN, SOIL_DRY_RAW, SOIL_WET_RAW, SOIL_SAMPLES_COUNT);
DHTSensor dhtSensor(DHT_PIN, DHT_TYPE);
LightSensor lightSensor(I2C_SDA_PIN, I2C_SCL_PIN);
#endif

unsigned long lastSendMillis = 0;
unsigned long lastCommandPollMillis = 0;
unsigned long wifiDisconnectedSince = 0;

void printMockMenu() {
#if MOCK_ENVIRONMENT
    Serial.println("\n------------------------------------------------------------");
    Serial.println("[Mock Controller] Interactive Serial Shortcuts:");
    Serial.println("  '1' or 'n' -> Switch to NORMAL scenario (Healthy garden)");
    Serial.println("  '2' or 'd' -> Switch to DRY scenario (Trigger auto-watering)");
    Serial.println("  '3' or 'h' -> Switch to HEATWAVE scenario (Heat stress)");
    Serial.println("  '4' or 'w' -> Manual watering pulse (+12% soil moisture)");
    Serial.println("  '5' or 'a' -> Toggle ANOMALY injection (Test backend validation)");
    Serial.println("  '?' or 's' -> Print current simulation status");
    Serial.println("------------------------------------------------------------\n");
#endif
}

void setup() {
    Serial.begin(115200);
    delay(500);

#if MOCK_ENVIRONMENT
    Serial.println("\n============================================================");
    Serial.println("  ROOFGARDEN ESP32 FIRMWARE - MOCK ENVIRONMENT ACTIVE");
    Serial.printf("  Node ID:          %s\n", NODE_ID);
    Serial.printf("  Target API:       %s\n", API_BASE_URL);
    Serial.printf("  Send Interval:    %u seconds (Fast Mock Telemetry)\n", EFFECTIVE_SEND_INTERVAL_S);
    Serial.printf("  Command Poll:     %u seconds\n", COMMAND_POLL_INTERVAL_S);
    Serial.println("============================================================");
#else
    Serial.println("\n[RoofGarden] Booting ESP32 Sensor Node (Physical Hardware)...");
#endif

    // 1. Initialize Relay FIRST (Safety requirement: force safe OFF state on boot)
    sprinklerRelay.begin();
    Serial.println("[RoofGarden] Sprinkler relay initialized to SAFE OFF state.");

    // 2. Initialize Sensors (Physical or Mock)
#if MOCK_ENVIRONMENT
    mockSensors.begin();
    Serial.printf("[Mock] Sensors initialized. Active Scenario: %s\n", mockSensors.getScenarioName());
    printMockMenu();
#else
    soilSensor.begin();
    dhtSensor.begin();
    if (lightSensor.begin()) {
        Serial.println("[RoofGarden] BH1750 Light Sensor ready.");
    } else {
        Serial.println("[RoofGarden] Warning: BH1750 not detected on I2C.");
    }
#endif

    // 3. Connect to WiFi
    Serial.print("[RoofGarden] Connecting to WiFi: ");
    Serial.println(WIFI_SSID);
    if (wifiManager.connect()) {
        Serial.println("[RoofGarden] WiFi Connected.");
        timeSync.begin();
    } else {
        Serial.println("[RoofGarden] WiFi connection failed. Will buffer readings to RAM.");
    }
}

void handleSerialInput() {
#if MOCK_ENVIRONMENT
    while (Serial.available() > 0) {
        char ch = (char)Serial.read();
        if (ch == '\r' || ch == '\n' || ch == ' ') continue;

        switch (ch) {
            case '1':
            case 'n':
            case 'N':
                mockSensors.setScenario(MOCK_SCENARIO_NORMAL);
                Serial.printf("[Mock Controller] Scenario set to: %s\n", mockSensors.getScenarioName());
                break;

            case '2':
            case 'd':
            case 'D':
                mockSensors.setScenario(MOCK_SCENARIO_DRY);
                Serial.printf("[Mock Controller] Scenario set to: %s\n", mockSensors.getScenarioName());
                break;

            case '3':
            case 'h':
            case 'H':
                mockSensors.setScenario(MOCK_SCENARIO_HEATWAVE);
                Serial.printf("[Mock Controller] Scenario set to: %s\n", mockSensors.getScenarioName());
                break;

            case '4':
            case 'w':
            case 'W':
                mockSensors.manualWaterPulse(12.0f);
                Serial.println("[Mock Controller] Manual watering pulse applied! Moisture increased +12%.");
                break;

            case '5':
            case 'a':
            case 'A': {
                bool newState = !mockSensors.isAnomalyActive();
                mockSensors.triggerAnomaly(newState);
                Serial.printf("[Mock Controller] Anomaly mode: %s\n", newState ? "ENABLED (Out-of-bounds)" : "DISABLED (Normal)");
                break;
            }

            case '?':
            case 's':
            case 'S': {
                float t = 0.0f, h = 0.0f;
                mockSensors.readDHT(t, h);
                Serial.println("\n--- [Mock Status Diagnostics] ---");
                Serial.printf("Scenario:         %s\n", mockSensors.getScenarioName());
                Serial.printf("Soil Moisture:    %.1f%%\n", mockSensors.readSoilMoisturePct());
                Serial.printf("Air Temp / Hum:   %.1f C / %.1f%%\n", t, h);
                Serial.printf("Solar Lux:        %.0f lx\n", mockSensors.readLux());
                Serial.printf("Battery:          %.2f V\n", mockSensors.readBatteryVoltage());
                Serial.printf("Anomaly Mode:     %s\n", mockSensors.isAnomalyActive() ? "YES" : "NO");
                Serial.printf("Sprinkler Relay:  %s\n", sprinklerRelay.isOn() ? "ON (Active)" : "OFF (Idle)");
                Serial.printf("Buffered Reads:   %u / %u\n", (unsigned int)readingBuffer.size(), (unsigned int)BUFFER_MAX_READINGS);
                Serial.printf("WiFi Status:      %s\n", wifiManager.isConnected() ? "Connected" : "Disconnected");
                Serial.println("---------------------------------\n");
                printMockMenu();
                break;
            }

            default:
                Serial.printf("[Mock Controller] Unknown key: '%c'. Type '?' for menu.\n", ch);
                break;
        }
    }
#endif
}

void loop() {
    unsigned long now = millis();

    // Check for interactive user inputs in mock mode
    handleSerialInput();

    // Enforce safety cutoff on relay if on
    sprinklerRelay.update();

    // Check WiFi health & Network Watchdog
    wifiManager.checkAndReconnect();
    if (!wifiManager.isConnected()) {
        if (wifiDisconnectedSince == 0) {
            wifiDisconnectedSince = now;
        } else if (now - wifiDisconnectedSince > 120000UL) {
            // Safety: if relay is ON while network has been down > 120s, force OFF immediately
            if (sprinklerRelay.isOn()) {
                Serial.println("[Safety] Network watchdog triggered: WiFi offline >120s with relay ON. Cutting off relay!");
                sprinklerRelay.turnOff();
            }
        }
    } else {
        wifiDisconnectedSince = 0;
    }

    // 1. Periodic Sensor Reading & Reporting
    if (now - lastSendMillis >= (EFFECTIVE_SEND_INTERVAL_S * 1000UL) || lastSendMillis == 0) {
        lastSendMillis = now;

        SensorReading reading;
        memset(&reading, 0, sizeof(SensorReading));

        // Get NTP timestamp
        timeSync.getISO8601Timestamp(reading.timestamp, sizeof(reading.timestamp));

#if MOCK_ENVIRONMENT
        // Advance mock simulation physics
        mockSensors.update();

        // Read mock sensors
        reading.soil_moisture_pct = mockSensors.readSoilMoisturePct();
        float temp = 0.0f, hum = 0.0f;
        mockSensors.readDHT(temp, hum);
        reading.temperature_c = temp;
        reading.humidity_pct = hum;
        reading.lux = mockSensors.readLux();
        reading.battery_v = mockSensors.readBatteryVoltage();
        reading.is_valid = !mockSensors.isAnomalyActive();

        Serial.printf("[Mock Sensor] Moisture: %.1f%% | Temp: %.1fC | Hum: %.1f%% | Lux: %.0f lx | Batt: %.2fV | Valid: %s\n",
                      reading.soil_moisture_pct, reading.temperature_c, reading.humidity_pct,
                      reading.lux, reading.battery_v, reading.is_valid ? "true" : "false");
#else
        // Read physical sensors
        reading.soil_moisture_pct = soilSensor.readMoisturePct();
        float temp = 0.0f, hum = 0.0f;
        if (dhtSensor.read(temp, hum)) {
            reading.temperature_c = temp;
            reading.humidity_pct = hum;
        } else {
            reading.temperature_c = -999.0f;
            reading.humidity_pct = -999.0f;
        }
        reading.lux = lightSensor.readLux();
        reading.battery_v = 3.95f; // Estimated 1S LiPo voltage
        reading.is_valid = (reading.temperature_c > -50.0f);

        Serial.printf("[Sensor] Moisture: %.1f%% | Temp: %.1fC | Hum: %.1f%% | Lux: %.0f lx\n",
                      reading.soil_moisture_pct, reading.temperature_c, reading.humidity_pct, reading.lux);
#endif

        // Send or Buffer
        if (wifiManager.isConnected()) {
            // Flush any buffered readings first
            while (!readingBuffer.isEmpty()) {
                SensorReading buffered;
                if (readingBuffer.peek(buffered)) {
                    if (apiClient.postReading(buffered)) {
                        readingBuffer.pop(buffered);
                        Serial.println("[Buffer] Successfully flushed buffered reading to backend.");
                    } else {
                        break; // Failed to send, keep remaining in buffer
                    }
                }
            }

            // Send current reading
            if (!apiClient.postReading(reading)) {
                Serial.println("[API] Failed to POST reading. Buffering to RAM.");
                readingBuffer.push(reading);
            } else {
                Serial.println("[API] Sensor telemetry successfully sent to web app.");
            }
        } else {
            Serial.println("[WiFi] Offline. Buffering reading to RAM.");
            readingBuffer.push(reading);
        }
    }

    // 2. Periodic Command Polling
    if (now - lastCommandPollMillis >= (COMMAND_POLL_INTERVAL_S * 1000UL)) {
        lastCommandPollMillis = now;

        if (wifiManager.isConnected()) {
            ActuatorCommand cmd;
            bool hasCommand = false;
            if (apiClient.pollPendingCommands(cmd, hasCommand) && hasCommand) {
                Serial.printf("[Command] Received from web app: %s (Duration: %us)\n", cmd.command, cmd.duration_seconds);
                if (strcmp(cmd.command, "turn_on") == 0) {
                    sprinklerRelay.turnOn(cmd.duration_seconds);
#if MOCK_ENVIRONMENT
                    // React physically to irrigation event: replenish mock soil moisture!
                    mockSensors.notifyWatering(cmd.duration_seconds);
                    Serial.printf("[Mock] Irrigation active! Soil moisture replenished by ~%.1f%%.\n",
                                  (float)cmd.duration_seconds * 0.45f);
#endif
                    apiClient.ackCommand(cmd.command_id, "acked", "Valve opened successfully");
                } else if (strcmp(cmd.command, "turn_off") == 0) {
                    sprinklerRelay.turnOff();
                    apiClient.ackCommand(cmd.command_id, "acked", "Valve closed successfully");
                }
            }
        }
    }

    delay(50);
}
