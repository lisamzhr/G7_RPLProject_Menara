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
    ApiClient(const char* baseUrl = "", const char* nodeId = "", const char* apiKey = "");
    void setConfig(const char* baseUrl, const char* nodeId, const char* apiKey);
    bool postReading(const SensorReading& reading);
    bool pollPendingCommands(ActuatorCommand& outCommand, bool& hasCommand);
    bool ackCommand(const char* commandId, const char* status, const char* result);

    const char* getBaseUrl() const;
    const char* getNodeId() const;

private:
    char _baseUrl[128];
    char _nodeId[64];
    char _apiKey[128];
};
