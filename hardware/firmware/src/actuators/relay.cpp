#include "relay.h"

#if defined(ARDUINO)
#include <Arduino.h>
#else
#include <chrono>

#ifndef OUTPUT
#define OUTPUT 1
#endif
#ifndef INPUT
#define INPUT 0
#endif
#ifndef HIGH
#define HIGH 1
#endif
#ifndef LOW
#define LOW 0
#endif

static uint8_t s_relay_pin_state = 0xFF;
static uint8_t s_relay_pin_mode = 0xFF;
static unsigned long s_simulated_relay_millis = 0;
static bool s_use_simulated_millis = false;

static inline void pinMode(uint8_t pin, uint8_t mode) {
    (void)pin;
    s_relay_pin_mode = mode;
}

static inline void digitalWrite(uint8_t pin, uint8_t val) {
    (void)pin;
    s_relay_pin_state = val;
}

static inline unsigned long get_relay_millis() {
    if (s_use_simulated_millis) {
        return s_simulated_relay_millis;
    }
    using namespace std::chrono;
    static auto start = steady_clock::now();
    return (unsigned long)duration_cast<milliseconds>(steady_clock::now() - start).count();
}
#define millis() get_relay_millis()
#endif

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

#if !defined(ARDUINO)
void RelayActuator::simulateElapsedMs(unsigned long ms) {
    s_use_simulated_millis = true;
    s_simulated_relay_millis = _turnOnMillis + ms;
}

uint8_t RelayActuator::getPhysicalPinState() const {
    return s_relay_pin_state;
}
#endif
