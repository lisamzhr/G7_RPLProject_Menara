#pragma once

#if defined(ARDUINO)
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <vector>
#endif

#include "config_storage.h"

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

    // Helper functions for captive portal detection & redirection (unit testable)
    static bool isIpAddress(const char* host);
    static bool isCaptiveProbe(const char* path);

private:
#if defined(ARDUINO)
    WebServer* _server;
    DNSServer* _dnsServer;
    std::vector<ScannedAp> _scannedAps;
    unsigned long _lastScanMillis;
    void performScan();
    bool captivePortal();
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
    void handleNotFound();
    String buildHtml();
#endif
};
