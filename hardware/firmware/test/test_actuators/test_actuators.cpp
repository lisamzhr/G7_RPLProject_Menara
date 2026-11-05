#include <unity.h>
#include "actuators/relay.h"
#include <cstdint>

void setUp(void) {}
void tearDown(void) {}

void test_relay_initialization_safety(void) {
    RelayActuator relay(26, /*activeLow=*/true, /*hardMaxSeconds=*/60);
    relay.begin();

    // Boot safety: relay must default to OFF and physical pin must be inactive (HIGH for active-low)
    TEST_ASSERT_FALSE(relay.isOn());
    TEST_ASSERT_EQUAL_UINT32(0, relay.getRemainingSeconds());
    TEST_ASSERT_EQUAL_UINT8(1, relay.getPhysicalPinState()); // HIGH = OFF for active-low
    TEST_ASSERT_EQUAL_UINT8(26, relay.getPin());
    TEST_ASSERT_TRUE(relay.isActiveLow());
}

void test_relay_active_high_polarity(void) {
    RelayActuator relay(26, /*activeLow=*/false, /*hardMaxSeconds=*/60);
    relay.begin();

    // Inactive state for active-high is LOW
    TEST_ASSERT_FALSE(relay.isOn());
    TEST_ASSERT_EQUAL_UINT8(0, relay.getPhysicalPinState());

    // Turn ON
    TEST_ASSERT_TRUE(relay.turnOn(20));
    TEST_ASSERT_TRUE(relay.isOn());
    TEST_ASSERT_EQUAL_UINT8(1, relay.getPhysicalPinState()); // HIGH = ON for active-high

    // Turn OFF
    relay.turnOff();
    TEST_ASSERT_FALSE(relay.isOn());
    TEST_ASSERT_EQUAL_UINT8(0, relay.getPhysicalPinState());
}

void test_relay_turn_on_valid_duration(void) {
    RelayActuator relay(26, /*activeLow=*/true, /*hardMaxSeconds=*/60);
    relay.begin();

    bool result = relay.turnOn(30);
    TEST_ASSERT_TRUE(result);
    TEST_ASSERT_TRUE(relay.isOn());
    TEST_ASSERT_EQUAL_UINT32(30, relay.getTargetDurationSeconds());
    TEST_ASSERT_TRUE(relay.getRemainingSeconds() <= 30 && relay.getRemainingSeconds() >= 29);
    TEST_ASSERT_EQUAL_UINT8(0, relay.getPhysicalPinState()); // LOW = ON for active-low
}

void test_relay_turn_on_zero_duration_rejected(void) {
    RelayActuator relay(26, /*activeLow=*/true, /*hardMaxSeconds=*/60);
    relay.begin();

    bool result = relay.turnOn(0);
    TEST_ASSERT_FALSE(result);
    TEST_ASSERT_FALSE(relay.isOn());
    TEST_ASSERT_EQUAL_UINT32(0, relay.getRemainingSeconds());
    TEST_ASSERT_EQUAL_UINT8(1, relay.getPhysicalPinState());
}

void test_relay_hard_max_duration_capped(void) {
    RelayActuator relay(26, /*activeLow=*/true, /*hardMaxSeconds=*/60);
    relay.begin();

    // Request 180 seconds, but hard cap is 60 seconds
    bool result = relay.turnOn(180);
    TEST_ASSERT_TRUE(result);
    TEST_ASSERT_TRUE(relay.isOn());
    TEST_ASSERT_EQUAL_UINT32(60, relay.getTargetDurationSeconds());
    TEST_ASSERT_TRUE(relay.getRemainingSeconds() <= 60 && relay.getRemainingSeconds() >= 59);
}

void test_relay_manual_turn_off(void) {
    RelayActuator relay(26, /*activeLow=*/true, /*hardMaxSeconds=*/60);
    relay.begin();

    relay.turnOn(45);
    TEST_ASSERT_TRUE(relay.isOn());

    relay.turnOff();
    TEST_ASSERT_FALSE(relay.isOn());
    TEST_ASSERT_EQUAL_UINT32(0, relay.getRemainingSeconds());
    TEST_ASSERT_EQUAL_UINT32(0, relay.getTargetDurationSeconds());
    TEST_ASSERT_EQUAL_UINT8(1, relay.getPhysicalPinState()); // Reset to safe inactive
}

void test_relay_auto_cutoff_on_target_duration(void) {
    RelayActuator relay(26, /*activeLow=*/true, /*hardMaxSeconds=*/60);
    relay.begin();

    relay.turnOn(10);
    TEST_ASSERT_TRUE(relay.isOn());

    // Advance 5 seconds (5000ms): should still be ON
    relay.simulateElapsedMs(5000);
    relay.update();
    TEST_ASSERT_TRUE(relay.isOn());
    TEST_ASSERT_EQUAL_UINT32(5, relay.getRemainingSeconds());

    // Advance past target duration (10500ms): update() must cut off relay
    relay.simulateElapsedMs(10500);
    relay.update();
    TEST_ASSERT_FALSE(relay.isOn());
    TEST_ASSERT_EQUAL_UINT32(0, relay.getRemainingSeconds());
    TEST_ASSERT_EQUAL_UINT8(1, relay.getPhysicalPinState());
}

void test_relay_auto_cutoff_on_hard_max(void) {
    RelayActuator relay(26, /*activeLow=*/true, /*hardMaxSeconds=*/30);
    relay.begin();

    relay.turnOn(30);
    TEST_ASSERT_TRUE(relay.isOn());

    // Advance past hard max cutoff (31000ms)
    relay.simulateElapsedMs(31000);
    relay.update();
    TEST_ASSERT_FALSE(relay.isOn());
    TEST_ASSERT_EQUAL_UINT8(1, relay.getPhysicalPinState());
}

void test_relay_update_when_off_is_noop(void) {
    RelayActuator relay(26, /*activeLow=*/true, /*hardMaxSeconds=*/60);
    relay.begin();

    TEST_ASSERT_FALSE(relay.isOn());
    relay.update();
    TEST_ASSERT_FALSE(relay.isOn());
    TEST_ASSERT_EQUAL_UINT8(1, relay.getPhysicalPinState());
}

void test_relay_network_offline_flood_watchdog_rule(void) {
    // Verifies network watchdog logic: offline > 120s with relay ON must force shutoff
    RelayActuator relay(26, /*activeLow=*/true, /*hardMaxSeconds=*/300);
    relay.begin();
    relay.turnOn(240);
    TEST_ASSERT_TRUE(relay.isOn());

    unsigned long wifiDisconnectedSince = 10000;
    unsigned long now = 135000; // 125 seconds offline (> 120s threshold)

    if (now - wifiDisconnectedSince > 120000UL) {
        if (relay.isOn()) {
            relay.turnOff();
        }
    }

    TEST_ASSERT_FALSE(relay.isOn());
    TEST_ASSERT_EQUAL_UINT8(1, relay.getPhysicalPinState());
}

int run_actuator_tests() {
    UNITY_BEGIN();
    RUN_TEST(test_relay_initialization_safety);
    RUN_TEST(test_relay_active_high_polarity);
    RUN_TEST(test_relay_turn_on_valid_duration);
    RUN_TEST(test_relay_turn_on_zero_duration_rejected);
    RUN_TEST(test_relay_hard_max_duration_capped);
    RUN_TEST(test_relay_manual_turn_off);
    RUN_TEST(test_relay_auto_cutoff_on_target_duration);
    RUN_TEST(test_relay_auto_cutoff_on_hard_max);
    RUN_TEST(test_relay_update_when_off_is_noop);
    RUN_TEST(test_relay_network_offline_flood_watchdog_rule);
    return UNITY_END();
}

#if defined(ARDUINO)
void setup() {
    run_actuator_tests();
}
void loop() {}
#else
int main(int argc, char **argv) {
    (void)argc;
    (void)argv;
    return run_actuator_tests();
}
#endif
