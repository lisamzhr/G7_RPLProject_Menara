#include "config_storage.h"

#if defined(ARDUINO)
#include <Arduino.h>
#include <Preferences.h>
#endif

#if __has_include("../../include/secrets.h")
    #include "../../include/secrets.h"
#elif __has_include("../include/secrets.h")
    #include "../include/secrets.h"
#else
    #include "../../include/secrets.example.h"
#endif

static const char* NVS_NAMESPACE = "roofgarden";

ConfigStorage::ConfigStorage() {}

bool ConfigStorage::isValid(const DeviceConfig& config) {
    return (strlen(config.wifi_ssid) > 0);
}

bool ConfigStorage::load(DeviceConfig& outConfig) {
    memset(&outConfig, 0, sizeof(DeviceConfig));

#if defined(ARDUINO)
    Preferences prefs;
    if (prefs.begin(NVS_NAMESPACE, true)) { // Read-only mode
        String ssid = prefs.getString("ssid", "");
        String pass = prefs.getString("pass", "");
        String url  = prefs.getString("api_url", "");
        String nid  = prefs.getString("node_id", "");
        String key  = prefs.getString("node_key", "");
        prefs.end();

        if (ssid.length() > 0) {
            strncpy(outConfig.wifi_ssid, ssid.c_str(), sizeof(outConfig.wifi_ssid) - 1);
            strncpy(outConfig.wifi_pass, pass.c_str(), sizeof(outConfig.wifi_pass) - 1);
            strncpy(outConfig.api_base_url, url.c_str(), sizeof(outConfig.api_base_url) - 1);
            strncpy(outConfig.node_id, nid.c_str(), sizeof(outConfig.node_id) - 1);
            strncpy(outConfig.node_api_key, key.c_str(), sizeof(outConfig.node_api_key) - 1);
            return true;
        }
    }
#endif

    // Fall back to compile-time configuration from secrets.h
#ifdef WIFI_SSID
    strncpy(outConfig.wifi_ssid, WIFI_SSID, sizeof(outConfig.wifi_ssid) - 1);
#endif
#ifdef WIFI_PASS
    strncpy(outConfig.wifi_pass, WIFI_PASS, sizeof(outConfig.wifi_pass) - 1);
#endif
#ifdef API_BASE_URL
    strncpy(outConfig.api_base_url, API_BASE_URL, sizeof(outConfig.api_base_url) - 1);
#endif
#ifdef NODE_ID
    strncpy(outConfig.node_id, NODE_ID, sizeof(outConfig.node_id) - 1);
#endif
#ifdef NODE_API_KEY
    strncpy(outConfig.node_api_key, NODE_API_KEY, sizeof(outConfig.node_api_key) - 1);
#endif

    return isValid(outConfig);
}

bool ConfigStorage::save(const DeviceConfig& config) {
#if defined(ARDUINO)
    Preferences prefs;
    if (!prefs.begin(NVS_NAMESPACE, false)) { // Read-write mode
        return false;
    }

    prefs.putString("ssid", config.wifi_ssid);
    prefs.putString("pass", config.wifi_pass);
    prefs.putString("api_url", config.api_base_url);
    prefs.putString("node_id", config.node_id);
    prefs.putString("node_key", config.node_api_key);
    prefs.end();
    return true;
#else
    return true;
#endif
}

void ConfigStorage::clear() {
#if defined(ARDUINO)
    Preferences prefs;
    if (prefs.begin(NVS_NAMESPACE, false)) {
        prefs.clear();
        prefs.end();
    }
#endif
}
