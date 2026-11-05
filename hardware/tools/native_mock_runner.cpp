/**
 * @file native_mock_runner.cpp
 * @brief Standalone Host/Native Runner for RoofGarden Mock Firmware.
 *
 * Runs the mock firmware logic natively on Windows/Linux without requiring physical
 * ESP32 hardware or flashing. Emulates sensors, network telemetry, command polling,
 * ring-buffered offline resilience, and actuator control.
 */

#include <iostream>
#include <chrono>
#include <thread>
#include <string>
#include <sstream>
#include <iomanip>
#include <cstring>
#include <cstdlib>
#include <vector>

#include "sensors/mock_sensors.h"
#include "core/reading_buffer.h"

#ifdef _WIN32
#include <windows.h>
#include <wininet.h>
#include <conio.h>
#pragma comment(lib, "wininet.lib")
#endif

// Default configuration
static const std::string DEFAULT_API_HOST = "localhost";
static const int DEFAULT_API_PORT = 8000;
static const std::string DEFAULT_API_PATH = "/api/v1";
static const std::string DEFAULT_NODE_ID = "esp32-node-01";
static const std::string DEFAULT_API_KEY = "dev-node-api-key-secret-12345";
static const int DEFAULT_SEND_INTERVAL_S = 10;
static const int DEFAULT_POLL_INTERVAL_S = 10;
static const uint32_t HARD_MAX_RELAY_SECONDS = 60;

class NativeHttpTransport {
public:
#ifdef _WIN32
    NativeHttpTransport(const std::string& host, int port)
        : _host(host), _port(port), _hInternet(nullptr), _hConnect(nullptr) {
        _hInternet = InternetOpenA("RoofGarden-MockNode/1.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
        if (_hInternet) {
            _hConnect = InternetConnectA(_hInternet, _host.c_str(), _port, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
        }
    }

    ~NativeHttpTransport() {
        if (_hConnect) InternetCloseHandle(_hConnect);
        if (_hInternet) InternetCloseHandle(_hInternet);
    }

    bool post(const std::string& path, const std::string& jsonBody, const std::string& apiKey, std::string& responseBody) {
        if (!_hConnect) return false;

        HINTERNET hRequest = HttpOpenRequestA(_hConnect, "POST", path.c_str(), NULL, NULL, NULL, INTERNET_FLAG_RELOAD, 0);
        if (!hRequest) return false;

        std::string headers = "Content-Type: application/json\r\nX-Node-Key: " + apiKey + "\r\n";
        BOOL sent = HttpSendRequestA(hRequest, headers.c_str(), (DWORD)headers.length(),
                                     (LPVOID)jsonBody.c_str(), (DWORD)jsonBody.length());

        bool success = false;
        if (sent) {
            DWORD statusCode = 0;
            DWORD statusSize = sizeof(statusCode);
            HttpQueryInfoA(hRequest, HTTP_QUERY_STATUS_CODE | HTTP_QUERY_FLAG_NUMBER, &statusCode, &statusSize, NULL);
            success = (statusCode == 200 || statusCode == 201);

            char buffer[1024];
            DWORD bytesRead = 0;
            responseBody.clear();
            while (InternetReadFile(hRequest, buffer, sizeof(buffer) - 1, &bytesRead) && bytesRead > 0) {
                buffer[bytesRead] = '\0';
                responseBody += buffer;
            }
        }
        InternetCloseHandle(hRequest);
        return success;
    }

    bool get(const std::string& path, const std::string& apiKey, std::string& responseBody) {
        if (!_hConnect) return false;

        HINTERNET hRequest = HttpOpenRequestA(_hConnect, "GET", path.c_str(), NULL, NULL, NULL, INTERNET_FLAG_RELOAD, 0);
        if (!hRequest) return false;

        std::string headers = "X-Node-Key: " + apiKey + "\r\n";
        BOOL sent = HttpSendRequestA(hRequest, headers.c_str(), (DWORD)headers.length(), NULL, 0);

        bool success = false;
        if (sent) {
            DWORD statusCode = 0;
            DWORD statusSize = sizeof(statusCode);
            HttpQueryInfoA(hRequest, HTTP_QUERY_STATUS_CODE | HTTP_QUERY_FLAG_NUMBER, &statusCode, &statusSize, NULL);
            success = (statusCode == 200);

            char buffer[1024];
            DWORD bytesRead = 0;
            responseBody.clear();
            while (InternetReadFile(hRequest, buffer, sizeof(buffer) - 1, &bytesRead) && bytesRead > 0) {
                buffer[bytesRead] = '\0';
                responseBody += buffer;
            }
        }
        InternetCloseHandle(hRequest);
        return success;
    }
#else
    NativeHttpTransport(const std::string& host, int port) {}
    bool post(const std::string&, const std::string&, const std::string&, std::string&) { return false; }
    bool get(const std::string&, const std::string&, std::string&) { return false; }
#endif

private:
    std::string _host;
    int _port;
#ifdef _WIN32
    HINTERNET _hInternet;
    HINTERNET _hConnect;
#endif
};

// Simple ISO8601 UTC timestamp generator
static std::string getIsoUtcTimestamp() {
    using namespace std::chrono;
    auto now = system_clock::now();
    std::time_t tt = system_clock::to_time_t(now);
    std::tm gm{};
#ifdef _WIN32
    gmtime_s(&gm, &tt);
#else
    gmtime_r(&tt, &gm);
#endif
    std::ostringstream ss;
    ss << std::put_time(&gm, "%Y-%m-%dT%H:%M:%SZ");
    return ss.str();
}

struct NativeCommand {
    std::string command_id;
    std::string actuator_id;
    std::string command;
    uint32_t duration_seconds = 30;
};

static std::vector<NativeCommand> parseCommandsJson(const std::string& json) {
    std::vector<NativeCommand> list;
    size_t pos = 0;
    while ((pos = json.find("command_id", pos)) != std::string::npos) {
        NativeCommand cmd;
        size_t idStart = json.find('"', pos + 11);
        if (idStart != std::string::npos) {
            size_t idEnd = json.find('"', idStart + 1);
            if (idEnd != std::string::npos) {
                cmd.command_id = json.substr(idStart + 1, idEnd - idStart - 1);
            }
        }

        size_t cmdPos = json.find("\"command\"", pos);
        if (cmdPos != std::string::npos && cmdPos < pos + 300) {
            size_t cmdValStart = json.find('"', cmdPos + 9);
            if (cmdValStart != std::string::npos) {
                size_t cmdValEnd = json.find('"', cmdValStart + 1);
                if (cmdValEnd != std::string::npos) {
                    cmd.command = json.substr(cmdValStart + 1, cmdValEnd - cmdValStart - 1);
                }
            }
        }

        size_t durPos = json.find("\"duration_seconds\"", pos);
        if (durPos != std::string::npos && durPos < pos + 300) {
            size_t colon = json.find(':', durPos);
            if (colon != std::string::npos) {
                cmd.duration_seconds = std::atoi(json.c_str() + colon + 1);
                if (cmd.duration_seconds == 0) cmd.duration_seconds = 30;
            }
        }

        if (!cmd.command_id.empty()) {
            list.push_back(cmd);
        }
        pos += 20;
    }
    return list;
}

static std::string formatTelemetryJson(const std::string& nodeId, const SensorReading& r) {
    std::ostringstream json;
    json << "{\"node_id\":\"" << nodeId << "\"";
    if (std::strlen(r.timestamp) > 0) {
        json << ",\"ts\":\"" << r.timestamp << "\"";
    }
    json << ",\"soil_moisture_pct\":" << r.soil_moisture_pct
         << ",\"temperature_c\":" << r.temperature_c
         << ",\"humidity_pct\":" << r.humidity_pct
         << ",\"lux\":" << r.lux;
    if (r.battery_v > 0.0f) {
        json << ",\"battery_v\":" << r.battery_v;
    }
    json << ",\"is_valid\":" << (r.is_valid ? "true" : "false") << "}";
    return json.str();
}

int main(int argc, char* argv[]) {
    (void)argc;
    (void)argv;
    std::string host = DEFAULT_API_HOST;
    int port = DEFAULT_API_PORT;
    std::string nodeId = DEFAULT_NODE_ID;
    std::string apiKey = DEFAULT_API_KEY;
    int sendIntervalS = DEFAULT_SEND_INTERVAL_S;

    std::cout << "============================================================\n";
    std::cout << "  ROOFGARDEN NATIVE MOCK FIRMWARE RUNNER\n";
    std::cout << "  Target:        http://" << host << ":" << port << DEFAULT_API_PATH << "\n";
    std::cout << "  Node ID:       " << nodeId << "\n";
    std::cout << "  Send Interval: " << sendIntervalS << "s\n";
    std::cout << "============================================================\n";
    std::cout << "Shortcuts: [1] Normal  [2] Dry  [3] Heatwave  [4] Water  [5] Anomaly  [q] Quit\n\n";

    NativeHttpTransport http(host, port);
    MockSensors mockSensors(78.0f, MOCK_SCENARIO_NORMAL);
    mockSensors.begin();
    ReadingBuffer buffer(100);

    bool relayActive = false;
    auto relayTurnOnTime = std::chrono::steady_clock::now();
    uint32_t relayDurationS = 0;

    auto lastSendTime = std::chrono::steady_clock::now() - std::chrono::seconds(sendIntervalS);
    auto lastPollTime = std::chrono::steady_clock::now();

    bool running = true;
    while (running) {
        auto now = std::chrono::steady_clock::now();

        // Check relay safety cutoff
        if (relayActive) {
            auto elapsedS = std::chrono::duration_cast<std::chrono::seconds>(now - relayTurnOnTime).count();
            if (elapsedS >= (int64_t)relayDurationS || elapsedS >= (int64_t)HARD_MAX_RELAY_SECONDS) {
                relayActive = false;
                std::cout << "[Relay] Safe shutoff reached. Valve closed.\n";
            }
        }

        // Check non-blocking keyboard input on Windows
#ifdef _WIN32
        if (_kbhit()) {
            char ch = (char)_getch();
            if (ch == '1' || ch == 'n') {
                mockSensors.setScenario(MOCK_SCENARIO_NORMAL);
                std::cout << "\n[Input] Scenario set to NORMAL.\n";
            } else if (ch == '2' || ch == 'd') {
                mockSensors.setScenario(MOCK_SCENARIO_DRY);
                std::cout << "\n[Input] Scenario set to DRY (Irrigation Trigger).\n";
            } else if (ch == '3' || ch == 'h') {
                mockSensors.setScenario(MOCK_SCENARIO_HEATWAVE);
                std::cout << "\n[Input] Scenario set to HEATWAVE.\n";
            } else if (ch == '4' || ch == 'w') {
                mockSensors.manualWaterPulse(12.0f);
                std::cout << "\n[Input] Manual watering pulse (+12% moisture).\n";
            } else if (ch == '5' || ch == 'a') {
                bool curr = mockSensors.isAnomalyActive();
                mockSensors.triggerAnomaly(!curr);
                std::cout << "\n[Input] Anomaly mode " << (!curr ? "ENABLED" : "DISABLED") << ".\n";
            } else if (ch == 'q' || ch == 'Q') {
                running = false;
                break;
            }
        }
#endif

        // Periodic telemetry send
        if (std::chrono::duration_cast<std::chrono::seconds>(now - lastSendTime).count() >= sendIntervalS) {
            lastSendTime = now;
            mockSensors.update((float)sendIntervalS);

            SensorReading reading{};
            reading.soil_moisture_pct = mockSensors.readSoilMoisturePct();
            float temp = 0.0f, hum = 0.0f;
            mockSensors.readDHT(temp, hum);
            reading.temperature_c = temp;
            reading.humidity_pct = hum;
            reading.lux = mockSensors.readLux();
            reading.battery_v = mockSensors.readBatteryVoltage();
            reading.is_valid = !mockSensors.isAnomalyActive();
            std::string ts = getIsoUtcTimestamp();
            strncpy(reading.timestamp, ts.c_str(), sizeof(reading.timestamp) - 1);

            // Flush buffered readings first
            while (!buffer.isEmpty()) {
                SensorReading buffered{};
                if (buffer.peek(buffered)) {
                    std::string bufJson = formatTelemetryJson(nodeId, buffered);
                    std::string resp;
                    if (http.post(DEFAULT_API_PATH + "/ingest/readings", bufJson, apiKey, resp)) {
                        buffer.pop(buffered);
                        std::cout << "  [Buffer] Flushed 1 buffered reading to web app ("
                                  << buffer.size() << " remaining).\n";
                    } else {
                        break; // Server offline, keep in buffer
                    }
                }
            }

            std::cout << "[Telemetry] Moisture: " << reading.soil_moisture_pct << "% | Temp: " << reading.temperature_c
                      << "C | Hum: " << reading.humidity_pct << "% | Lux: " << reading.lux
                      << " lx | Valid: " << (reading.is_valid ? "true" : "false") << "\n";

            std::string currentJson = formatTelemetryJson(nodeId, reading);
            std::string response;
            bool ok = http.post(DEFAULT_API_PATH + "/ingest/readings", currentJson, apiKey, response);
            if (ok) {
                std::cout << "  -> Ingested successfully into web app.\n";
            } else {
                std::cout << "  -> Ingestion failed or backend offline. Buffering reading to memory.\n";
                buffer.push(reading);
            }
        }

        // Periodic command poll
        if (std::chrono::duration_cast<std::chrono::seconds>(now - lastPollTime).count() >= DEFAULT_POLL_INTERVAL_S) {
            lastPollTime = now;
            std::string response;
            if (http.get(DEFAULT_API_PATH + "/nodes/" + nodeId + "/commands", apiKey, response)) {
                auto commands = parseCommandsJson(response);
                for (const auto& cmd : commands) {
                    std::cout << "[Command] Received pending command from web app: " << cmd.command
                              << " (ID: " << cmd.command_id << ", Duration: " << cmd.duration_seconds << "s)\n";
                    std::string execTs = getIsoUtcTimestamp();
                    std::string ackResult;

                    if (cmd.command == "turn_on") {
                        relayActive = true;
                        relayTurnOnTime = now;
                        relayDurationS = std::min(cmd.duration_seconds, HARD_MAX_RELAY_SECONDS);
                        mockSensors.notifyWatering(relayDurationS);
                        ackResult = "Valve opened for " + std::to_string(relayDurationS) + "s successfully";
                        std::cout << "  -> Sprinkler turned ON for " << relayDurationS << "s! Moisture replenished.\n";
                    } else if (cmd.command == "turn_off") {
                        relayActive = false;
                        relayDurationS = 0;
                        ackResult = "Valve closed successfully";
                        std::cout << "  -> Sprinkler turned OFF.\n";
                    } else {
                        ackResult = "Unsupported command";
                        std::cout << "  -> Unknown command: " << cmd.command << "\n";
                    }

                    // Acknowledge command execution to unblock backend queue
                    std::ostringstream ackBody;
                    ackBody << "{\"status\":\"" << (cmd.command == "turn_on" || cmd.command == "turn_off" ? "acked" : "failed")
                            << "\",\"executed_at\":\"" << execTs << "\",\"result\":\"" << ackResult << "\"}";
                    std::string ackResp;
                    bool ackOk = http.post(DEFAULT_API_PATH + "/nodes/" + nodeId + "/commands/" + cmd.command_id + "/ack",
                                           ackBody.str(), apiKey, ackResp);
                    if (ackOk) {
                        std::cout << "  -> Acknowledged command " << cmd.command_id << " to backend.\n";
                    } else {
                        std::cout << "  -> Failed to acknowledge command " << cmd.command_id << ".\n";
                    }
                }
            }
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }

    std::cout << "Native mock runner stopped.\n";
    return 0;
}
