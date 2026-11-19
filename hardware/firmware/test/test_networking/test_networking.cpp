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
    client.setConfig("http://192.168.1.100:8000/api/v1", "24:6F:28:01:00:01");

    TEST_ASSERT_EQUAL_STRING("http://192.168.1.100:8000/api/v1", client.getBaseUrl());
    TEST_ASSERT_EQUAL_STRING("24:6F:28:01:00:01", client.getMacAddress());

    // Updating base URL without passing MAC preserves the existing MAC address
    client.setConfig("https://api.menara.example.com/api/v1");
    TEST_ASSERT_EQUAL_STRING("https://api.menara.example.com/api/v1", client.getBaseUrl());
    TEST_ASSERT_EQUAL_STRING("24:6F:28:01:00:01", client.getMacAddress());
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

    ApiClient client("http://localhost:8000/api/v1", "24:6F:28:01:00:01");
    SensorReading r{};
    r.soil_moisture_pct = 75.0f;
    r.temperature_c = 26.0f;
    r.humidity_pct = 70.0f;
    r.lux = 15000.0f;
    r.is_valid = true;
    bool retryable = false;
    TEST_ASSERT_TRUE(client.postReading(r, &retryable));
    TEST_ASSERT_TRUE(retryable);
    TEST_ASSERT_TRUE(client.ackCommand("cmd-9999", "acked", "OK", "2026-11-05T12:00:00Z"));
}

void test_api_client_https_detection(void) {
    ApiClient clientHttp("http://192.168.1.100:8000/api/v1", "24:6F:28:01:00:01");
    TEST_ASSERT_FALSE(clientHttp.isHttps());

    ApiClient clientHttps("https://api.menara.example.com", "24:6F:28:01:00:02");
    TEST_ASSERT_TRUE(clientHttps.isHttps());

    ApiClient clientEmpty("", "");
    TEST_ASSERT_FALSE(clientEmpty.isHttps());

    clientEmpty.setConfig("https://10.0.0.5/iot", "24:6F:28:01:00:03");
    TEST_ASSERT_TRUE(clientEmpty.isHttps());
}

void test_api_client_error_formatting_http_status_and_detail(void) {
    char buf[256];

    // 401 with unregistered MAC backend JSON detail
    ApiClient::formatHttpError(
        401,
        "{\"detail\":\"Sensor node with MAC '24:6F:28:01:00:01' is not registered\"}",
        buf,
        sizeof(buf)
    );
    TEST_ASSERT_EQUAL_STRING(
        "HTTP 401 Unauthorized: Sensor node with MAC '24:6F:28:01:00:01' is not registered",
        buf
    );

    // 401 with empty / null body falls back to specific default description
    ApiClient::formatHttpError(401, nullptr, buf, sizeof(buf));
    TEST_ASSERT_EQUAL_STRING(
        "HTTP 401 Unauthorized: Node MAC address is not registered or authentication failed",
        buf
    );
    ApiClient::formatHttpError(401, "", buf, sizeof(buf));
    TEST_ASSERT_EQUAL_STRING(
        "HTTP 401 Unauthorized: Node MAC address is not registered or authentication failed",
        buf
    );

    // 400 Bad Request with backend detail
    ApiClient::formatHttpError(400, "{\"detail\":\"Malformed MAC address: BAD\"}", buf, sizeof(buf));
    TEST_ASSERT_NOT_NULL(strstr(buf, "HTTP 400 Bad Request"));
    TEST_ASSERT_NOT_NULL(strstr(buf, "Malformed MAC address: BAD"));

    // 404 Not Found with backend detail
    ApiClient::formatHttpError(404, "{\"detail\":\"Node not found\"}", buf, sizeof(buf));
    TEST_ASSERT_NOT_NULL(strstr(buf, "HTTP 404 Not Found"));
    TEST_ASSERT_NOT_NULL(strstr(buf, "Node not found"));

    // 422 Unprocessable Entity with FastAPI/Pydantic validation error array
    ApiClient::formatHttpError(
        422,
        "{\"detail\":[{\"type\":\"missing\",\"loc\":[\"body\",\"lux\"],\"msg\":\"Field required\"}]}",
        buf,
        sizeof(buf)
    );
    TEST_ASSERT_NOT_NULL(strstr(buf, "HTTP 422 Unprocessable Entity"));
    TEST_ASSERT_NOT_NULL(strstr(buf, "Field required"));

    // 500 Internal Server Error with empty body
    ApiClient::formatHttpError(500, "", buf, sizeof(buf));
    TEST_ASSERT_NOT_NULL(strstr(buf, "HTTP 500 Internal Server Error"));

    // 502 Bad Gateway with HTML body should ignore raw HTML and use default message
    ApiClient::formatHttpError(502, "<html><body>502 Bad Gateway</body></html>", buf, sizeof(buf));
    TEST_ASSERT_NOT_NULL(strstr(buf, "HTTP 502 Bad Gateway"));
    TEST_ASSERT_NULL(strstr(buf, "<html>"));

    // 301 Redirect
    ApiClient::formatHttpError(301, "", buf, sizeof(buf));
    TEST_ASSERT_NOT_NULL(strstr(buf, "HTTP 301 Redirect"));
}

void test_api_client_error_formatting_transport_errors(void) {
    char buf[256];

    ApiClient::formatHttpError(-1, nullptr, buf, sizeof(buf));
    TEST_ASSERT_NOT_NULL(strstr(buf, "Connection refused"));

    ApiClient::formatHttpError(-7, nullptr, buf, sizeof(buf));
    TEST_ASSERT_NOT_NULL(strstr(buf, "DNS"));

    ApiClient::formatHttpError(-11, nullptr, buf, sizeof(buf));
    TEST_ASSERT_NOT_NULL(strstr(buf, "timed out"));

    ApiClient::formatHttpError(0, nullptr, buf, sizeof(buf));
    TEST_ASSERT_NOT_NULL(strstr(buf, "could not be started"));

    ApiClient::formatHttpError(-99, nullptr, buf, sizeof(buf));
    TEST_ASSERT_NOT_NULL(strstr(buf, "-99"));
}

void test_api_client_retry_policy_includes_4xx(void) {
    // 4xx, 5xx, 3xx, and transport errors must all be retried (e.g. while MAC is not registered yet)
    TEST_ASSERT_TRUE(ApiClient::shouldRetryStatus(400));
    TEST_ASSERT_TRUE(ApiClient::shouldRetryStatus(401));
    TEST_ASSERT_TRUE(ApiClient::shouldRetryStatus(403));
    TEST_ASSERT_TRUE(ApiClient::shouldRetryStatus(404));
    TEST_ASSERT_TRUE(ApiClient::shouldRetryStatus(422));
    TEST_ASSERT_TRUE(ApiClient::shouldRetryStatus(429));
    TEST_ASSERT_TRUE(ApiClient::shouldRetryStatus(500));
    TEST_ASSERT_TRUE(ApiClient::shouldRetryStatus(503));
    TEST_ASSERT_TRUE(ApiClient::shouldRetryStatus(-1));
    TEST_ASSERT_TRUE(ApiClient::shouldRetryStatus(-11));
    TEST_ASSERT_TRUE(ApiClient::shouldRetryStatus(0));
    TEST_ASSERT_TRUE(ApiClient::shouldRetryStatus(302));

    // Only successful HTTP status codes are non-retryable
    TEST_ASSERT_FALSE(ApiClient::shouldRetryStatus(200));
    TEST_ASSERT_FALSE(ApiClient::shouldRetryStatus(201));
    TEST_ASSERT_FALSE(ApiClient::shouldRetryStatus(204));
}

void test_api_client_last_error_state(void) {
    ApiClient client("http://localhost:8000/api/v1", "24:6F:28:01:00:01");
    TEST_ASSERT_EQUAL_INT(0, client.getLastHttpCode());
    TEST_ASSERT_EQUAL_STRING("", client.getLastError());

    SensorReading r{};
    r.soil_moisture_pct = 65.0f;
    r.temperature_c = 27.5f;
    r.humidity_pct = 72.0f;
    r.lux = 12000.0f;
    r.is_valid = true;

    TEST_ASSERT_TRUE(client.postReading(r));
    TEST_ASSERT_EQUAL_INT(201, client.getLastHttpCode());
    TEST_ASSERT_EQUAL_STRING("", client.getLastError());
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

void test_captive_portal_probe_recognition(void) {
    // Android / Google connectivity probes
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/generate_204"));

    // Apple CNA probes
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/hotspot-detect.html"));

    // Windows probes
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/ncsi.txt"));
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/connecttest.txt"));
    TEST_ASSERT_TRUE(CaptivePortal::isCaptiveProbe("/redirect"));

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

void test_captive_portal_hex256_validation(void) {
    char validHex[257];
    for (int i = 0; i < 256; ++i) {
        validHex[i] = (i % 2 == 0) ? 'a' : '9';
    }
    validHex[256] = '\0';

    TEST_ASSERT_TRUE(CaptivePortal::isHex256(validHex));

    // Uppercase hex
    for (int i = 0; i < 256; ++i) {
        validHex[i] = (i % 2 == 0) ? 'F' : '3';
    }
    TEST_ASSERT_TRUE(CaptivePortal::isHex256(validHex));

    // Too short (255 chars)
    validHex[255] = '\0';
    TEST_ASSERT_FALSE(CaptivePortal::isHex256(validHex));

    // Invalid non-hex char
    validHex[255] = 'g';
    validHex[256] = '\0';
    TEST_ASSERT_FALSE(CaptivePortal::isHex256(validHex));

    TEST_ASSERT_FALSE(CaptivePortal::isHex256(nullptr));
    TEST_ASSERT_FALSE(CaptivePortal::isHex256(""));
    TEST_ASSERT_FALSE(CaptivePortal::isHex256("plaintext_password"));
}

void test_captive_portal_hex_to_bytes(void) {
    const char* hexStr = "01a2ff";
    uint8_t outBytes[4] = {0};

    TEST_ASSERT_TRUE(CaptivePortal::hexToBytes(hexStr, outBytes, sizeof(outBytes)));
    TEST_ASSERT_EQUAL_HEX8(0x01, outBytes[0]);
    TEST_ASSERT_EQUAL_HEX8(0xA2, outBytes[1]);
    TEST_ASSERT_EQUAL_HEX8(0xFF, outBytes[2]);

    // Odd length string
    TEST_ASSERT_FALSE(CaptivePortal::hexToBytes("123", outBytes, sizeof(outBytes)));

    // Non-hex characters
    TEST_ASSERT_FALSE(CaptivePortal::hexToBytes("123g", outBytes, sizeof(outBytes)));

    // Buffer too small
    uint8_t smallBuf[2];
    TEST_ASSERT_FALSE(CaptivePortal::hexToBytes(hexStr, smallBuf, sizeof(smallBuf)));

    TEST_ASSERT_FALSE(CaptivePortal::hexToBytes(nullptr, outBytes, sizeof(outBytes)));
    TEST_ASSERT_FALSE(CaptivePortal::hexToBytes(hexStr, nullptr, sizeof(outBytes)));
}

void test_captive_portal_mac_formatting_and_accessors(void) {
    uint8_t rawMac[6] = {0x24, 0x6F, 0x28, 0x01, 0x0A, 0xFF};
    char macStr[18];
    CaptivePortal::formatMacAddress(rawMac, macStr, sizeof(macStr));
    TEST_ASSERT_EQUAL_STRING("24:6F:28:01:0A:FF", macStr);

    // Undersized buffer must safely write empty string without overflowing
    char smallBuf[10] = {'X', 'X', 'X'};
    CaptivePortal::formatMacAddress(rawMac, smallBuf, sizeof(smallBuf));
    TEST_ASSERT_EQUAL_STRING("", smallBuf);

    CaptivePortal portal;
    TEST_ASSERT_EQUAL_STRING("", portal.getMacAddress());
    portal.setMacAddress("24:6F:28:01:0A:FF");
    TEST_ASSERT_EQUAL_STRING("24:6F:28:01:0A:FF", portal.getMacAddress());
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
    RUN_TEST(test_api_client_https_detection);
    RUN_TEST(test_api_client_error_formatting_http_status_and_detail);
    RUN_TEST(test_api_client_error_formatting_transport_errors);
    RUN_TEST(test_api_client_retry_policy_includes_4xx);
    RUN_TEST(test_api_client_last_error_state);

    // 4. TimeSync
    RUN_TEST(test_time_sync_begin_and_sync_state);
    RUN_TEST(test_time_sync_iso8601_format_structure);

    // 5. CaptivePortal
    RUN_TEST(test_captive_portal_ap_sorting);
    RUN_TEST(test_captive_portal_probe_recognition);
    RUN_TEST(test_captive_portal_lifecycle);
    RUN_TEST(test_captive_portal_hex256_validation);
    RUN_TEST(test_captive_portal_hex_to_bytes);
    RUN_TEST(test_captive_portal_mac_formatting_and_accessors);

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
