#include "bh1750.h"

LightSensor::LightSensor(uint8_t sdaPin, uint8_t sclPin, uint8_t address)
    : _sdaPin(sdaPin), _sclPin(sclPin), _address(address)
#if defined(ARDUINO)
      , _lightMeter(address)
#else
      , _mockLux(25000.0f)
#endif
{}

bool LightSensor::begin() {
#if defined(ARDUINO)
    Wire.begin(_sdaPin, _sclPin);
    return _lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
#else
    return true;
#endif
}

float LightSensor::clampLux(float lux) {
    if (lux < 0.0f) {
        return 0.0f;
    }
    return lux;
}

bool LightSensor::read(float& luxOut) {
#if defined(ARDUINO)
    float raw = _lightMeter.readLightLevel();
    if (raw < 0.0f) {
        luxOut = -1.0f;
        return false;
    }
    luxOut = raw;
    return true;
#else
    if (_mockLux < 0.0f) {
        luxOut = -1.0f;
        return false;
    }
    luxOut = _mockLux;
    return true;
#endif
}

float LightSensor::readLux() {
#if defined(ARDUINO)
    float lux = _lightMeter.readLightLevel();
    return clampLux(lux);
#else
    return clampLux(_mockLux);
#endif
}

#if !defined(ARDUINO)
void LightSensor::setMockLux(float lux) {
    _mockLux = lux;
}
#endif
