#pragma once

// ==============================================================================
// RoofGarden ESP32 Node Secrets Template
// Copy this file to secrets.h and fill in real WiFi and API credentials.
// secrets.h is excluded from git version control.
// ==============================================================================

#define WIFI_SSID       "Your_Rooftop_WiFi_SSID"
#define WIFI_PASS       "Your_WiFi_Password"

#define API_BASE_URL    "http://192.168.1.100:8000/api/v1"
#define NODE_ID         "esp32-node-01"
#define NODE_API_KEY    "dev-node-api-key-secret-12345"

// NTP Server Configuration (Jakarta / WIB is UTC+7)
#define NTP_SERVER      "pool.ntp.org"
#define GMT_OFFSET_SEC  25200 // 7 * 3600
#define DAYLIGHT_OFFSET 0
