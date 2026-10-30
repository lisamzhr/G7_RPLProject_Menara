#include <unity.h>
#include "sensors/soil_moisture.h"
#include "sensors/bh1750.h"
#include "sensors/dht22.h"
#include "core/reading_buffer.h"
#include <cmath>
#include <cstring>

void setUp(void) {}
void tearDown(void) {}

void test_soil_moisture_dry_calibration(void) {
    // 3200 is dry threshold (0.0%)
    float pct = SoilMoistureSensor::calculatePercentage(3200, 3200, 1400);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 0.0f, pct);
}

void test_soil_moisture_wet_calibration(void) {
    // 1400 is wet threshold (100.0%)
    float pct = SoilMoistureSensor::calculatePercentage(1400, 3200, 1400);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 100.0f, pct);
}

void test_soil_moisture_midpoint_calculation(void) {
    // 2300 is midpoint between 3200 and 1400 (50.0%)
    float pct = SoilMoistureSensor::calculatePercentage(2300, 3200, 1400);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 50.0f, pct);
}

void test_soil_moisture_clamping_dry_air(void) {
    // Raw ADC higher than dry threshold (e.g. sensor in arid air, 3600)
    float pct = SoilMoistureSensor::calculatePercentage(3600, 3200, 1400);
    TEST_ASSERT_EQUAL_FLOAT(0.0f, pct);
}

void test_soil_moisture_clamping_fully_submerged(void) {
    // Raw ADC lower than wet threshold (e.g. sensor fully immersed in mineral water, 1000)
    float pct = SoilMoistureSensor::calculatePercentage(1000, 3200, 1400);
    TEST_ASSERT_EQUAL_FLOAT(100.0f, pct);
}

void test_soil_moisture_zero_division_guard(void) {
    // Safety check: misconfigured or identical dry/wet thresholds must return 0.0f without NaN or crash
    float pct = SoilMoistureSensor::calculatePercentage(2000, 2000, 2000);
    TEST_ASSERT_EQUAL_FLOAT(0.0f, pct);
}

void test_soil_moisture_median_filter_spike_rejection(void) {
    SoilMoistureSensor sensor(34, 3200, 1400, 10);
    sensor.begin();

    // 10 samples where one sample is an extreme electrical noise glitch (500)
    uint16_t noisySamples[10] = { 2800, 2805, 2795, 2800, 500, 2810, 2800, 2790, 2805, 2800 };
    sensor.setMockRawSamples(noisySamples, 10);

    uint16_t median = sensor.readRawMedian();
    // Sorted array: [500, 2790, 2795, 2800, 2800, 2800, 2805, 2805, 2810] -> element 5 is 2800
    TEST_ASSERT_EQUAL_UINT16(2800, median);
}

void test_soil_moisture_read_pct_with_median(void) {
    SoilMoistureSensor sensor(34, 3200, 1400, 10);
    sensor.begin();

    uint16_t samples[10] = { 2300, 2310, 2295, 2305, 2300, 2290, 2315, 2300, 2305, 2300 };
    sensor.setMockRawSamples(samples, 10);

    float pct = sensor.readMoisturePct();
    TEST_ASSERT_FLOAT_WITHIN(1.0f, 50.0f, pct);
}

void test_light_sensor_lux_clamping_negative(void) {
    // Faulty or negative I2C reading clamped to 0 lux
    float clamped = LightSensor::clampLux(-25.4f);
    TEST_ASSERT_EQUAL_FLOAT(0.0f, clamped);
}

void test_light_sensor_valid_lux(void) {
    float lux = LightSensor::clampLux(52000.0f);
    TEST_ASSERT_EQUAL_FLOAT(52000.0f, lux);

    LightSensor sensor(21, 22);
    TEST_ASSERT_TRUE(sensor.begin());
    sensor.setMockLux(38000.0f);
    TEST_ASSERT_EQUAL_FLOAT(38000.0f, sensor.readLux());
}

void test_dht_sensor_validate_reading_valid(void) {
    TEST_ASSERT_TRUE(DHTSensor::validateReading(28.4f, 72.1f));
}

void test_dht_sensor_validate_reading_nan_temp(void) {
    TEST_ASSERT_FALSE(DHTSensor::validateReading(NAN, 72.1f));
}

void test_dht_sensor_validate_reading_nan_hum(void) {
    TEST_ASSERT_FALSE(DHTSensor::validateReading(28.4f, NAN));
}

void test_dht_sensor_read_and_fallback_behavior(void) {
    DHTSensor sensor(4, 22);
    sensor.begin();

    // 1. Successful read
    sensor.setMockReading(31.2f, 68.5f, false);
    float t = 0.0f, h = 0.0f;
    TEST_ASSERT_TRUE(sensor.read(t, h));
    TEST_ASSERT_FLOAT_WITHIN(0.1f, 31.2f, t);
    TEST_ASSERT_FLOAT_WITHIN(0.1f, 68.5f, h);

    // 2. Hardware failure fallback
    sensor.setMockReading(0.0f, 0.0f, true);
    bool readSuccess = sensor.read(t, h);
    TEST_ASSERT_FALSE(readSuccess);

    // Simulate fallback behavior from firmware main.cpp
    SensorReading reading;
    memset(&reading, 0, sizeof(SensorReading));
    if (readSuccess) {
        reading.temperature_c = t;
        reading.humidity_pct = h;
    } else {
        reading.temperature_c = -999.0f;
        reading.humidity_pct = -999.0f;
    }
    reading.is_valid = (reading.temperature_c > -50.0f);

    TEST_ASSERT_EQUAL_FLOAT(-999.0f, reading.temperature_c);
    TEST_ASSERT_EQUAL_FLOAT(-999.0f, reading.humidity_pct);
    TEST_ASSERT_FALSE(reading.is_valid);
}

void test_sensor_reading_validity_rules(void) {
    SensorReading r;
    memset(&r, 0, sizeof(SensorReading));
    r.temperature_c = 29.5f;
    r.humidity_pct = 70.0f;
    r.soil_moisture_pct = 65.0f;
    r.lux = 25000.0f;
    r.battery_v = 3.95f;
    r.is_valid = (r.temperature_c > -50.0f);

    TEST_ASSERT_TRUE(r.is_valid);
    TEST_ASSERT_TRUE(r.soil_moisture_pct >= 0.0f && r.soil_moisture_pct <= 100.0f);
    TEST_ASSERT_TRUE(r.battery_v > 3.0f);
}

int run_sensor_tests() {
    UNITY_BEGIN();
    RUN_TEST(test_soil_moisture_dry_calibration);
    RUN_TEST(test_soil_moisture_wet_calibration);
    RUN_TEST(test_soil_moisture_midpoint_calculation);
    RUN_TEST(test_soil_moisture_clamping_dry_air);
    RUN_TEST(test_soil_moisture_clamping_fully_submerged);
    RUN_TEST(test_soil_moisture_zero_division_guard);
    RUN_TEST(test_soil_moisture_median_filter_spike_rejection);
    RUN_TEST(test_soil_moisture_read_pct_with_median);
    RUN_TEST(test_light_sensor_lux_clamping_negative);
    RUN_TEST(test_light_sensor_valid_lux);
    RUN_TEST(test_dht_sensor_validate_reading_valid);
    RUN_TEST(test_dht_sensor_validate_reading_nan_temp);
    RUN_TEST(test_dht_sensor_validate_reading_nan_hum);
    RUN_TEST(test_dht_sensor_read_and_fallback_behavior);
    RUN_TEST(test_sensor_reading_validity_rules);
    return UNITY_END();
}

#if defined(ARDUINO)
void setup() {
    run_sensor_tests();
}
void loop() {}
#else
int main(int argc, char **argv) {
    (void)argc;
    (void)argv;
    return run_sensor_tests();
}
#endif
