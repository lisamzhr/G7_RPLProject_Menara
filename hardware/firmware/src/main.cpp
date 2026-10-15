#include <Arduino.h>
#include "../include/config.h"

// If secrets.h does not exist in build, fall back to secrets.example.h
#if __has_include("../include/secrets.h")
    #include "../include/secrets.h"
#else
    #include "../include/secrets.example.h"
#endif

#include "core/reading_buffer.h"
#include "sensors/soil_moisture.h"
#include "sensors/dht22.h"
#include "sensors/bh1750.h"
#include "actuators/relay.h"
#include "net/wifi_manager.h"
#include "net/api_client.h"
#include "net/time_sync.h"

// Global component instances
WiFiManager wifiManager(WIFI_SSID, WIFI_PASS);
TimeSync timeSync(NTP_SERVER, GMT_OFFSET_SEC, DAYLIGHT_OFFSET);
ApiClient apiClient(API_BASE_URL, NODE_ID, NODE_API_KEY);
ReadingBuffer readingBuffer(BUFFER_MAX_READINGS);

SoilMoistureSensor soilSensor(SOIL_PIN, SOIL_DRY_RAW, SOIL_WET_RAW, SOIL_SAMPLES_COUNT);
DHTSensor dhtSensor(DHT_PIN, DHT_TYPE);
LightSensor lightSensor(I2C_SDA_PIN, I2C_SCL_PIN);
RelayActuator sprinklerRelay(RELAY_PIN, RELAY_ACTIVE_LOW, RELAY_MAX_ON_SECONDS);

unsigned long lastSendMillis = 0;
unsigned long lastCommandPollMillis = 0;
unsigned long wifiDisconnectedSince = 0;

void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n[RoofGarden] Booting ESP32 Sensor Node...");

    // 1. Initialize Relay FIRST (Safety requirement: force OFF state on boot)
    sprinklerRelay.begin();
    Serial.println("[RoofGarden] Sprinkler relay initialized to SAFE OFF state.");

    // 2. Initialize Sensors
    soilSensor.begin();
    dhtSensor.begin();
    if (lightSensor.begin()) {
        Serial.println("[RoofGarden] BH1750 Light Sensor ready.");
    } else {
        Serial.println("[RoofGarden] Warning: BH1750 not detected on I2C.");
    }

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

void loop() {
    unsigned long now = millis();

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
    if (now - lastSendMillis >= (SEND_INTERVAL_S * 1000UL) || lastSendMillis == 0) {
        lastSendMillis = now;

        SensorReading reading;
        memset(&reading, 0, sizeof(SensorReading));

        // Get NTP timestamp
        timeSync.getISO8601Timestamp(reading.timestamp, sizeof(reading.timestamp));

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
        reading.battery_v = 3.3f; // Placeholder / ADC battery divider
        reading.is_valid = true;

        Serial.printf("[Sensor] Moisture: %.1f%% | Temp: %.1fC | Hum: %.1f%% | Lux: %.0f lx\n",
                      reading.soil_moisture_pct, reading.temperature_c, reading.humidity_pct, reading.lux);

        // Send or Buffer
        if (wifiManager.isConnected()) {
            // Flush any buffered readings first
            while (!readingBuffer.isEmpty()) {
                SensorReading buffered;
                if (readingBuffer.peek(buffered)) {
                    if (apiClient.postReading(buffered)) {
                        readingBuffer.pop(buffered);
                    } else {
                        break; // Failed to send, keep remaining in buffer
                    }
                }
            }

            // Send current reading
            if (!apiClient.postReading(reading)) {
                Serial.println("[API] Failed to POST reading. Buffering to RAM.");
                readingBuffer.push(reading);
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
                Serial.printf("[Command] Received: %s (Duration: %us)\n", cmd.command, cmd.duration_seconds);
                if (strcmp(cmd.command, "turn_on") == 0) {
                    sprinklerRelay.turnOn(cmd.duration_seconds);
                    apiClient.ackCommand(cmd.command_id, "acked", "Valve opened");
                } else if (strcmp(cmd.command, "turn_off") == 0) {
                    sprinklerRelay.turnOff();
                    apiClient.ackCommand(cmd.command_id, "acked", "Valve closed");
                }
            }
        }
    }

    delay(50);
}
