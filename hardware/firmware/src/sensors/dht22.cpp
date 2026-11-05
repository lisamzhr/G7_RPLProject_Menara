#include "dht22.h"

DHTSensor::DHTSensor(uint8_t pin, uint8_t type)
#if defined(ARDUINO)
    : _dht(pin, type) {}
#else
    : _mockT(28.0f), _mockH(75.0f), _mockFail(false) { (void)pin; (void)type; }
#endif

void DHTSensor::begin() {
#if defined(ARDUINO)
    _dht.begin();
#endif
}

bool DHTSensor::validateReading(float t, float h) {
    if (std::isnan(h) || std::isnan(t)) {
        return false;
    }
    return true;
}

bool DHTSensor::read(float& temperatureC, float& humidityPct) {
#if defined(ARDUINO)
    float h = _dht.readHumidity();
    float t = _dht.readTemperature();
    if (!validateReading(t, h)) {
        return false;
    }
    temperatureC = t;
    humidityPct = h;
    return true;
#else
    if (_mockFail || !validateReading(_mockT, _mockH)) {
        return false;
    }
    temperatureC = _mockT;
    humidityPct = _mockH;
    return true;
#endif
}

#if !defined(ARDUINO)
void DHTSensor::setMockReading(float t, float h, bool fail) {
    _mockT = t;
    _mockH = h;
    _mockFail = fail;
}
#endif
