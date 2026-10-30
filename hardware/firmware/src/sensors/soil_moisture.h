#pragma once

#if defined(ARDUINO)
#include <Arduino.h>
#else
#include <cstdint>
#include <cstddef>
#endif

class SoilMoistureSensor {
public:
    SoilMoistureSensor(uint8_t pin, uint16_t dryRaw, uint16_t wetRaw, uint8_t sampleCount = 10);
    void begin();
    float readMoisturePct();
    uint16_t readRawMedian();

    // Pure calculation helper for percentage from raw ADC
    static float calculatePercentage(uint16_t raw, uint16_t dryRaw, uint16_t wetRaw);

#if !defined(ARDUINO)
    void setMockRawSample(uint16_t raw);
    void setMockRawSamples(const uint16_t* samples, size_t count);
#endif

private:
    uint8_t _pin;
    uint16_t _dryRaw;
    uint16_t _wetRaw;
    uint8_t _sampleCount;
};
