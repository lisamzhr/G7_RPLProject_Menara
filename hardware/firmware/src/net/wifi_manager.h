#pragma once

#include <Arduino.h>
#include <WiFi.h>

class WiFiManager {
public:
    WiFiManager(const char* ssid, const char* password);
    bool connect(unsigned long timeoutMs = 15000);
    bool isConnected();
    void checkAndReconnect();
    int getRSSI();

private:
    const char* _ssid;
    const char* _password;
    unsigned long _lastReconnectAttempt;
};
