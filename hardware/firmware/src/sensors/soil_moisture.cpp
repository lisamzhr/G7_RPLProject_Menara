#include "soil_moisture.h"
#include <vector>
#include <algorithm>

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

float SoilMoistureSensor::readMoisturePct() {
    uint16_t raw = readRawMedian();
    
    // Safety check on configuration
    if (_dryRaw == _wetRaw) {
        return 0.0f;
    }

    // Inverse capacitive relationship: higher moisture = lower raw ADC
    float pct = ((float)(_dryRaw - raw) / (float)(_dryRaw - _wetRaw)) * 100.0f;
    if (pct < 0.0f) pct = 0.0f;
    if (pct > 100.0f) pct = 100.0f;

    return pct;
}
