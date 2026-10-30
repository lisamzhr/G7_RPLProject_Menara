#include "wifi_manager.h"
#include <cstring>

WiFiManager::WiFiManager(const char* fallbackSsid, const char* fallbackPass)
    : _lastReconnectAttempt(0) {
    setCredentials(fallbackSsid, fallbackPass);
}

void WiFiManager::setCredentials(const char* ssid, const char* password) {
    memset(_ssid, 0, sizeof(_ssid));
    memset(_password, 0, sizeof(_password));
    if (ssid) strncpy(_ssid, ssid, sizeof(_ssid) - 1);
    if (password) strncpy(_password, password, sizeof(_password) - 1);
}

const char* WiFiManager::getSSID() const {
    return _ssid;
}

bool WiFiManager::connect(unsigned long timeoutMs) {
#if defined(ARDUINO)
    if (strlen(_ssid) == 0) {
        return false;
    }

    if (WiFi.status() == WL_CONNECTED) {
        return true;
    }

    WiFi.mode(WIFI_STA);
    WiFi.begin(_ssid, _password);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
        delay(500);
        Serial.print(".");
    }
    Serial.println();

    return WiFi.status() == WL_CONNECTED;
#else
    return true;
#endif
}

bool WiFiManager::isConnected() {
#if defined(ARDUINO)
    return (WiFi.status() == WL_CONNECTED);
#else
    return true;
#endif
}

void WiFiManager::checkAndReconnect() {
#if defined(ARDUINO)
    if (isConnected() || isPortalActive()) {
        return;
    }

    if (millis() - _lastReconnectAttempt > 10000) {
        _lastReconnectAttempt = millis();
        if (strlen(_ssid) > 0) {
            WiFi.disconnect();
            WiFi.reconnect();
        }
    }
#endif
}

int WiFiManager::getRSSI() {
#if defined(ARDUINO)
    return WiFi.RSSI();
#else
    return -55;
#endif
}

bool WiFiManager::startPortal(const DeviceConfig& currentConfig, const char* apPrefix) {
#if defined(ARDUINO)
    // Disconnect active station attempts so ESP-IDF doesn't emit NO_AP_FOUND (201) in portal mode
    WiFi.disconnect(false, false);
    delay(50);
#endif
    return _portal.begin(currentConfig, apPrefix);
}

void WiFiManager::updatePortal() {
    _portal.update();
}

void WiFiManager::stopPortal() {
    _portal.stop();
#if defined(ARDUINO)
    WiFi.mode(WIFI_STA);
#endif
}

bool WiFiManager::isPortalActive() const {
    return _portal.isRunning();
}

bool WiFiManager::isPortalConfigSaved() const {
    return _portal.isConfigSaved();
}

DeviceConfig WiFiManager::getSavedPortalConfig() const {
    return _portal.getSavedConfig();
}
