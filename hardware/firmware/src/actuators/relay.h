#pragma once

#if defined(ARDUINO)
#include <Arduino.h>
#else
#include <cstdint>
#include <cstddef>
#endif

class RelayActuator {
public:
    RelayActuator(uint8_t pin, bool activeLow = true, uint32_t hardMaxSeconds = 60);
    void begin();
    bool turnOn(uint32_t requestedDurationSeconds);
    void turnOff();
    void update(); // Must be called periodically in loop() to enforce auto-shutoff
    bool isOn() const;
    uint32_t getRemainingSeconds() const;
    uint32_t getTargetDurationSeconds() const { return _targetDurationSeconds; }
    uint32_t getHardMaxSeconds() const { return _hardMaxSeconds; }
    uint8_t getPin() const { return _pin; }
    bool isActiveLow() const { return _activeLow; }

#if !defined(ARDUINO)
    void simulateElapsedMs(unsigned long ms);
    uint8_t getPhysicalPinState() const;
#endif

private:
    uint8_t _pin;
    bool _activeLow;
    uint32_t _hardMaxSeconds;
    bool _isOn;
    unsigned long _turnOnMillis;
    uint32_t _targetDurationSeconds;

    void setPhysicalState(bool on);
};
