#pragma once

#include <Arduino.h>
#include <DHT.h>

class DHTSensor {
public:
    DHTSensor(uint8_t pin, uint8_t type = DHT22);
    void begin();
    bool read(float& temperatureC, float& humidityPct);

private:
    DHT _dht;
};
