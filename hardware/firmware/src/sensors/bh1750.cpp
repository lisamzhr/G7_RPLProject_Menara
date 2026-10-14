#include "bh1750.h"

LightSensor::LightSensor(uint8_t sdaPin, uint8_t sclPin, uint8_t address)
    : _sdaPin(sdaPin), _sclPin(sclPin), _address(address), _lightMeter(address) {}

bool LightSensor::begin() {
    Wire.begin(_sdaPin, _sclPin);
    return _lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
}

float LightSensor::readLux() {
    float lux = _lightMeter.readLightLevel();
    if (lux < 0.0f) {
        return 0.0f;
    }
    return lux;
}
