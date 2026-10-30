#pragma once

#include <cstdint>
#include <cstddef>

/**
 * @brief Simulation scenarios for mock sensor telemetry.
 */
enum MockScenario {
    MOCK_SCENARIO_NORMAL = 0,   // Optimal growing conditions (Jakarta tropical rooftop)
    MOCK_SCENARIO_DRY = 1,      // Dehydrating soil (<65%) to trigger automated watering
    MOCK_SCENARIO_HEATWAVE = 2, // High heat (>34°C) & low humidity (heat stress alerts)
    MOCK_SCENARIO_DIURNAL = 3   // Real day/night cycle simulation
};

/**
 * @brief High-fidelity mock sensor suite simulating capacitive soil moisture,
 * DHT22 (temp/hum), BH1750 (lux), and Li-ion battery voltage.
 *
 * Fully reactive to actuator commands: watering events increase soil moisture,
 * allowing end-to-end testing of the AI rule engine and verify_actions job.
 */
class MockSensors {
public:
    MockSensors(float initialMoisture = 78.0f, MockScenario scenario = MOCK_SCENARIO_NORMAL);

    void begin();

    /**
     * @brief Advance simulation state by elapsed time.
     * @param deltaSeconds Seconds elapsed since last step (0 = auto-calculate).
     */
    void update(float deltaSeconds = 0.0f);

    /**
     * @brief Read capacitive soil moisture percentage (0.0% - 100.0%).
     */
    float readSoilMoisturePct();

    /**
     * @brief Read ambient temperature (°C) and relative humidity (%).
     * @return true if valid reading, false on simulated failure.
     */
    bool readDHT(float& temperatureC, float& humidityPct);

    /**
     * @brief Read ambient illuminance in lux (0 - 120,000 lx).
     */
    float readLux();

    /**
     * @brief Read simulated battery voltage (3.6V - 4.2V).
     */
    float readBatteryVoltage();

    /**
     * @brief Simulates water absorption into the soil from an irrigation event.
     * @param durationSeconds Active watering duration in seconds.
     */
    void notifyWatering(uint32_t durationSeconds);

    /**
     * @brief Manual immediate moisture adjustment (e.g. from serial terminal).
     */
    void manualWaterPulse(float boostPct = 12.0f);

    /**
     * @brief Switch active simulation scenario.
     */
    void setScenario(MockScenario scenario);
    MockScenario getScenario() const;
    const char* getScenarioName() const;

    /**
     * @brief Toggle out-of-bounds anomaly injection to test backend validation.
     */
    void triggerAnomaly(bool enable);
    bool isAnomalyActive() const;

    /**
     * @brief Reset simulation state to baseline.
     */
    void reset();

    /**
     * @brief Direct moisture override for deterministic testing.
     */
    void setSoilMoisture(float pct);

private:
    MockScenario _scenario;
    float _currentMoisture;
    float _currentTemp;
    float _currentHum;
    float _currentLux;
    float _batteryVoltage;
    uint32_t _tickCount;
    bool _anomalyActive;
    unsigned long _lastUpdateMs;

    void calculateScenarioMetrics();
    float generateNoise(float amplitude);
};
