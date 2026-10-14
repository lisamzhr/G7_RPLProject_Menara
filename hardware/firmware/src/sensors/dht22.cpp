#include "dht22.h"

DHTSensor::DHTSensor(uint8_t pin, uint8_t type)
    : _dht(pin, type) {}

void DHTSensor::begin() {
    _dht.begin();
}

bool DHTSensor::read(float& temperatureC, float& humidityPct) {
    float h = _dht.readHumidity();
    float t = _dht.readTemperature();

    if (isnan(h) || isnan(t)) {
        return false;
    }

    temperatureC = t;
    humidityPct = h;
    return true;
}
