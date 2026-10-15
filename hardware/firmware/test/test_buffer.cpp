// Hardware firmware unit test for ReadingBuffer ring buffer logic
#include <unity.h>
#include "core/reading_buffer.h"
#include <cstring>

void setUp(void) {}
void tearDown(void) {}

void test_buffer_push_pop(void) {
    ReadingBuffer buf(5);
    TEST_ASSERT_TRUE(buf.isEmpty());
    TEST_ASSERT_EQUAL_UINT(0, buf.size());

    SensorReading r1;
    memset(&r1, 0, sizeof(SensorReading));
    r1.soil_moisture_pct = 75.5f;
    r1.temperature_c = 28.0f;
    strncpy(r1.timestamp, "2026-10-15T12:00:00Z", sizeof(r1.timestamp));

    TEST_ASSERT_TRUE(buf.push(r1));
    TEST_ASSERT_FALSE(buf.isEmpty());
    TEST_ASSERT_EQUAL_UINT(1, buf.size());

    SensorReading out;
    TEST_ASSERT_TRUE(buf.peek(out));
    TEST_ASSERT_EQUAL_FLOAT(75.5f, out.soil_moisture_pct);

    TEST_ASSERT_TRUE(buf.pop(out));
    TEST_ASSERT_EQUAL_FLOAT(75.5f, out.soil_moisture_pct);
    TEST_ASSERT_TRUE(buf.isEmpty());
    TEST_ASSERT_EQUAL_UINT(0, buf.size());
}

void test_buffer_overflow_drops_oldest(void) {
    ReadingBuffer buf(3);

    for (int i = 1; i <= 3; ++i) {
        SensorReading r;
        memset(&r, 0, sizeof(SensorReading));
        r.soil_moisture_pct = (float)i;
        TEST_ASSERT_TRUE(buf.push(r));
    }
    TEST_ASSERT_TRUE(buf.isFull());
    TEST_ASSERT_EQUAL_UINT(3, buf.size());

    // Push 4th element: oldest (1.0) must be dropped
    SensorReading r4;
    memset(&r4, 0, sizeof(SensorReading));
    r4.soil_moisture_pct = 4.0f;
    TEST_ASSERT_TRUE(buf.push(r4));

    TEST_ASSERT_EQUAL_UINT(3, buf.size());
    SensorReading popped;
    TEST_ASSERT_TRUE(buf.pop(popped));
    TEST_ASSERT_EQUAL_FLOAT(2.0f, popped.soil_moisture_pct); // 1.0 was dropped
    TEST_ASSERT_TRUE(buf.pop(popped));
    TEST_ASSERT_EQUAL_FLOAT(3.0f, popped.soil_moisture_pct);
    TEST_ASSERT_TRUE(buf.pop(popped));
    TEST_ASSERT_EQUAL_FLOAT(4.0f, popped.soil_moisture_pct);
    TEST_ASSERT_TRUE(buf.isEmpty());
}

int run_tests() {
    UNITY_BEGIN();
    RUN_TEST(test_buffer_push_pop);
    RUN_TEST(test_buffer_overflow_drops_oldest);
    return UNITY_END();
}

#if defined(ARDUINO)
void setup() {
    run_tests();
}
void loop() {}
#else
int main(int argc, char **argv) {
    return run_tests();
}
#endif
