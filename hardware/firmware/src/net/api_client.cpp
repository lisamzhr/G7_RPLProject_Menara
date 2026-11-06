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

ApiClient::ApiClient(const char* baseUrl, const char* nodeId, const char* apiKey, const char* macAddress) {
    setConfig(baseUrl, nodeId, apiKey, macAddress);
}

void ApiClient::setConfig(const char* baseUrl, const char* nodeId, const char* apiKey, const char* macAddress) {
    memset(_baseUrl, 0, sizeof(_baseUrl));
    memset(_nodeId, 0, sizeof(_nodeId));
    memset(_apiKey, 0, sizeof(_apiKey));
    memset(_macAddress, 0, sizeof(_macAddress));

    if (baseUrl) strncpy(_baseUrl, baseUrl, sizeof(_baseUrl) - 1);
    if (nodeId)  strncpy(_nodeId, nodeId, sizeof(_nodeId) - 1);
    if (apiKey)  strncpy(_apiKey, apiKey, sizeof(_apiKey) - 1);
    if (macAddress) strncpy(_macAddress, macAddress, sizeof(_macAddress) - 1);
}

void ApiClient::setMacAddress(const char* macAddress) {
    memset(_macAddress, 0, sizeof(_macAddress));
    if (macAddress) strncpy(_macAddress, macAddress, sizeof(_macAddress) - 1);
}

const char* ApiClient::getBaseUrl() const {
    return _baseUrl;
}

const char* ApiClient::getNodeId() const {
    return _nodeId;
}

const char* ApiClient::getMacAddress() const {
    return _macAddress;
}

bool ApiClient::isHttps() const {
    return (strncmp(_baseUrl, "https://", 8) == 0);
}

bool ApiClient::postReading(const SensorReading& reading, bool* isRetryable) {
    if (isRetryable) *isRetryable = true;
#if defined(ARDUINO)
    if (strlen(_baseUrl) == 0 || (strlen(_apiKey) == 0 && strlen(_macAddress) == 0)) {
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
    if (strlen(_macAddress) > 0) {
        http.addHeader("X-Node-MAC", _macAddress);
    }
    if (strlen(_apiKey) > 0) {
        http.addHeader("X-Node-Key", _apiKey);
    }
    http.setTimeout(8000);

    JsonDocument doc;
    if (strlen(_nodeId) > 0) {
        doc["node_id"] = _nodeId;
    }
    if (strlen(_macAddress) > 0) {
        doc["mac_address"] = _macAddress;
    }
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
    if (strlen(_baseUrl) == 0 || (strlen(_apiKey) == 0 && strlen(_macAddress) == 0)) {
        return false;
    }

    const char* targetId = (strlen(_nodeId) > 0) ? _nodeId : _macAddress;
    HTTPClient http;
    WiFiClient plainClient;
    WiFiClientSecure secureClient;
    String url = String(_baseUrl) + "/nodes/" + targetId + "/commands";

    if (!beginHttpClient(http, plainClient, secureClient, isHttps(), url)) {
        return false;
    }
    http.addHeader("Accept", "application/json");
    if (strlen(_macAddress) > 0) {
        http.addHeader("X-Node-MAC", _macAddress);
    }
    if (strlen(_apiKey) > 0) {
        http.addHeader("X-Node-Key", _apiKey);
    }
    http.setTimeout(8000);

    int httpCode = http.GET();
    if (httpCode != 200) {
        http.end();
        return false;
    }

    String response = http.getString();
    http.end();

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, response);
    if (err || !doc.is<JsonArray>()) {
        return false;
    }

    JsonArray array = doc.as<JsonArray>();
    if (array.size() == 0) {
        return true;
    }

    JsonObject first = array[0];
    const char* cid = first["command_id"] | "";
    const char* aid = first["actuator_id"] | "";
    const char* cmd = first["command"] | "";
    uint32_t dur = first["duration_seconds"] | 0;

    if (strlen(cid) == 0) return true;

    strncpy(outCommand.command_id, cid, sizeof(outCommand.command_id) - 1);
    strncpy(outCommand.actuator_id, aid, sizeof(outCommand.actuator_id) - 1);
    strncpy(outCommand.command, cmd, sizeof(outCommand.command) - 1);
    outCommand.duration_seconds = dur;

    hasCommand = true;
    return true;
#else
    return true;
#endif
}

bool ApiClient::ackCommand(const char* commandId, const char* status, const char* result, const char* executedAt) {
#if defined(ARDUINO)
    if (strlen(_baseUrl) == 0 || (strlen(_apiKey) == 0 && strlen(_macAddress) == 0) || !commandId) {
        return false;
    }

    const char* targetId = (strlen(_nodeId) > 0) ? _nodeId : _macAddress;
    HTTPClient http;
    WiFiClient plainClient;
    WiFiClientSecure secureClient;
    String url = String(_baseUrl) + "/nodes/" + targetId + "/commands/" + commandId + "/ack";

    if (!beginHttpClient(http, plainClient, secureClient, isHttps(), url)) {
        return false;
    }
    http.addHeader("Content-Type", "application/json");
    if (strlen(_macAddress) > 0) {
        http.addHeader("X-Node-MAC", _macAddress);
    }
    if (strlen(_apiKey) > 0) {
        http.addHeader("X-Node-Key", _apiKey);
    }
    http.setTimeout(8000);

    JsonDocument doc;
    doc["status"] = status ? status : "acked";
    if (result && strlen(result) > 0) {
        doc["result"] = result;
    }
    if (executedAt && strlen(executedAt) > 0) {
        doc["executed_at"] = executedAt;
    }

    String payload;
    serializeJson(doc, payload);

    int httpCode = http.POST(payload);
    http.end();

    return (httpCode == 200);
#else
    return true;
#endif
}
