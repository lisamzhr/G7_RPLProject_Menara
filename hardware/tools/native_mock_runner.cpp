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

int main(int argc, char* argv[]) {
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

            float soil = mockSensors.readSoilMoisturePct();
            float temp = 0.0f, hum = 0.0f;
            mockSensors.readDHT(temp, hum);
            float lux = mockSensors.readLux();
            float batt = mockSensors.readBatteryVoltage();
            std::string ts = getIsoUtcTimestamp();

            std::ostringstream json;
            json << "{\"node_id\":\"" << nodeId << "\",\"ts\":\"" << ts << "\","
                 << "\"soil_moisture_pct\":" << soil << ",\"temperature_c\":" << temp << ","
                 << "\"humidity_pct\":" << hum << ",\"lux\":" << lux << ",\"battery_v\":" << batt << "}";

            std::cout << "[Telemetry] Moisture: " << soil << "% | Temp: " << temp
                      << "C | Hum: " << hum << "% | Lux: " << lux << " lx\n";

            std::string response;
            bool ok = http.post(DEFAULT_API_PATH + "/ingest/readings", json.str(), apiKey, response);
            if (ok) {
                std::cout << "  -> Ingested successfully into web app.\n";
            } else {
                std::cout << "  -> Ingestion failed or backend offline. Buffering reading.\n";
            }
        }

        // Periodic command poll
        if (std::chrono::duration_cast<std::chrono::seconds>(now - lastPollTime).count() >= DEFAULT_POLL_INTERVAL_S) {
            lastPollTime = now;
            std::string response;
            if (http.get(DEFAULT_API_PATH + "/nodes/" + nodeId + "/commands", apiKey, response)) {
                if (response.find("\"command\"") != std::string::npos) {
                    std::cout << "[Command] Received pending command from web app!\n";
                    if (response.find("turn_on") != std::string::npos) {
                        relayActive = true;
                        relayTurnOnTime = now;
                        relayDurationS = 30;
                        mockSensors.notifyWatering(relayDurationS);
                        std::cout << "  -> Sprinkler turned ON for 30s! Moisture replenished.\n";
                    }
                }
            }
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }

    std::cout << "Native mock runner stopped.\n";
    return 0;
}
