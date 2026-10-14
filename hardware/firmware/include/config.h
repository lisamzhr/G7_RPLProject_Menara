#pragma once

#include <Arduino.h>

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

// ==============================================================================
// Timing Intervals (Seconds / Milliseconds)
// ==============================================================================
#define SEND_INTERVAL_S         300  // Reading interval: 5 minutes
#define COMMAND_POLL_INTERVAL_S 30   // Poll pending commands every 30 seconds
#define NTP_SYNC_INTERVAL_S     3600 // NTP resync every 1 hour

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
