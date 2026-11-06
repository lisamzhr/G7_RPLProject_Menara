#pragma once

// ==============================================================================
// RoofGarden ESP32 Node Secrets Template
// Copy this file to secrets.h and fill in real WiFi and API credentials.
// secrets.h is excluded from git version control.
// ==============================================================================

#define WIFI_SSID       "Your_Rooftop_WiFi_SSID"
#define WIFI_PASS       "Your_WiFi_Password"

#define API_BASE_URL    "http://192.168.1.100:8000/api/v1"
// Optional: Node ID and API key. If omitted, nodes dynamically authenticate via hardware MAC address (WiFi.macAddress())
#define NODE_ID         "esp32-node-01"
#define NODE_API_KEY    "dev-node-api-key-secret-12345"

// NTP Server Configuration (UTC time with 'Z' suffix for API telemetry)
#define NTP_SERVER      "pool.ntp.org"
#define GMT_OFFSET_SEC  0
#define DAYLIGHT_OFFSET 0
