#pragma once

#include <Arduino.h>

class RelayActuator {
public:
    RelayActuator(uint8_t pin, bool activeLow = true, uint32_t hardMaxSeconds = 60);
    void begin();
    bool turnOn(uint32_t requestedDurationSeconds);
    void turnOff();
    void update(); // Must be called periodically in loop() to enforce auto-shutoff
    bool isOn() const;
    uint32_t getRemainingSeconds() const;

private:
    uint8_t _pin;
    bool _activeLow;
    uint32_t _hardMaxSeconds;
    bool _isOn;
    unsigned long _turnOnMillis;
    uint32_t _targetDurationSeconds;

    void setPhysicalState(bool on);
};
