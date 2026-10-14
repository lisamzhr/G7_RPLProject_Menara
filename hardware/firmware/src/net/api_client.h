#pragma once

#include <Arduino.h>
#include "../core/reading_buffer.h"

struct ActuatorCommand {
    char command_id[40];
    char actuator_id[40];
    char command[20];
    uint32_t duration_seconds;
};

class ApiClient {
public:
    ApiClient(const char* baseUrl, const char* nodeId, const char* apiKey);
    bool postReading(const SensorReading& reading);
    bool pollPendingCommands(ActuatorCommand& outCommand, bool& hasCommand);
    bool ackCommand(const char* commandId, const char* status, const char* result);

private:
    const char* _baseUrl;
    const char* _nodeId;
    const char* _apiKey;
};
