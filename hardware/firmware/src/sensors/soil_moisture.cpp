#include "soil_moisture.h"
#include <vector>
#include <algorithm>

#if defined(ARDUINO)
#include <Arduino.h>
#else
#ifndef INPUT
#define INPUT 0
#endif
#define ADC_11db 0
static inline void pinMode(uint8_t pin, uint8_t mode) { (void)pin; (void)mode; }
static inline void analogSetAttenuation(int atten) { (void)atten; }
static inline void delay(unsigned long ms) { (void)ms; }

static std::vector<uint16_t> s_mock_samples;
static size_t s_mock_sample_idx = 0;
static uint16_t s_default_raw = 2300;

static inline uint16_t analogRead(uint8_t pin) {
    (void)pin;
    if (!s_mock_samples.empty()) {
        uint16_t val = s_mock_samples[s_mock_sample_idx % s_mock_samples.size()];
        s_mock_sample_idx++;
        return val;
    }
    return s_default_raw;
}
#endif

SoilMoistureSensor::SoilMoistureSensor(uint8_t pin, uint16_t dryRaw, uint16_t wetRaw, uint8_t sampleCount)
    : _pin(pin), _dryRaw(dryRaw), _wetRaw(wetRaw), _sampleCount(sampleCount) {}

void SoilMoistureSensor::begin() {
    pinMode(_pin, INPUT);
    analogSetAttenuation(ADC_11db); // Full range 0 - 3.3V on ESP32 ADC
}

uint16_t SoilMoistureSensor::readRawMedian() {
    std::vector<uint16_t> samples;
    samples.reserve(_sampleCount);

    for (uint8_t i = 0; i < _sampleCount; ++i) {
        samples.push_back(analogRead(_pin));
        delay(20);
    }

    std::sort(samples.begin(), samples.end());
    return samples[samples.size() / 2];
}

float SoilMoistureSensor::calculatePercentage(uint16_t raw, uint16_t dryRaw, uint16_t wetRaw) {
    // Safety check on configuration
    if (dryRaw == wetRaw) {
        return 0.0f;
    }

    // Inverse capacitive relationship: higher moisture = lower raw ADC
    float pct = ((float)(dryRaw - raw) / (float)(dryRaw - wetRaw)) * 100.0f;
    if (pct < 0.0f) pct = 0.0f;
    if (pct > 100.0f) pct = 100.0f;

    return pct;
}

float SoilMoistureSensor::readMoisturePct() {
    uint16_t raw = readRawMedian();
    return calculatePercentage(raw, _dryRaw, _wetRaw);
}

#if !defined(ARDUINO)
void SoilMoistureSensor::setMockRawSample(uint16_t raw) {
    s_mock_samples.clear();
    s_default_raw = raw;
    s_mock_sample_idx = 0;
}

void SoilMoistureSensor::setMockRawSamples(const uint16_t* samples, size_t count) {
    s_mock_samples.assign(samples, samples + count);
    s_mock_sample_idx = 0;
}
#endif
