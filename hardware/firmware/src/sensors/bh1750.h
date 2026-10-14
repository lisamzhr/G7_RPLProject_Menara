#pragma once

#include <Arduino.h>
#include <Wire.h>
#include <BH1750.h>

class LightSensor {
public:
    LightSensor(uint8_t sdaPin, uint8_t sclPin, uint8_t address = 0x23);
    bool begin();
    float readLux();

private:
    uint8_t _sdaPin;
    uint8_t _sclPin;
    uint8_t _address;
    BH1750 _lightMeter;
};
