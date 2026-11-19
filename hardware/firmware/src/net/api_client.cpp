#include "api_client.h"
#include <cstring>
#include <cstdio>
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

static bool isWhitespace(char c) {
    return (c == ' ' || c == '\t' || c == '\r' || c == '\n');
}

static bool extractJsonStringField(const char* json, const char* key, char* out, size_t outSize) {
    if (!json || !key || !out || outSize == 0) return false;
    out[0] = '\0';

    size_t keyLen = strlen(key);
    const char* p = json;
    while ((p = strstr(p, key)) != nullptr) {
        if (p > json && *(p - 1) == '"' && *(p + keyLen) == '"') {
            const char* cursor = p + keyLen + 1;
            while (*cursor != '\0' && isWhitespace(*cursor)) {
                cursor++;
            }
            if (*cursor == ':') {
                cursor++;
                while (*cursor != '\0' && isWhitespace(*cursor)) {
                    cursor++;
                }
                if (*cursor == '"') {
                    cursor++;
                    size_t idx = 0;
                    while (*cursor != '\0' && *cursor != '"') {
                        if (*cursor == '\\' && *(cursor + 1) != '\0') {
                            cursor++;
                            char escaped = *cursor;
                            if (escaped == 'n' || escaped == 'r' || escaped == 't') {
                                escaped = ' ';
                            }
                            if (idx < outSize - 1) {
                                out[idx++] = escaped;
                            }
                        } else {
                            if (idx < outSize - 1) {
                                out[idx++] = *cursor;
                            }
                        }
                        cursor++;
                    }
                    out[idx] = '\0';
                    return idx > 0;
                }
            }
        }
        p += keyLen;
    }
    return false;
}

ApiClient::ApiClient(const char* baseUrl, const char* macAddress) : _lastHttpCode(0) {
    memset(_baseUrl, 0, sizeof(_baseUrl));
    memset(_macAddress, 0, sizeof(_macAddress));
    memset(_lastError, 0, sizeof(_lastError));
    setConfig(baseUrl, macAddress);
}

void ApiClient::setConfig(const char* baseUrl, const char* macAddress) {
    memset(_baseUrl, 0, sizeof(_baseUrl));
    if (baseUrl) strncpy(_baseUrl, baseUrl, sizeof(_baseUrl) - 1);

    if (macAddress != nullptr) {
        setMacAddress(macAddress);
    }
}

void ApiClient::setMacAddress(const char* macAddress) {
    memset(_macAddress, 0, sizeof(_macAddress));
    if (macAddress) strncpy(_macAddress, macAddress, sizeof(_macAddress) - 1);
}

const char* ApiClient::getBaseUrl() const {
    return _baseUrl;
}

const char* ApiClient::getMacAddress() const {
    return _macAddress;
}

bool ApiClient::isHttps() const {
    return (strncmp(_baseUrl, "https://", 8) == 0);
}

int ApiClient::getLastHttpCode() const {
    return _lastHttpCode;
}

const char* ApiClient::getLastError() const {
    return _lastError;
}

void ApiClient::setLastError(int httpCode, const char* message) {
    _lastHttpCode = httpCode;
    memset(_lastError, 0, sizeof(_lastError));
    if (message) {
        strncpy(_lastError, message, sizeof(_lastError) - 1);
    }
}

void ApiClient::clearLastError(int httpCode) {
    _lastHttpCode = httpCode;
    _lastError[0] = '\0';
}

bool ApiClient::shouldRetryStatus(int httpCode) {
    if (httpCode == 200 || httpCode == 201 || httpCode == 204) {
        return false;
    }
    return true;
}

bool ApiClient::extractErrorDetail(const char* responseBody, char* outBuf, size_t outBufSize) {
    if (!outBuf || outBufSize == 0) return false;
    outBuf[0] = '\0';

    if (!responseBody) return false;

    const char* p = responseBody;
    while (*p != '\0' && isWhitespace(*p)) {
        p++;
    }
    if (*p == '\0' || *p == '<') {
        return false;
    }

    if (*p == '{') {
        if (extractJsonStringField(p, "detail", outBuf, outBufSize)) {
            return true;
        }

        // Check if "detail" is a FastAPI/Pydantic validation list (e.g. {"detail":[{"msg":"Field required"}]})
        const char* detailKey = strstr(p, "\"detail\"");
        if (detailKey) {
            const char* cursor = detailKey + 8;
            while (*cursor != '\0' && isWhitespace(*cursor)) {
                cursor++;
            }
            if (*cursor == ':') {
                cursor++;
                while (*cursor != '\0' && isWhitespace(*cursor)) {
                    cursor++;
                }
                if (*cursor == '[' && extractJsonStringField(cursor, "msg", outBuf, outBufSize)) {
                    return true;
                }
            }
        }

        if (extractJsonStringField(p, "message", outBuf, outBufSize)) {
            return true;
        }
        if (extractJsonStringField(p, "error", outBuf, outBufSize)) {
            return true;
        }
        return false;
    }

    if (*p == '[') {
        return false;
    }

    // Plain text response: copy first line and trim trailing whitespace
    size_t idx = 0;
    while (*p != '\0' && *p != '\r' && *p != '\n' && idx < outBufSize - 1) {
        outBuf[idx++] = *p++;
    }
    while (idx > 0 && isWhitespace(outBuf[idx - 1])) {
        idx--;
    }
    outBuf[idx] = '\0';
    return idx > 0;
}

void ApiClient::formatHttpError(int httpCode, const char* responseBody, char* outBuf, size_t outBufSize) {
    if (!outBuf || outBufSize == 0) return;

    if (httpCode <= 0) {
        const char* transportMsg = nullptr;
        switch (httpCode) {
            case 0:   transportMsg = "HTTP request could not be started (check API URL and network)"; break;
            case -1:  transportMsg = "Connection refused by server (verify backend is running and API URL/port is correct)"; break;
            case -2:  transportMsg = "Failed to send HTTP request headers"; break;
            case -3:  transportMsg = "Failed to send HTTP request body"; break;
            case -4:  transportMsg = "Not connected to server"; break;
            case -5:  transportMsg = "Connection lost during HTTP transfer"; break;
            case -6:  transportMsg = "No HTTP response stream received"; break;
            case -7:  transportMsg = "Unable to reach HTTP server or DNS lookup failed (check API URL and Wi-Fi)"; break;
            case -8:  transportMsg = "Insufficient RAM to complete HTTP request"; break;
            case -9:  transportMsg = "HTTP transfer-encoding error"; break;
            case -10: transportMsg = "Failed to write to HTTP stream"; break;
            case -11: transportMsg = "Request timed out waiting for backend response"; break;
            default:
                snprintf(outBuf, outBufSize, "HTTP transport error (code %d)", httpCode);
                return;
        }
        snprintf(outBuf, outBufSize, "%s", transportMsg);
        return;
    }

    const char* statusLabel = "Unexpected Status";
    const char* defaultReason = "Unexpected response from backend";

    switch (httpCode) {
        case 301:
        case 302:
        case 307:
        case 308:
            statusLabel = "Redirect";
            defaultReason = "Unexpected redirect (verify http:// vs https:// in API URL)";
            break;
        case 400:
            statusLabel = "Bad Request";
            defaultReason = "Malformed request payload or invalid MAC address format";
            break;
        case 401:
            statusLabel = "Unauthorized";
            defaultReason = "Node MAC address is not registered or authentication failed";
            break;
        case 403:
            statusLabel = "Forbidden";
            defaultReason = "Access denied for this sensor node";
            break;
        case 404:
            statusLabel = "Not Found";
            defaultReason = "Node MAC not registered or API endpoint not found";
            break;
        case 405:
            statusLabel = "Method Not Allowed";
            defaultReason = "Endpoint rejected HTTP method (check API base URL)";
            break;
        case 408:
            statusLabel = "Request Timeout";
            defaultReason = "Server timed out waiting for sensor payload";
            break;
        case 409:
            statusLabel = "Conflict";
            defaultReason = "Resource conflict on backend";
            break;
        case 422:
            statusLabel = "Unprocessable Entity";
            defaultReason = "Sensor reading payload failed backend schema validation";
            break;
        case 429:
            statusLabel = "Too Many Requests";
            defaultReason = "Backend rate limit exceeded";
            break;
        case 500:
            statusLabel = "Internal Server Error";
            defaultReason = "Backend encountered an internal error";
            break;
        case 502:
            statusLabel = "Bad Gateway";
            defaultReason = "Upstream server or reverse proxy error";
            break;
        case 503:
            statusLabel = "Service Unavailable";
            defaultReason = "Backend is temporarily unavailable or restarting";
            break;
        case 504:
            statusLabel = "Gateway Timeout";
            defaultReason = "Backend proxy timed out";
            break;
        default:
            if (httpCode >= 400 && httpCode < 500) {
                statusLabel = "Client Error";
                defaultReason = "Request rejected by backend";
            } else if (httpCode >= 500 && httpCode < 600) {
                statusLabel = "Server Error";
                defaultReason = "Backend server error";
            }
            break;
    }

    char detail[160] = {0};
    bool hasDetail = extractErrorDetail(responseBody, detail, sizeof(detail));
    snprintf(outBuf, outBufSize, "HTTP %d %s: %s", httpCode, statusLabel, hasDetail ? detail : defaultReason);
}

bool ApiClient::postReading(const SensorReading& reading, bool* isRetryable) {
    if (isRetryable) *isRetryable = true;
#if defined(ARDUINO)
    if (strlen(_baseUrl) == 0) {
        setLastError(0, "API base URL is not configured (set it in Captive Portal or secrets.h)");
        return false;
    }
    if (strlen(_macAddress) == 0) {
        setLastError(0, "Sensor node MAC address is not initialized");
        return false;
    }

    HTTPClient http;
    WiFiClient plainClient;
    WiFiClientSecure secureClient;
    String url = String(_baseUrl) + "/ingest/readings";
    
    if (!beginHttpClient(http, plainClient, secureClient, isHttps(), url)) {
        setLastError(0, "Invalid API URL or failed to initialize HTTP/TLS client");
        return false;
    }
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Node-MAC", _macAddress);
    http.setTimeout(8000);

    JsonDocument doc;
    doc["mac_address"] = _macAddress;
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

    if (success) {
        clearLastError(httpCode);
    } else {
        String respBody;
        if (httpCode > 0) {
            respBody = http.getString();
        }
        _lastHttpCode = httpCode;
        formatHttpError(httpCode, respBody.c_str(), _lastError, sizeof(_lastError));
        if (isRetryable) {
            *isRetryable = shouldRetryStatus(httpCode);
        }
    }

    http.end();
    return success;
#else
    clearLastError(201);
    return true;
#endif
}

bool ApiClient::pollPendingCommands(ActuatorCommand& outCommand, bool& hasCommand) {
    hasCommand = false;
#if defined(ARDUINO)
    if (strlen(_baseUrl) == 0) {
        setLastError(0, "API base URL is not configured (set it in Captive Portal or secrets.h)");
        return false;
    }
    if (strlen(_macAddress) == 0) {
        setLastError(0, "Sensor node MAC address is not initialized");
        return false;
    }

    HTTPClient http;
    WiFiClient plainClient;
    WiFiClientSecure secureClient;
    String url = String(_baseUrl) + "/nodes/" + _macAddress + "/commands";

    if (!beginHttpClient(http, plainClient, secureClient, isHttps(), url)) {
        setLastError(0, "Invalid API URL or failed to initialize HTTP/TLS client");
        return false;
    }
    http.addHeader("Accept", "application/json");
    http.addHeader("X-Node-MAC", _macAddress);
    http.setTimeout(8000);

    int httpCode = http.GET();
    String response;
    if (httpCode > 0) {
        response = http.getString();
    }
    http.end();

    if (httpCode != 200) {
        _lastHttpCode = httpCode;
        formatHttpError(httpCode, response.c_str(), _lastError, sizeof(_lastError));
        return false;
    }

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, response);
    if (err || !doc.is<JsonArray>()) {
        setLastError(httpCode, "Failed to parse commands JSON array from backend");
        return false;
    }

    clearLastError(httpCode);

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
    clearLastError(200);
    return true;
#endif
}

bool ApiClient::ackCommand(const char* commandId, const char* status, const char* result, const char* executedAt) {
#if defined(ARDUINO)
    if (strlen(_baseUrl) == 0) {
        setLastError(0, "API base URL is not configured (set it in Captive Portal or secrets.h)");
        return false;
    }
    if (strlen(_macAddress) == 0) {
        setLastError(0, "Sensor node MAC address is not initialized");
        return false;
    }
    if (!commandId || strlen(commandId) == 0) {
        setLastError(0, "Cannot acknowledge command: command_id is missing");
        return false;
    }

    HTTPClient http;
    WiFiClient plainClient;
    WiFiClientSecure secureClient;
    String url = String(_baseUrl) + "/nodes/" + _macAddress + "/commands/" + commandId + "/ack";

    if (!beginHttpClient(http, plainClient, secureClient, isHttps(), url)) {
        setLastError(0, "Invalid API URL or failed to initialize HTTP/TLS client");
        return false;
    }
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Node-MAC", _macAddress);
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
    String respBody;
    if (httpCode > 0 && httpCode != 200) {
        respBody = http.getString();
    }
    http.end();

    if (httpCode == 200) {
        clearLastError(httpCode);
        return true;
    }

    _lastHttpCode = httpCode;
    formatHttpError(httpCode, respBody.c_str(), _lastError, sizeof(_lastError));
    return false;
#else
    clearLastError(200);
    return true;
#endif
}
