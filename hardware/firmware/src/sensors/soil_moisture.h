#pragma once

#include <Arduino.h>

class SoilMoistureSensor {
public:
    SoilMoistureSensor(uint8_t pin, uint16_t dryRaw, uint16_t wetRaw, uint8_t sampleCount = 10);
    void begin();
    float readMoisturePct();
    uint16_t readRawMedian();

private:
    uint8_t _pin;
    uint16_t _dryRaw;
    uint16_t _wetRaw;
    uint8_t _sampleCount;
};
