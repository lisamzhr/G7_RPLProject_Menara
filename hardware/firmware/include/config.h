#pragma once

#if defined(ARDUINO)
#include <Arduino.h>
#endif

// ==============================================================================
// Mock Environment Toggle
// Set to 1 to simulate sensor inputs without physical hardware
// (Can also be enabled via build_flags: -D MOCK_ENVIRONMENT=1)
// ==============================================================================
#ifndef MOCK_ENVIRONMENT
#define MOCK_ENVIRONMENT        0
#endif

// ==============================================================================
// Hardware Pin Definitions
// ==============================================================================
#define DHT_PIN                 4    // GPIO4: DHT22 Data line
#define DHT_TYPE                DHT22

#define SOIL_PIN                34   // GPIO34: Capacitive Soil Moisture Analog (ADC1_CH6)

#define I2C_SDA_PIN             21   // GPIO21: BH1750 I2C Data
#define I2C_SCL_PIN             22   // GPIO22: BH1750 I2C Clock

#define RELAY_PIN               26   // GPIO26: Active-Low Sprinkler Relay
#define RELAY_ACTIVE_LOW        true

// Optional visual status LED on ESP32 DevKit (GPIO2)
#define STATUS_LED_PIN          2

// Onboard BOOT Button on ESP32 DevKit (GPIO0, Active-LOW)
// Hold on boot for 3s to trigger Wi-Fi Captive Portal setup
#define CONFIG_BUTTON_PIN       0
#define CONFIG_BUTTON_HOLD_SEC  3

// ==============================================================================
// Captive Portal Onboarding Configuration
// ==============================================================================
#define PORTAL_AP_SSID_PREFIX   "RoofGarden-Setup"
#define PORTAL_TIMEOUT_MS       300000 // 5 minutes inactivity timeout
#define PORTAL_DNS_PORT         53
#define PORTAL_HTTP_PORT        80

// ==============================================================================
// Timing Intervals (Seconds / Milliseconds)
// ==============================================================================
#define SEND_INTERVAL_S         300  // Production reading interval: 5 minutes
#define MOCK_SEND_INTERVAL_S    15   // Mock environment interval: 15 seconds (fast feedback)
#define COMMAND_POLL_INTERVAL_S 15   // Poll pending commands every 15 seconds
#define NTP_SYNC_INTERVAL_S     3600 // NTP resync every 1 hour

#if MOCK_ENVIRONMENT
#define EFFECTIVE_SEND_INTERVAL_S MOCK_SEND_INTERVAL_S
#else
#define EFFECTIVE_SEND_INTERVAL_S SEND_INTERVAL_S
#endif

// ==============================================================================
// Mock Environment Simulation Constants
// ==============================================================================
#define MOCK_INITIAL_SOIL_PCT   78.0f // Initial soil moisture %
#define MOCK_WATER_ABSORB_RATE  0.45f // % moisture increase per second of watering
#define MOCK_SOIL_DRY_RATE      0.02f // % moisture drop per second

// ==============================================================================
// Capacitive Soil Moisture Calibration Constants
// Note: To be calibrated with individual sensor in air vs cup of water
// ==============================================================================
#define SOIL_DRY_RAW            3200 // Raw 12-bit ADC in ambient air (0% moisture)
#define SOIL_WET_RAW            1400 // Raw 12-bit ADC fully submerged in water (100% moisture)
#define SOIL_SAMPLES_COUNT      10   // Median filter sample count

// ==============================================================================
// Fail-Safe Protections
// ==============================================================================
#define RELAY_MAX_ON_SECONDS    60   // Hard cap: relay automatically cuts off after 60s
#define NETWORK_TIMEOUT_MS      10000 // HTTP request timeout: 10s
#define BUFFER_MAX_READINGS     100  // In-RAM ring buffer capacity for offline resilience
