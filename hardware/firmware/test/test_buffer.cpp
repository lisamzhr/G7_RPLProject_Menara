// Hardware firmware unit test for ReadingBuffer ring buffer logic
#include <Arduino.h>
#include <assert.h>
#include "../src/core/reading_buffer.h"

void test_buffer_push_pop() {
    ReadingBuffer buf(5);
    assert(buf.isEmpty());
    assert(buf.size() == 0);

    SensorReading r1;
    memset(&r1, 0, sizeof(SensorReading));
    r1.soil_moisture_pct = 75.5f;
    r1.temperature_c = 28.0f;
    strncpy(r1.timestamp, "2026-10-15T12:00:00Z", sizeof(r1.timestamp));

    assert(buf.push(r1));
    assert(!buf.isEmpty());
    assert(buf.size() == 1);

    SensorReading out;
    assert(buf.peek(out));
    assert(out.soil_moisture_pct == 75.5f);

    assert(buf.pop(out));
    assert(out.soil_moisture_pct == 75.5f);
    assert(buf.isEmpty());
    assert(buf.size() == 0);
    Serial.println("[Test] test_buffer_push_pop PASSED");
}

void test_buffer_overflow_drops_oldest() {
    ReadingBuffer buf(3);

    for (int i = 1; i <= 3; ++i) {
        SensorReading r;
        memset(&r, 0, sizeof(SensorReading));
        r.soil_moisture_pct = (float)i;
        buf.push(r);
    }
    assert(buf.isFull());
    assert(buf.size() == 3);

    // Push 4th element: oldest (1.0) must be dropped
    SensorReading r4;
    memset(&r4, 0, sizeof(SensorReading));
    r4.soil_moisture_pct = 4.0f;
    buf.push(r4);

    assert(buf.size() == 3);
    SensorReading popped;
    buf.pop(popped);
    assert(popped.soil_moisture_pct == 2.0f); // 1.0 was dropped, 2.0 is next
    buf.pop(popped);
    assert(popped.soil_moisture_pct == 3.0f);
    buf.pop(popped);
    assert(popped.soil_moisture_pct == 4.0f);
    assert(buf.isEmpty());

    Serial.println("[Test] test_buffer_overflow_drops_oldest PASSED");
}

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("=== Starting Firmware ReadingBuffer Unit Tests ===");
    test_buffer_push_pop();
    test_buffer_overflow_drops_oldest();
    Serial.println("=== All Firmware ReadingBuffer Unit Tests PASSED ===");
}

void loop() {
    // Tests completed
    delay(1000);
}
