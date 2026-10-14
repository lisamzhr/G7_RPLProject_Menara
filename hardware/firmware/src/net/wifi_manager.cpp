#include "wifi_manager.h"

WiFiManager::WiFiManager(const char* ssid, const char* password)
    : _ssid(ssid), _password(password), _lastReconnectAttempt(0) {}

bool WiFiManager::connect(unsigned long timeoutMs) {
    if (WiFi.status() == WL_CONNECTED) {
        return true;
    }

    WiFi.mode(WIFI_STA);
    WiFi.begin(_ssid, _password);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
        delay(500);
    }

    return WiFi.status() == WL_CONNECTED;
}

bool WiFiManager::isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

void WiFiManager::checkAndReconnect() {
    if (isConnected()) {
        return;
    }

    if (millis() - _lastReconnectAttempt > 10000) {
        _lastReconnectAttempt = millis();
        WiFi.disconnect();
        WiFi.reconnect();
    }
}

int WiFiManager::getRSSI() {
    return WiFi.RSSI();
}
