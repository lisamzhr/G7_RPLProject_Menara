#include "reading_buffer.h"

ReadingBuffer::ReadingBuffer(size_t capacity)
    : _capacity(capacity), _head(0), _tail(0), _count(0) {
    _buffer = new SensorReading[_capacity];
}

ReadingBuffer::~ReadingBuffer() {
    delete[] _buffer;
}

bool ReadingBuffer::push(const SensorReading& reading) {
    if (isFull()) {
        // Drop oldest reading when buffer is full
        _head = (_head + 1) % _capacity;
        _count--;
    }
    _buffer[_tail] = reading;
    _tail = (_tail + 1) % _capacity;
    _count++;
    return true;
}

bool ReadingBuffer::pop(SensorReading& reading) {
    if (isEmpty()) {
        return false;
    }
    reading = _buffer[_head];
    _head = (_head + 1) % _capacity;
    _count--;
    return true;
}

bool ReadingBuffer::peek(SensorReading& reading) const {
    if (isEmpty()) {
        return false;
    }
    reading = _buffer[_head];
    return true;
}

size_t ReadingBuffer::size() const {
    return _count;
}

bool ReadingBuffer::isEmpty() const {
    return _count == 0;
}

bool ReadingBuffer::isFull() const {
    return _count >= _capacity;
}

void ReadingBuffer::clear() {
    _head = 0;
    _tail = 0;
    _count = 0;
}
