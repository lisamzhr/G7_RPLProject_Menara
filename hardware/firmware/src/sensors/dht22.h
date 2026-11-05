#pragma once

#if defined(ARDUINO)
#include <Arduino.h>
#include <DHT.h>
#else
#include <cstdint>
#include <cstddef>
#include <cmath>
#endif

class DHTSensor {
public:
    DHTSensor(uint8_t pin, uint8_t type = 22);
    void begin();
    bool read(float& temperatureC, float& humidityPct);
    static bool validateReading(float t, float h);

#if !defined(ARDUINO)
    void setMockReading(float t, float h, bool fail = false);
#endif

private:
#if defined(ARDUINO)
    DHT _dht;
#else
    float _mockT;
    float _mockH;
    bool _mockFail;
#endif
};
