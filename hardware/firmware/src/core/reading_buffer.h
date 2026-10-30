#pragma once

#if defined(ARDUINO)
#include <Arduino.h>
#else
#include <cstddef>
#include <cstring>
#endif

struct SensorReading {
    char timestamp[30];
    float soil_moisture_pct;
    float temperature_c;
    float humidity_pct;
    float lux;
    float battery_v;
    bool is_valid;
};

class ReadingBuffer {
public:
    ReadingBuffer(size_t capacity = 100);
    ~ReadingBuffer();

    bool push(const SensorReading& reading);
    bool pop(SensorReading& reading);
    bool peek(SensorReading& reading) const;
    size_t size() const;
    bool isEmpty() const;
    bool isFull() const;
    void clear();

private:
    SensorReading* _buffer;
    size_t _capacity;
    size_t _head;
    size_t _tail;
    size_t _count;
};
