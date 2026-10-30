#pragma once

#if defined(ARDUINO)
#include <Arduino.h>
#include <Wire.h>
#include <BH1750.h>
#else
#include <cstdint>
#include <cstddef>
#endif

class LightSensor {
public:
    LightSensor(uint8_t sdaPin, uint8_t sclPin, uint8_t address = 0x23);
    bool begin();
    float readLux();
    static float clampLux(float rawLux);

#if !defined(ARDUINO)
    void setMockLux(float lux);
#endif

private:
    uint8_t _sdaPin;
    uint8_t _sclPin;
    uint8_t _address;
#if defined(ARDUINO)
    BH1750 _lightMeter;
#else
    float _mockLux;
#endif
};
