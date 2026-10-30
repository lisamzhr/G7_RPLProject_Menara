#pragma once

#if defined(ARDUINO)
#include <Arduino.h>
#include <WiFi.h>
#endif

#include "config_storage.h"
#include "captive_portal.h"

class WiFiManager {
public:
    WiFiManager(const char* fallbackSsid = "", const char* fallbackPass = "");

    void setCredentials(const char* ssid, const char* password);
    bool connect(unsigned long timeoutMs = 15000);
    bool isConnected();
    void checkAndReconnect();
    int getRSSI();
    const char* getSSID() const;

    // Captive Portal methods
    bool startPortal(const DeviceConfig& currentConfig, const char* apPrefix = "RoofGarden-Setup");
    void updatePortal();
    void stopPortal();
    bool isPortalActive() const;
    bool isPortalConfigSaved() const;
    DeviceConfig getSavedPortalConfig() const;

private:
    char _ssid[64];
    char _password[64];
    unsigned long _lastReconnectAttempt;
    CaptivePortal _portal;
};
