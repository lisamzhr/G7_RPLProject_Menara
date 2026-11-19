#pragma once

#if defined(ARDUINO)
#include <Arduino.h>
#else
#include <cstdint>
#include <cstddef>
#endif

#include "../core/reading_buffer.h"

struct ActuatorCommand {
    char command_id[40];
    char actuator_id[40];
    char command[20];
    uint32_t duration_seconds;
};

class ApiClient {
public:
    ApiClient(const char* baseUrl = "", const char* macAddress = "");
    void setConfig(const char* baseUrl, const char* macAddress = nullptr);
    void setMacAddress(const char* macAddress);
    bool postReading(const SensorReading& reading, bool* isRetryable = nullptr);
    bool pollPendingCommands(ActuatorCommand& outCommand, bool& hasCommand);
    bool ackCommand(const char* commandId, const char* status, const char* result, const char* executedAt = nullptr);

    const char* getBaseUrl() const;
    const char* getMacAddress() const;
    bool isHttps() const;

    int getLastHttpCode() const;
    const char* getLastError() const;

    static bool shouldRetryStatus(int httpCode);
    static bool extractErrorDetail(const char* responseBody, char* outBuf, size_t outBufSize);
    static void formatHttpError(int httpCode, const char* responseBody, char* outBuf, size_t outBufSize);

private:
    char _baseUrl[128];
    char _macAddress[24];
    int _lastHttpCode;
    char _lastError[256];

    void setLastError(int httpCode, const char* message);
    void clearLastError(int httpCode);
};
