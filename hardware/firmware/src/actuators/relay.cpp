#include "relay.h"

RelayActuator::RelayActuator(uint8_t pin, bool activeLow, uint32_t hardMaxSeconds)
    : _pin(pin), _activeLow(activeLow), _hardMaxSeconds(hardMaxSeconds),
      _isOn(false), _turnOnMillis(0), _targetDurationSeconds(0) {}

void RelayActuator::begin() {
    pinMode(_pin, OUTPUT);
    // Boot safety: force state to OFF immediately
    setPhysicalState(false);
}

void RelayActuator::setPhysicalState(bool on) {
    _isOn = on;
    if (_activeLow) {
        digitalWrite(_pin, on ? LOW : HIGH);
    } else {
        digitalWrite(_pin, on ? HIGH : LOW);
    }
}

bool RelayActuator::turnOn(uint32_t requestedDurationSeconds) {
    if (requestedDurationSeconds == 0) {
        turnOff();
        return false;
    }

    // Safety rule: enforce hard cap on duration
    if (requestedDurationSeconds > _hardMaxSeconds) {
        _targetDurationSeconds = _hardMaxSeconds;
    } else {
        _targetDurationSeconds = requestedDurationSeconds;
    }

    _turnOnMillis = millis();
    setPhysicalState(true);
    return true;
}

void RelayActuator::turnOff() {
    setPhysicalState(false);
    _targetDurationSeconds = 0;
    _turnOnMillis = 0;
}

void RelayActuator::update() {
    if (!_isOn) {
        return;
    }

    unsigned long elapsedMs = millis() - _turnOnMillis;
    unsigned long targetMs = (unsigned long)_targetDurationSeconds * 1000UL;
    unsigned long hardMaxMs = (unsigned long)_hardMaxSeconds * 1000UL;

    // Cut off if either target duration or hard max limit is reached
    if (elapsedMs >= targetMs || elapsedMs >= hardMaxMs) {
        turnOff();
    }
}

bool RelayActuator::isOn() const {
    return _isOn;
}

uint32_t RelayActuator::getRemainingSeconds() const {
    if (!_isOn) return 0;
    unsigned long elapsedMs = millis() - _turnOnMillis;
    unsigned long targetMs = (unsigned long)_targetDurationSeconds * 1000UL;
    if (elapsedMs >= targetMs) return 0;
    return (uint32_t)((targetMs - elapsedMs) / 1000UL);
}
