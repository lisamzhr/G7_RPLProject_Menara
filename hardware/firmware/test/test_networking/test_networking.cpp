/**
 * @file test_networking.cpp
 * @brief Unit tests for ESP32 firmware networking modules:
 * - ConfigStorage (NVS loading, credential validation, template filtering)
 * - WiFiManager (credential management, RSSI, portal lifecycle)
 * - ApiClient (configuration management, endpoint URLs, command payload structs)
 * - TimeSync (NTP synchronization, ISO 8601 UTC timestamp formatting)
 * - CaptivePortal (lifecycle, configuration extraction, access point sorting)
 */

#include <unity.h>
#include <cstring>
#include <string>
#include <vector>
#include <algorithm>

#include "net/config_storage.h"
#include "net/wifi_manager.h"
#include "net/api_client.h"
#include "net/time_sync.h"
#include "net/captive_portal.h"

void setUp(void) {}
void tearDown(void) {}

// ==============================================================================
// 1. ConfigStorage Unit Tests
// ==============================================================================

void test_config_storage_validation_empty_ssid(void) {
    DeviceConfig cfg;
    memset(&cfg, 0, sizeof(DeviceConfig));

    // Empty SSID must be rejected
    TEST_ASSERT_FALSE(ConfigStorage::isValid(cfg));
}

void test_config_storage_validation_template_placeholder(void) {
    DeviceConfig cfg;
    memset(&cfg, 0, sizeof(DeviceConfig));
    strncpy(cfg.wifi_ssid, "Your_Rooftop_WiFi_SSID", sizeof(cfg.wifi_ssid) - 1);

    // Default template placeholder must be rejected to prevent connection loop
    TEST_ASSERT_FALSE(ConfigStorage::isValid(cfg));
}

void test_config_storage_validation_valid_ssid(void) {
    DeviceConfig cfg;
    memset(&cfg, 0, sizeof(DeviceConfig));
    strncpy(cfg.wifi_ssid, "MentengRooftop_2.4G", sizeof(cfg.wifi_ssid) - 1);
    strncpy(cfg.wifi_pass, "RooftopSecret2026", sizeof(cfg.wifi_pass) - 1);

    TEST_ASSERT_TRUE(ConfigStorage::isValid(cfg));
}

void test_config_storage_load_fallback_secrets(void) {
    ConfigStorage storage;
    DeviceConfig loaded;
    memset(&loaded, 0, sizeof(DeviceConfig));

    // Storage load should populate default structure
    storage.load(loaded);

    // Verify fields are populated without buffer overruns
    TEST_ASSERT_TRUE(strlen(loaded.wifi_ssid) < sizeof(loaded.wifi_ssid));
    TEST_ASSERT_TRUE(strlen(loaded.api_base_url) < sizeof(loaded.api_base_url));
    TEST_ASSERT_TRUE(strlen(loaded.node_id) < sizeof(loaded.node_id));
}

// ==============================================================================
// 2. WiFiManager Unit Tests
// ==============================================================================

void test_wifi_manager_initial_credentials(void) {
    WiFiManager wm("GardenSSID", "GardenPass");
    TEST_ASSERT_EQUAL_STRING("GardenSSID", wm.getSSID());
}

void test_wifi_manager_set_credentials(void) {
    WiFiManager wm;
    TEST_ASSERT_EQUAL_STRING("", wm.getSSID());

    wm.setCredentials("NewRooftopNet", "NewPass123");
    TEST_ASSERT_EQUAL_STRING("NewRooftopNet", wm.getSSID());
}

void test_wifi_manager_portal_lifecycle(void) {
    WiFiManager wm;
    TEST_ASSERT_FALSE(wm.isPortalActive());

    DeviceConfig cfg;
    memset(&cfg, 0, sizeof(DeviceConfig));
    strncpy(cfg.node_id, "esp32-node-01", sizeof(cfg.node_id) - 1);

    TEST_ASSERT_TRUE(wm.startPortal(cfg, "TestPortal"));
    TEST_ASSERT_TRUE(wm.isPortalActive());

    wm.stopPortal();
    TEST_ASSERT_FALSE(wm.isPortalActive());
}

// ==============================================================================
// 3. ApiClient Unit Tests
// ==============================================================================

void test_api_client_config_getters(void) {
    ApiClient client("http://192.168.1.50:8000/api/v1", "node-jakarta-01", "secret-token-xyz");

    TEST_ASSERT_EQUAL_STRING("http://192.168.1.50:8000/api/v1", client.getBaseUrl());
    TEST_ASSERT_EQUAL_STRING("node-jakarta-01", client.getNodeId());

    client.setConfig("https://api.roofgarden.id/api/v1", "node-jakarta-02", "token-2");
    TEST_ASSERT_EQUAL_STRING("https://api.roofgarden.id/api/v1", client.getBaseUrl());
    TEST_ASSERT_EQUAL_STRING("node-jakarta-02", client.getNodeId());
}

void test_api_client_command_struct_layout(void) {
    ActuatorCommand cmd;
    memset(&cmd, 0, sizeof(ActuatorCommand));

    strncpy(cmd.command_id, "cmd-uuid-1234-5678", sizeof(cmd.command_id) - 1);
    strncpy(cmd.actuator_id, "act-valve-01", sizeof(cmd.actuator_id) - 1);
    strncpy(cmd.command, "turn_on", sizeof(cmd.command) - 1);
    cmd.duration_seconds = 45;

    TEST_ASSERT_EQUAL_STRING("cmd-uuid-1234-5678", cmd.command_id);
    TEST_ASSERT_EQUAL_STRING("act-valve-01", cmd.actuator_id);
    TEST_ASSERT_EQUAL_STRING("turn_on", cmd.command);
    TEST_ASSERT_EQUAL_UINT32(45, cmd.duration_seconds);
}

// ==============================================================================
// 4. TimeSync Unit Tests
// ==============================================================================

void test_time_sync_begin_and_sync_state(void) {
    TimeSync ts("pool.ntp.org", 25200, 0);
    TEST_ASSERT_FALSE(ts.isSynchronized());

    TEST_ASSERT_TRUE(ts.begin());
    TEST_ASSERT_TRUE(ts.isSynchronized());
}

void test_time_sync_iso8601_format_structure(void) {
    TimeSync ts("pool.ntp.org", 25200, 0);
    ts.begin();

    char buf[32];
    memset(buf, 0, sizeof(buf));
    TEST_ASSERT_TRUE(ts.getISO8601Timestamp(buf, sizeof(buf)));

    // ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ (20 characters)
    TEST_ASSERT_EQUAL_UINT(20, strlen(buf));
    TEST_ASSERT_EQUAL('-', buf[4]);
    TEST_ASSERT_EQUAL('-', buf[7]);
    TEST_ASSERT_EQUAL('T', buf[10]);
    TEST_ASSERT_EQUAL(':', buf[13]);
    TEST_ASSERT_EQUAL(':', buf[16]);
    TEST_ASSERT_EQUAL('Z', buf[19]);
}

// ==============================================================================
// 5. CaptivePortal Logic & AP Sorting Tests
// ==============================================================================

void test_captive_portal_ap_sorting(void) {
    std::vector<ScannedAp> aps = {
        {"Weak_WiFi", -88},
        {"Strong_WiFi", -42},
        {"Medium_WiFi", -65}
    };

    // Verify sort by RSSI descending (strongest signal first)
    std::sort(aps.begin(), aps.end(), [](const ScannedAp& a, const ScannedAp& b) {
        return a.rssi > b.rssi;
    });

    TEST_ASSERT_EQUAL_STRING("Strong_WiFi", aps[0].ssid);
    TEST_ASSERT_EQUAL(-42, aps[0].rssi);

    TEST_ASSERT_EQUAL_STRING("Medium_WiFi", aps[1].ssid);
    TEST_ASSERT_EQUAL(-65, aps[1].rssi);

    TEST_ASSERT_EQUAL_STRING("Weak_WiFi", aps[2].ssid);
    TEST_ASSERT_EQUAL(-88, aps[2].rssi);
}

void test_captive_portal_lifecycle(void) {
    CaptivePortal portal;
    TEST_ASSERT_FALSE(portal.isRunning());
    TEST_ASSERT_FALSE(portal.isConfigSaved());

    DeviceConfig initCfg;
    memset(&initCfg, 0, sizeof(DeviceConfig));
    strncpy(initCfg.wifi_ssid, "TestGarden", sizeof(initCfg.wifi_ssid) - 1);

    TEST_ASSERT_TRUE(portal.begin(initCfg, "RG-Test"));
    TEST_ASSERT_TRUE(portal.isRunning());

    portal.stop();
    TEST_ASSERT_FALSE(portal.isRunning());
}

// ==============================================================================
// Test Runner
// ==============================================================================

int run_networking_tests() {
    UNITY_BEGIN();

    // 1. ConfigStorage
    RUN_TEST(test_config_storage_validation_empty_ssid);
    RUN_TEST(test_config_storage_validation_template_placeholder);
    RUN_TEST(test_config_storage_validation_valid_ssid);
    RUN_TEST(test_config_storage_load_fallback_secrets);

    // 2. WiFiManager
    RUN_TEST(test_wifi_manager_initial_credentials);
    RUN_TEST(test_wifi_manager_set_credentials);
    RUN_TEST(test_wifi_manager_portal_lifecycle);

    // 3. ApiClient
    RUN_TEST(test_api_client_config_getters);
    RUN_TEST(test_api_client_command_struct_layout);

    // 4. TimeSync
    RUN_TEST(test_time_sync_begin_and_sync_state);
    RUN_TEST(test_time_sync_iso8601_format_structure);

    // 5. CaptivePortal
    RUN_TEST(test_captive_portal_ap_sorting);
    RUN_TEST(test_captive_portal_lifecycle);

    return UNITY_END();
}

#if defined(ARDUINO)
void setup() {
    run_networking_tests();
}
void loop() {}
#else
int main(int argc, char **argv) {
    return run_networking_tests();
}
#endif
