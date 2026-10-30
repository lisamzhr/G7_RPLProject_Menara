#pragma once

#include <cstdint>
#include <cstring>

struct DeviceConfig {
    char wifi_ssid[64];
    char wifi_pass[64];
    char api_base_url[128];
    char node_id[64];
    char node_api_key[128];
};

class ConfigStorage {
public:
    ConfigStorage();

    /**
     * @brief Load configuration from non-volatile flash (NVS).
     * If NVS is empty, populates from compile-time fallback secrets.
     * @return true if credentials (SSID) are configured.
     */
    bool load(DeviceConfig& outConfig);

    /**
     * @brief Persist configuration into non-volatile flash (NVS).
     * @return true on success.
     */
    bool save(const DeviceConfig& config);

    /**
     * @brief Wipe saved credentials from non-volatile flash (Factory reset).
     */
    void clear();

    /**
     * @brief Check whether configuration contains minimally valid connection info.
     */
    static bool isValid(const DeviceConfig& config);
};
