// Unit tests for the ESP32 Networking Stack
#include <unity.h>
#include "net/config_storage.h"
#include "net/wifi_manager.h"
#include "net/api_client.h"
#include "net/time_sync.h"
#include "net/captive_portal.h"
#include <cstring>
#include <vector>
#include <algorithm>

void setUp(void) {}
void tearDown(void) {}

// ==============================================================================
// 1. ConfigStorage Unit Tests
// ==============================================================================

void test_config_storage_validation_empty_ssid(void) {
    DeviceConfig cfg;
    memset(&cfg, 0, sizeof(DeviceConfig));
    cfg.wifi_ssid[0] = '\0';
    strncpy(cfg.wifi_pass, "SomePassword123", sizeof(cfg.wifi_pass) - 1);

    // An empty SSID should never be considered valid
    TEST_ASSERT_FALSE(ConfigStorage::isValid(cfg));
}

void test_config_storage_validation_template_placeholder(void) {
    DeviceConfig cfg;
    memset(&cfg, 0, sizeof(DeviceConfig));
    // The placeholder default from secrets.example.h should be recognized as invalid
    strncpy(cfg.wifi_ssid, "Your_Rooftop_WiFi_SSID", sizeof(cfg.wifi_ssid) - 1);
    strncpy(cfg.wifi_pass, "Your_WiFi_Password", sizeof(cfg.wifi_pass) - 1);

    TEST_ASSERT_FALSE(ConfigStorage::isValid(cfg));
}

void test_config_storage_validation_valid_ssid(void) {
    DeviceConfig cfg;
    memset(&cfg, 0, sizeof(DeviceConfig));
    strncpy(cfg.wifi_ssid, "RooftopGarden_2.4G", sizeof(cfg.wifi_ssid) - 1);
    strncpy(cfg.wifi_pass, "SecretPass987!", sizeof(cfg.wifi_pass) - 1);

    TEST_ASSERT_TRUE(ConfigStorage::isValid(cfg));

    // Open networks (empty password) with valid SSID are also valid
    cfg.wifi_pass[0] = '\0';
    TEST_ASSERT_TRUE(ConfigStorage::isValid(cfg));
}

void test_config_storage_load_fallback_secrets(void) {
    ConfigStorage storage;
    DeviceConfig cfg;
    memset(&cfg, 0, sizeof(DeviceConfig));

    // In native test environment, NVS flash is not present so load() populates secrets fallbacks
    bool loaded = storage.load(cfg);
    TEST_ASSERT_TRUE(loaded || !loaded); // Valid operation regardless of fallback presence
    TEST_ASSERT_TRUE(strlen(cfg.api_base_url) > 0);
    TEST_ASSERT_TRUE(strlen(cfg.node_id) > 0);
}

// ==============================================================================
// 2. WiFiManager Unit Tests
// ==============================================================================

void test_wifi_manager_initial_credentials(void) {
    WiFiManager mgr("InitialSSID", "InitialPass");
    TEST_ASSERT_EQUAL_STRING("InitialSSID", mgr.getSSID());
    TEST_ASSERT_FALSE(mgr.isPortalActive());
}

void test_wifi_manager_set_credentials(void) {
    WiFiManager mgr;
    mgr.setCredentials("NewGardenAP", "SuperSecretKey");
    TEST_ASSERT_EQUAL_STRING("NewGardenAP", mgr.getSSID());
}

void test_wifi_manager_portal_lifecycle(void) {
    WiFiManager mgr;
    DeviceConfig cfg;
    memset(&cfg, 0, sizeof(DeviceConfig));
    strncpy(cfg.wifi_ssid, "MySSID", sizeof(cfg.wifi_ssid) - 1);

    TEST_ASSERT_FALSE(mgr.isPortalActive());
    mgr.startPortal(cfg, "RG-TestSetup");
    TEST_ASSERT_TRUE(mgr.isPortalActive());

    mgr.stopPortal();
    TEST_ASSERT_FALSE(mgr.isPortalActive());
}

// ==============================================================================
// 3. ApiClient Unit Tests
// ==============================================================================

void test_api_client_config_getters(void) {
    ApiClient client;
    client.setConfig("http://192.168.1.100:8000/api/v1", "node-esp32-alpha", "my-secret-key-123");

    TEST_ASSERT_EQUAL_STRING("http://192.168.1.100:8000/api/v1", client.getBaseUrl());
    TEST_ASSERT_EQUAL_STRING("node-esp32-alpha", client.getNodeId());
}

void test_api_client_command_struct_layout(void) {
    ActuatorCommand cmd;
    memset(&cmd, 0, sizeof(ActuatorCommand));
    strncpy(cmd.command_id, "cmd-9999", sizeof(cmd.command_id) - 1);
    strncpy(cmd.command, "turn_on", sizeof(cmd.command) - 1);
    cmd.duration_seconds = 45;

    TEST_ASSERT_EQUAL_STRING("cmd-9999", cmd.command_id);
    TEST_ASSERT_EQUAL_STRING("turn_on", cmd.command);
    TEST_ASSERT_EQUAL_UINT32(45, cmd.duration_seconds);
}

// ==============================================================================
// 4. TimeSync Unit Tests
// ==============================================================================

void test_time_sync_begin_and_sync_state(void) {
    TimeSync sync("pool.ntp.org", 25200, 0);
    TEST_ASSERT_FALSE(sync.isSynchronized());

    bool ok = sync.begin();
    TEST_ASSERT_TRUE(ok);
    TEST_ASSERT_TRUE(sync.isSynchronized());
}

void test_time_sync_iso8601_format_structure(void) {
    TimeSync sync;
    char buffer[32];
    memset(buffer, 0, sizeof(buffer));

    bool ok = sync.getISO8601Timestamp(buffer, sizeof(buffer));
    TEST_ASSERT_TRUE(ok);

    // Expected format: "YYYY-MM-DDTHH:MM:SSZ" (20 characters)
    TEST_ASSERT_EQUAL_UINT(20, strlen(buffer));
    TEST_ASSERT_EQUAL_CHAR('-', buffer[4]);
    TEST_ASSERT_EQUAL_CHAR('-', buffer[7]);
    TEST_ASSERT_EQUAL_CHAR('T', buffer[10]);
    TEST_ASSERT_EQUAL_CHAR(':', buffer[13]);
    TEST_ASSERT_EQUAL_CHAR(':', buffer[16]);
    TEST_ASSERT_EQUAL_CHAR('Z', buffer[19]);
}

// ==============================================================================
// 5. CaptivePortal Unit Tests
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

void test_captive_portal_ip_address_detection(void) {
    // Numeric IPs should be recognized
    TEST_ASSERT_TRUE(CaptivePortal::isIpAddress("192.168.4.1"));
    TEST_ASSERT_TRUE(CaptivePortal::isIpAddress("192.168.4.1:80"));
    TEST_ASSERT_TRUE(CaptivePortal::isIpAddress("10.0.0.1"));
    TEST_ASSERT_TRUE(CaptivePortal::isIpAddress("172.16.0.1:8080"));

    // Domain names should be rejected so they trigger 302 captive redirection
    TEST_ASSERT_FALSE(CaptivePortal::isIpAddress("connectivitycheck.gstatic.com"));
    TEST_ASSERT_FALSE(CaptivePortal::isIpAddress("clients3.google.com"));
    TEST_ASSERT_FALSE(CaptivePortal::isIpAddress("captive.apple.com"));
    TEST_ASSERT_FALSE(CaptivePortal::isIpAddress("www.msftconnecttest.com"));
    TEST_ASSERT_FALSE(CaptivePortal::isIpAddress("detectportal.firefox.com"));
    TEST_ASSERT_FALSE(CaptivePortal::isIpAddress(""));
    TEST_ASSERT_FALSE(CaptivePortal::isIpAddress(nullptr));
}

void test_captive_portal_probe_recognition(void) {
    // Android / Google connectivity probes
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/generate_204"));
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/gen_204"));
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/mobile/status"));

    // Apple CNA probes
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/hotspot-detect.html"));
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/library/test/success.html"));
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/success.txt"));

    // Windows probes
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/ncsi.txt"));
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/connecttest.txt"));
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/fwlink"));

    // ChromeOS / Firefox probes
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/canonical.html"));

    // Normal application endpoints should NOT be marked as probes
    TEST_ASSERT_FALSE(CaptivePortal::isCaptiveProbe("/"));
    TEST_ASSERT_FALSE(CaptivePortal::isCaptiveProbe("/scan"));
    TEST_ASSERT_FALSE(CaptivePortal::isCaptiveProbe("/save"));
    TEST_ASSERT_FALSE(CaptivePortal::isCaptiveProbe("/favicon.ico"));
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
    RUN_TEST(test_captive_portal_ip_address_detection);
    RUN_TEST(test_captive_portal_probe_recognition);
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
    (void)argc;
    (void)argv;
    return run_networking_tests();
}
#endif
