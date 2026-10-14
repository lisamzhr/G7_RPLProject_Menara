#include "api_client.h"
#include <HTTPClient.h>
#include <ArduinoJson.h>

ApiClient::ApiClient(const char* baseUrl, const char* nodeId, const char* apiKey)
    : _baseUrl(baseUrl), _nodeId(nodeId), _apiKey(apiKey) {}

bool ApiClient::postReading(const SensorReading& reading) {
    HTTPClient http;
    String url = String(_baseUrl) + "/ingest/readings";
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Node-Key", _apiKey);
    http.setTimeout(8000);

    JsonDocument doc;
    doc["node_id"] = _nodeId;
    if (strlen(reading.timestamp) > 0) {
        doc["ts"] = reading.timestamp;
    }
    doc["soil_moisture_pct"] = reading.soil_moisture_pct;
    doc["temperature_c"] = reading.temperature_c;
    doc["humidity_pct"] = reading.humidity_pct;
    doc["lux"] = reading.lux;
    if (reading.battery_v > 0.0f) {
        doc["battery_v"] = reading.battery_v;
    }

    String payload;
    serializeJson(doc, payload);

    int httpCode = http.POST(payload);
    bool success = (httpCode == 200 || httpCode == 201);
    http.end();

    return success;
}

bool ApiClient::pollPendingCommands(ActuatorCommand& outCommand, bool& hasCommand) {
    hasCommand = false;
    HTTPClient http;
    String url = String(_baseUrl) + "/nodes/" + _nodeId + "/commands";

    http.begin(url);
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
}

bool ApiClient::ackCommand(const char* commandId, const char* status, const char* result) {
    HTTPClient http;
    String url = String(_baseUrl) + "/nodes/" + _nodeId + "/commands/" + commandId + "/ack";

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Node-Key", _apiKey);
    http.setTimeout(8000);

    JsonDocument doc;
    doc["status"] = status;
    doc["result"] = result;

    String payload;
    serializeJson(doc, payload);

    int httpCode = http.POST(payload);
    bool success = (httpCode == 200);
    http.end();

    return success;
}
