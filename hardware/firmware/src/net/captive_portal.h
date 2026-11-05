#pragma once

#if defined(ARDUINO)
#include <Arduino.h>
#include <WiFi.h>
#include <DNSServer.h>
#include <WebServer.h>
#include <vector>
#include "mbedtls/rsa.h"
#include "mbedtls/entropy.h"
#include "mbedtls/ctr_drbg.h"
#endif
#include <cstddef>
#include <cstdint>

#include "config_storage.h"
#include "config.h"

struct ScannedAp {
    char ssid[64];
    int rssi;
};

class CaptivePortal {
public:
    CaptivePortal();
    ~CaptivePortal();

    /**
     * @brief Start the SoftAP and captive portal web server.
     * @param initialConfig Pre-populated configuration to display.
     * @param apPrefix Custom prefix for SoftAP SSID.
     * @return true if portal successfully started.
     */
    bool begin(const DeviceConfig& initialConfig, const char* apPrefix = "RoofGarden-Setup");

    /**
     * @brief Must be called repeatedly in loop() to process DNS and HTTP requests.
     */
    void update();

    /**
     * @brief Stop the SoftAP, DNS server, and WebServer.
     */
    void stop();

    bool isRunning() const;
    bool isConfigSaved() const;
    DeviceConfig getSavedConfig() const;

    // Helper functions for captive portal detection & credential processing (unit testable)
    static bool isCaptiveProbe(const char* path);
    static bool isHex256(const char* str);
    static bool hexToBytes(const char* hexStr, uint8_t* outBytes, size_t maxLen);

private:
#if defined(ARDUINO)
    WebServer* _server;
    DNSServer _dnsServer;
    std::vector<ScannedAp> _scannedAps;
    unsigned long _lastScanMillis;
    unsigned long _lastDnsMillis;

    // Ephemeral RSA-1024 context for client-side encrypted credentials
    mbedtls_rsa_context _rsa;
    mbedtls_entropy_context _entropy;
    mbedtls_ctr_drbg_context _ctrDrbg;
    bool _cryptoInitialized;
    char _publicKeyHex[257]; // 128-byte modulus N in hex

    bool initCrypto();
    void freeCrypto();
    bool decryptField(const String& cipherHex, String& outPlaintext);

    void performScan();
    void handleRedirect();
#endif
    bool _running;
    bool _configSaved;
    DeviceConfig _config;
    DeviceConfig _savedConfig;
    char _apSsid[32];
    unsigned long _startedMillis;

#if defined(ARDUINO)
    void setupRoutes();
    void handleRoot();
    void handleSave();
    void handleScan();
    String buildHtml();
#endif
};
