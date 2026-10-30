// Unit test for MockSensors suite
#include <unity.h>
#include "sensors/mock_sensors.h"
#include <cmath>

void setUp(void) {}
void tearDown(void) {}

void test_mock_sensors_init_and_defaults(void) {
    MockSensors sensors(75.0f, MOCK_SCENARIO_NORMAL);
    sensors.begin();

    TEST_ASSERT_EQUAL(MOCK_SCENARIO_NORMAL, sensors.getScenario());
    TEST_ASSERT_EQUAL_STRING("NORMAL (Optimal)", sensors.getScenarioName());

    float moisture = sensors.readSoilMoisturePct();
    TEST_ASSERT_TRUE(moisture >= 70.0f && moisture <= 80.0f);

    float temp = 0.0f, hum = 0.0f;
    TEST_ASSERT_TRUE(sensors.readDHT(temp, hum));
    TEST_ASSERT_TRUE(temp >= 25.0f && temp <= 30.0f);
    TEST_ASSERT_TRUE(hum >= 65.0f && hum <= 80.0f);

    float lux = sensors.readLux();
    TEST_ASSERT_TRUE(lux >= 15000.0f && lux <= 35000.0f);

    float batt = sensors.readBatteryVoltage();
    TEST_ASSERT_TRUE(batt >= 3.8f && batt <= 4.25f);
}

void test_mock_sensors_dry_scenario(void) {
    MockSensors sensors(75.0f, MOCK_SCENARIO_NORMAL);
    sensors.begin();

    sensors.setScenario(MOCK_SCENARIO_DRY);
    TEST_ASSERT_EQUAL(MOCK_SCENARIO_DRY, sensors.getScenario());
    TEST_ASSERT_EQUAL_STRING("DRY (Irrigation Trigger)", sensors.getScenarioName());

    float moisture = sensors.readSoilMoisturePct();
    TEST_ASSERT_TRUE(moisture <= 65.0f);

    float temp = 0.0f, hum = 0.0f;
    TEST_ASSERT_TRUE(sensors.readDHT(temp, hum));
    TEST_ASSERT_TRUE(temp >= 29.0f && temp <= 33.0f);
    TEST_ASSERT_TRUE(hum >= 50.0f && hum <= 65.0f);
}

void test_mock_sensors_heatwave_scenario(void) {
    MockSensors sensors(75.0f, MOCK_SCENARIO_NORMAL);
    sensors.begin();

    sensors.setScenario(MOCK_SCENARIO_HEATWAVE);
    TEST_ASSERT_EQUAL(MOCK_SCENARIO_HEATWAVE, sensors.getScenario());

    float temp = 0.0f, hum = 0.0f;
    TEST_ASSERT_TRUE(sensors.readDHT(temp, hum));
    TEST_ASSERT_TRUE(temp >= 34.0f && temp <= 39.0f);
    TEST_ASSERT_TRUE(hum <= 52.0f);

    float lux = sensors.readLux();
    TEST_ASSERT_TRUE(lux >= 45000.0f);
}

void test_mock_sensors_watering_replenishes_moisture(void) {
    MockSensors sensors(50.0f, MOCK_SCENARIO_NORMAL);
    sensors.begin();

    float before = sensors.readSoilMoisturePct();
    TEST_ASSERT_TRUE(before <= 55.0f);

    // Command 30 seconds watering
    sensors.notifyWatering(30);

    float after = sensors.readSoilMoisturePct();
    // 30s * 0.45 = +13.5%
    TEST_ASSERT_TRUE(after > before + 8.0f);
}

void test_mock_sensors_anomaly_injection(void) {
    MockSensors sensors(75.0f, MOCK_SCENARIO_NORMAL);
    sensors.begin();

    TEST_ASSERT_FALSE(sensors.isAnomalyActive());
    sensors.triggerAnomaly(true);
    TEST_ASSERT_TRUE(sensors.isAnomalyActive());

    // Injected readings must exceed standard operational bounds
    float moisture = sensors.readSoilMoisturePct();
    TEST_ASSERT_TRUE(moisture > 100.0f);

    float temp = 0.0f, hum = 0.0f;
    sensors.readDHT(temp, hum);
    TEST_ASSERT_TRUE(temp > 70.0f);
    TEST_ASSERT_TRUE(hum > 100.0f);

    float lux = sensors.readLux();
    TEST_ASSERT_TRUE(lux > 120000.0f);

    sensors.triggerAnomaly(false);
    TEST_ASSERT_FALSE(sensors.isAnomalyActive());
    TEST_ASSERT_TRUE(sensors.readSoilMoisturePct() <= 100.0f);
}

int run_mock_sensor_tests() {
    UNITY_BEGIN();
    RUN_TEST(test_mock_sensors_init_and_defaults);
    RUN_TEST(test_mock_sensors_dry_scenario);
    RUN_TEST(test_mock_sensors_heatwave_scenario);
    RUN_TEST(test_mock_sensors_watering_replenishes_moisture);
    RUN_TEST(test_mock_sensors_anomaly_injection);
    return UNITY_END();
}

#if defined(ARDUINO)
void setup() {
    run_mock_sensor_tests();
}
void loop() {}
#else
int main(int argc, char **argv) {
    return run_mock_sensor_tests();
}
#endif
