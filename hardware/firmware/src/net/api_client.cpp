#include "api_client.h"
#include <cstring>
#include <cmath>

#if defined(ARDUINO)
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

static bool beginHttpClient(HTTPClient& http, WiFiClient& plainClient, WiFiClientSecure& secureClient, bool isHttps, const String& url) {
    if (isHttps) {
        secureClient.setInsecure();
        return http.begin(secureClient, url);
    } else {
        return http.begin(plainClient, url);
    }
}
#endif

ApiClient::ApiClient(const char* baseUrl, const char* nodeId, const char* apiKey) {
    setConfig(baseUrl, nodeId, apiKey);
}

void ApiClient::setConfig(const char* baseUrl, const char* nodeId, const char* apiKey) {
    memset(_baseUrl, 0, sizeof(_baseUrl));
    memset(_nodeId, 0, sizeof(_nodeId));
    memset(_apiKey, 0, sizeof(_apiKey));

    if (baseUrl) strncpy(_baseUrl, baseUrl, sizeof(_baseUrl) - 1);
    if (nodeId)  strncpy(_nodeId, nodeId, sizeof(_nodeId) - 1);
    if (apiKey)  strncpy(_apiKey, apiKey, sizeof(_apiKey) - 1);
}

const char* ApiClient::getBaseUrl() const {
    return _baseUrl;
}

const char* ApiClient::getNodeId() const {
    return _nodeId;
}

bool ApiClient::isHttps() const {
    return (strncmp(_baseUrl, "https://", 8) == 0);
}

bool ApiClient::postReading(const SensorReading& reading, bool* isRetryable) {
    if (isRetryable) *isRetryable = true;
#if defined(ARDUINO)
    if (strlen(_baseUrl) == 0 || strlen(_apiKey) == 0) {
        if (isRetryable) *isRetryable = false;
        return false;
    }

    HTTPClient http;
    WiFiClient plainClient;
    WiFiClientSecure secureClient;
    String url = String(_baseUrl) + "/ingest/readings";
    
    if (!beginHttpClient(http, plainClient, secureClient, isHttps(), url)) {
        if (isRetryable) *isRetryable = false;
        return false;
    }
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Node-Key", _apiKey);
    http.setTimeout(8000);

    JsonDocument doc;
    doc["node_id"] = _nodeId;
    if (strlen(reading.timestamp) > 0 && strncmp(reading.timestamp, "1970-01-01", 10) != 0) {
        doc["ts"] = reading.timestamp;
    }

    float soil = isnan(reading.soil_moisture_pct) ? 0.0f : reading.soil_moisture_pct;
    float temp = isnan(reading.temperature_c) ? -999.0f : reading.temperature_c;
    float hum  = isnan(reading.humidity_pct) ? -999.0f : reading.humidity_pct;
    float lux  = isnan(reading.lux) ? 0.0f : reading.lux;

    doc["soil_moisture_pct"] = soil;
    doc["temperature_c"] = temp;
    doc["humidity_pct"] = hum;
    doc["lux"] = lux;
    if (reading.battery_v > 0.0f && !isnan(reading.battery_v)) {
        doc["battery_v"] = reading.battery_v;
    }
    doc["is_valid"] = reading.is_valid;

    String payload;
    serializeJson(doc, payload);

    int httpCode = http.POST(payload);
    bool success = (httpCode == 200 || httpCode == 201);

    if (isRetryable) {
        if (httpCode >= 400 && httpCode < 500) {
            *isRetryable = false;
        } else {
            *isRetryable = true;
        }
    }

    http.end();
    return success;
#else
    return true;
#endif
}

bool ApiClient::pollPendingCommands(ActuatorCommand& outCommand, bool& hasCommand) {
    hasCommand = false;
#if defined(ARDUINO)
    if (strlen(_baseUrl) == 0 || strlen(_apiKey) == 0) {
        return false;
    }

    HTTPClient http;
    WiFiClient plainClient;
    WiFiClientSecure secureClient;
    String url = String(_baseUrl) + "/nodes/" + _nodeId + "/commands";

    if (!beginHttpClient(http, plainClient, secureClient, isHttps(), url)) {
        return false;
    }
    http.addHeader("X-Node-Key", _apiKey);
    http.setTimeout(8000);

    int httpCode = http.GET();
    if (httpCode != 200) {
        http.end();
        return false;
    }

    String response = http.getString();
    http.end();

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, response);
    if (error || !doc.is<JsonArray>()) {
        return false;
    }

    JsonArray array = doc.as<JsonArray>();
    if (array.size() == 0) {
        return true; // No pending commands
    }

    JsonObject first = array[0];
    strlcpy(outCommand.command_id, first["command_id"] | "", sizeof(outCommand.command_id));
    strlcpy(outCommand.actuator_id, first["actuator_id"] | "", sizeof(outCommand.actuator_id));
    strlcpy(outCommand.command, first["command"] | "turn_on", sizeof(outCommand.command));
    outCommand.duration_seconds = first["duration_seconds"] | 30;
    hasCommand = true;

    return true;
#else
    return true;
#endif
}

bool ApiClient::ackCommand(const char* commandId, const char* status, const char* result, const char* executedAt) {
#if defined(ARDUINO)
    if (strlen(_baseUrl) == 0 || strlen(_apiKey) == 0) {
        return false;
    }

    HTTPClient http;
    WiFiClient plainClient;
    WiFiClientSecure secureClient;
    String url = String(_baseUrl) + "/nodes/" + _nodeId + "/commands/" + commandId + "/ack";

    if (!beginHttpClient(http, plainClient, secureClient, isHttps(), url)) {
        return false;
    }
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Node-Key", _apiKey);
    http.setTimeout(8000);

    JsonDocument doc;
    doc["status"] = status;
    if (result && strlen(result) > 0) {
        doc["result"] = result;
    }
    if (executedAt && strlen(executedAt) > 0) {
        doc["executed_at"] = executedAt;
    }

    String payload;
    serializeJson(doc, payload);

    int httpCode = http.POST(payload);
    bool success = (httpCode == 200);
    http.end();

    return success;
#else
    (void)commandId;
    (void)status;
    (void)result;
    (void)executedAt;
    return true;
#endif
}
