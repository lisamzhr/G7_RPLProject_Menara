#include "mock_sensors.h"
#include <cmath>
#include <cstdlib>
#include <algorithm>

#if defined(ARDUINO)
#include <Arduino.h>
#else
#include <chrono>
static inline unsigned long get_native_millis() {
    using namespace std::chrono;
    static auto start = steady_clock::now();
    return (unsigned long)duration_cast<milliseconds>(steady_clock::now() - start).count();
}
#define millis() get_native_millis()
#endif

MockSensors::MockSensors(float initialMoisture, MockScenario scenario)
    : _scenario(scenario),
      _currentMoisture(initialMoisture),
      _currentTemp(28.0f),
      _currentHum(72.0f),
      _currentLux(25000.0f),
      _batteryVoltage(4.10f),
      _tickCount(0),
      _anomalyActive(false),
      _lastUpdateMs(0) {}

void MockSensors::begin() {
    _lastUpdateMs = millis();
    calculateScenarioMetrics();
}

float MockSensors::generateNoise(float amplitude) {
    // Generate pseudo-random noise between -amplitude and +amplitude
    float normalized = ((float)(rand() % 1000) / 500.0f) - 1.0f;
    return normalized * amplitude;
}

void MockSensors::setScenario(MockScenario scenario) {
    _scenario = scenario;
    if (_scenario == MOCK_SCENARIO_DRY && _currentMoisture > 62.0f) {
        _currentMoisture = 60.0f; // Immediate step-down to accelerate test cycle
    } else if (_scenario == MOCK_SCENARIO_HEATWAVE && _currentMoisture > 55.0f) {
        _currentMoisture = 52.0f;
    }
    calculateScenarioMetrics();
}

MockScenario MockSensors::getScenario() const {
    return _scenario;
}

const char* MockSensors::getScenarioName() const {
    switch (_scenario) {
        case MOCK_SCENARIO_NORMAL:   return "NORMAL (Optimal)";
        case MOCK_SCENARIO_DRY:      return "DRY (Irrigation Trigger)";
        case MOCK_SCENARIO_HEATWAVE: return "HEATWAVE (Extreme Heat)";
        case MOCK_SCENARIO_DIURNAL:  return "DIURNAL (24-Hour Cycle)";
        default:                     return "UNKNOWN";
    }
}

void MockSensors::triggerAnomaly(bool enable) {
    _anomalyActive = enable;
}

bool MockSensors::isAnomalyActive() const {
    return _anomalyActive;
}

void MockSensors::setSoilMoisture(float pct) {
    _currentMoisture = std::max(0.0f, std::min(100.0f, pct));
}

void MockSensors::reset() {
    _currentMoisture = 78.0f;
    _currentTemp = 28.0f;
    _currentHum = 72.0f;
    _currentLux = 25000.0f;
    _batteryVoltage = 4.10f;
    _tickCount = 0;
    _anomalyActive = false;
    _lastUpdateMs = millis();
    calculateScenarioMetrics();
}

void MockSensors::manualWaterPulse(float boostPct) {
    _currentMoisture = std::min(94.0f, _currentMoisture + boostPct);
    // Evaporative cooling effect
    _currentTemp = std::max(22.0f, _currentTemp - 0.8f);
    _currentHum = std::min(95.0f, _currentHum + 5.0f);
}

void MockSensors::notifyWatering(uint32_t durationSeconds) {
    if (durationSeconds == 0) return;

    // Proportional absorption: ~0.45% moisture gain per second of watering, capped at 92%
    float gain = (float)durationSeconds * 0.45f;
    manualWaterPulse(gain);
}

void MockSensors::update(float deltaSeconds) {
    _tickCount++;
    unsigned long now = millis();
    if (deltaSeconds <= 0.0f) {
        deltaSeconds = (_lastUpdateMs > 0 && now >= _lastUpdateMs)
                           ? (float)(now - _lastUpdateMs) / 1000.0f
                           : 15.0f;
    }
    _lastUpdateMs = now;

    // Simulate steady soil dehydration
    float dryRatePerSec = 0.02f; // ~0.3% per 15s in normal conditions
    if (_scenario == MOCK_SCENARIO_DRY) {
        dryRatePerSec = 0.06f; // Rapid drying
    } else if (_scenario == MOCK_SCENARIO_HEATWAVE) {
        dryRatePerSec = 0.10f; // Extreme solar evaporation
    }

    _currentMoisture -= (dryRatePerSec * deltaSeconds);
    if (_currentMoisture < 20.0f) {
        _currentMoisture = 20.0f; // Baseline wilting point
    }

    // Battery slow discharge
    _batteryVoltage = std::max(3.40f, _batteryVoltage - (0.00005f * deltaSeconds));

    calculateScenarioMetrics();
}

void MockSensors::calculateScenarioMetrics() {
    switch (_scenario) {
        case MOCK_SCENARIO_NORMAL:
            _currentTemp = 27.5f;
            _currentHum = 72.0f;
            _currentLux = 24000.0f;
            break;

        case MOCK_SCENARIO_DRY:
            _currentTemp = 30.5f;
            _currentHum = 58.0f;
            _currentLux = 32000.0f;
            break;

        case MOCK_SCENARIO_HEATWAVE:
            _currentTemp = 36.2f;
            _currentHum = 44.0f;
            _currentLux = 58000.0f;
            break;

        case MOCK_SCENARIO_DIURNAL: {
            // Simulated 24-step diurnal cycle (1 step per tick)
            float step = (float)(_tickCount % 24) / 24.0f; // 0.0 to 1.0 (00:00 to 24:00)
            float hour = step * 24.0f;

            if (hour >= 6.0f && hour <= 18.0f) {
                // Daytime (06:00 - 18:00)
                float sunPhase = sinf((hour - 6.0f) / 12.0f * 3.14159f);
                _currentTemp = 25.0f + (9.0f * sunPhase);
                _currentHum = 85.0f - (35.0f * sunPhase);
                _currentLux = 65000.0f * sunPhase;
            } else {
                // Nighttime (18:00 - 06:00)
                _currentTemp = 24.5f;
                _currentHum = 86.0f;
                _currentLux = 0.0f;
            }
            break;
        }
    }
}

float MockSensors::readSoilMoisturePct() {
    if (_anomalyActive) {
        return 145.0f; // Out of bounds (> 100%)
    }
    float val = _currentMoisture + generateNoise(0.35f);
    return std::max(0.0f, std::min(100.0f, roundf(val * 10.0f) / 10.0f));
}

bool MockSensors::readDHT(float& temperatureC, float& humidityPct) {
    if (_anomalyActive) {
        temperatureC = 88.5f;  // Out of bounds (> 70.0°C)
        humidityPct = 125.0f;  // Out of bounds (> 100%)
        return true;
    }

    float t = _currentTemp + generateNoise(0.4f);
    float h = _currentHum + generateNoise(0.8f);

    temperatureC = roundf(t * 10.0f) / 10.0f;
    humidityPct = std::max(0.0f, std::min(100.0f, roundf(h * 10.0f) / 10.0f));
    return true;
}

float MockSensors::readLux() {
    if (_anomalyActive) {
        return 185000.0f; // Out of bounds (> 120,000 lx)
    }
    float lux = _currentLux + generateNoise(1200.0f);
    return std::max(0.0f, roundf(lux));
}

float MockSensors::readBatteryVoltage() {
    float v = _batteryVoltage + generateNoise(0.01f);
    return roundf(v * 100.0f) / 100.0f;
}
