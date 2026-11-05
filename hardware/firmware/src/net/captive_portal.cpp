#include "captive_portal.h"
#include <cstring>

bool CaptivePortal::isIpAddress(const char* host) {
    if (!host || *host == '\0') return false;

    int dotCount = 0;
    int numCount = 0;
    const char* p = host;

    while (*p && *p != ':') {
        if (*p >= '0' && *p <= '9') {
            numCount++;
        } else if (*p == '.') {
            dotCount++;
        } else {
            return false;
        }
        p++;
    }

    return (dotCount == 3 && numCount >= 4);
}

bool CaptivePortal::isCaptiveProbe(const char* path) {
    if (!path) return false;
    static const char* const probes[] = {
        "/generate_204",
        "/gen_204",
        "/mobile/status",
        "/hotspot-detect.html",
        "/library/test/success.html",
        "/success.txt",
        "/ncsi.txt",
        "/connecttest.txt",
        "/fwlink",
        "/canonical.html"
    };
    for (const char* probe : probes) {
        if (strcmp(path, probe) == 0) {
            return true;
        }
    }
    return false;
}

#if defined(ARDUINO)
#include <algorithm>

CaptivePortal::CaptivePortal()
    : _server(nullptr), _dnsServer(nullptr), _lastScanMillis(0), _running(false), _configSaved(false), _startedMillis(0) {
    memset(&_config, 0, sizeof(DeviceConfig));
    memset(&_savedConfig, 0, sizeof(DeviceConfig));
    memset(_apSsid, 0, sizeof(_apSsid));
}

CaptivePortal::~CaptivePortal() {
    stop();
}

void CaptivePortal::performScan() {
    Serial.println("[Portal] Scanning 2.4 GHz Wi-Fi channels...");
    // Synchronous scan with show_hidden=false, passive=false
    int n = WiFi.scanNetworks(false, false);
    _scannedAps.clear();

    if (n > 0) {
        for (int i = 0; i < n; ++i) {
            String s = WiFi.SSID(i);
            s.trim();
            if (s.length() == 0) continue;

            int rssi = WiFi.RSSI(i);
            // Check for existing SSID and keep strongest signal
            bool found = false;
            for (auto& existing : _scannedAps) {
                if (strcmp(existing.ssid, s.c_str()) == 0) {
                    if (rssi > existing.rssi) {
                        existing.rssi = rssi;
                    }
                    found = true;
                    break;
                }
            }
            if (!found) {
                ScannedAp ap;
                strncpy(ap.ssid, s.c_str(), sizeof(ap.ssid) - 1);
                ap.ssid[sizeof(ap.ssid) - 1] = '\0';
                ap.rssi = rssi;
                _scannedAps.push_back(ap);
            }
        }

        // Sort descending by RSSI (strongest signal first)
        std::sort(_scannedAps.begin(), _scannedAps.end(), [](const ScannedAp& a, const ScannedAp& b) {
            return a.rssi > b.rssi;
        });

        // Clean up internal scan memory
        WiFi.scanDelete();
        Serial.printf("[Portal] Scan complete: %u access points found.\n", (unsigned int)_scannedAps.size());
    } else {
        Serial.printf("[Portal] Scan returned code %d (no APs found or scan failed).\n", n);
    }
    _lastScanMillis = millis();
}

bool CaptivePortal::begin(const DeviceConfig& initialConfig, const char* apPrefix) {
    _config = initialConfig;
    _configSaved = false;

    // 1. Explicitly disconnect Station to stop background auto-reconnect
    // This immediately stops the ESP-IDF driver from emitting NO_AP_FOUND (reason 201)
    WiFi.disconnect(false, false);
    delay(50);

    // 2. Generate unique AP SSID using last 2 bytes of MAC
    uint8_t mac[6];
    WiFi.macAddress(mac);
    snprintf(_apSsid, sizeof(_apSsid), "%s-%02X%02X", apPrefix, mac[4], mac[5]);

    Serial.print("[Portal] Starting SoftAP: ");
    Serial.println(_apSsid);

    // Use AP_STA mode so we can scan nearby 2.4GHz routers while broadcasting the hotspot
    WiFi.mode(WIFI_AP_STA);
    IPAddress apIP(192, 168, 4, 1);
    IPAddress netMsk(255, 255, 255, 0);
    WiFi.softAPConfig(apIP, apIP, netMsk);
    
    if (!WiFi.softAP(_apSsid)) {
        Serial.println("[Portal] Failed to start SoftAP.");
        return false;
    }

    Serial.print("[Portal] SoftAP IP address: ");
    Serial.println(WiFi.softAPIP());

    // 3. Initial Wi-Fi scan so the list is ready when the phone loads the web page
    performScan();

    // 4. Start DNS server redirecting all domain requests to our AP IP (Captive Portal trigger)
    _dnsServer = new DNSServer();
    _dnsServer->setErrorReplyCode(DNSReplyCode::NoError);
    _dnsServer->start(53, "*", apIP);

    // 5. Start HTTP WebServer
    _server = new WebServer(80);
    setupRoutes();
    _server->begin();

    _running = true;
    _startedMillis = millis();
    Serial.println("[Portal] Web server and DNS redirection active. Waiting for mobile client...");
    return true;
}

bool CaptivePortal::captivePortal() {
    if (!_server) return false;
    String host = _server->hostHeader();
    if (!isIpAddress(host.c_str())) {
        Serial.printf("[Portal] Hijacked external probe for '%s' -> 302 Redirect to http://192.168.4.1/\n", host.c_str());
        handleRedirect();
        return true;
    }
    return false;
}

void CaptivePortal::handleRedirect() {
    if (!_server) return;
    _server->sendHeader("Location", "http://192.168.4.1/", true);
    _server->sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    _server->sendHeader("Pragma", "no-cache");
    _server->sendHeader("Expires", "0");
    _server->send(302, "text/plain", "");
    _server->client().stop();
}

void CaptivePortal::setupRoutes() {
    if (!_server) return;

    _server->on("/", HTTP_GET, [this]() { handleRoot(); });
    _server->on("/save", HTTP_POST, [this]() { handleSave(); });
    _server->on("/scan", HTTP_GET, [this]() { handleScan(); });

    // Operating system captive portal probe intercepts
    // Android / Google connectivity probes:
    _server->on("/generate_204", HTTP_GET, [this]() { handleRedirect(); });
    _server->on("/gen_204", HTTP_GET, [this]() { handleRedirect(); });
    _server->on("/mobile/status", HTTP_GET, [this]() { handleRedirect(); });

    // Apple iOS / macOS Captive Network Assistant (CNA) probes:
    _server->on("/hotspot-detect.html", HTTP_GET, [this]() { handleRedirect(); });
    _server->on("/library/test/success.html", HTTP_GET, [this]() { handleRedirect(); });
    _server->on("/success.txt", HTTP_GET, [this]() { handleRedirect(); });

    // Microsoft Windows network connectivity probes:
    _server->on("/ncsi.txt", HTTP_GET, [this]() { handleRedirect(); });
    _server->on("/connecttest.txt", HTTP_GET, [this]() { handleRedirect(); });
    _server->on("/fwlink", HTTP_GET, [this]() { handleRedirect(); });

    // ChromeOS / Firefox probes:
    _server->on("/canonical.html", HTTP_GET, [this]() { handleRedirect(); });

    _server->onNotFound([this]() { handleNotFound(); });
}

void CaptivePortal::update() {
    if (!_running) return;

    if (_dnsServer) {
        // Drain pending DNS requests in queue
        for (int i = 0; i < 5; ++i) {
            _dnsServer->processNextRequest();
        }
    }
    if (_server) {
        _server->handleClient();
    }
}

void CaptivePortal::stop() {
    if (!_running) return;

    Serial.println("[Portal] Stopping captive portal services...");
    if (_server) {
        _server->stop();
        delete _server;
        _server = nullptr;
    }
    if (_dnsServer) {
        _dnsServer->stop();
        delete _dnsServer;
        _dnsServer = nullptr;
    }
    WiFi.softAPdisconnect(true);
    WiFi.mode(WIFI_STA);
    _scannedAps.clear();
    _running = false;
}

bool CaptivePortal::isRunning() const {
    return _running;
}

bool CaptivePortal::isConfigSaved() const {
    return _configSaved;
}

DeviceConfig CaptivePortal::getSavedConfig() const {
    return _savedConfig;
}

void CaptivePortal::handleNotFound() {
    if (captivePortal()) {
        return;
    }
    // Any unrecognized path on 192.168.4.1 redirects to root
    handleRedirect();
}

void CaptivePortal::handleScan() {
    performScan();
    String json = "[";
    for (size_t i = 0; i < _scannedAps.size(); ++i) {
        if (i > 0) json += ",";
        json += "{\"ssid\":\"" + String(_scannedAps[i].ssid) + "\",\"rssi\":" + String(_scannedAps[i].rssi) + "}";
    }
    json += "]";
    _server->sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    _server->send(200, "application/json", json);
}

void CaptivePortal::handleRoot() {
    if (captivePortal()) {
        return; // External domain intercepted, redirected to 192.168.4.1
    }

    if (_server->hasArg("rescan")) {
        performScan();
    }
    _server->sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    _server->sendHeader("Pragma", "no-cache");
    _server->sendHeader("Expires", "0");
    _server->send(200, "text/html", buildHtml());
}

void CaptivePortal::handleSave() {
    String chosenSsid = _server->arg("ssid");
    String customSsid = _server->arg("custom_ssid");
    String pass = _server->arg("pass");
    String apiUrl = _server->arg("api_url");
    String nodeId = _server->arg("node_id");
    String nodeKey = _server->arg("node_key");

    String finalSsid = (chosenSsid == "__custom__" || chosenSsid.length() == 0) ? customSsid : chosenSsid;
    finalSsid.trim();
    pass.trim();
    apiUrl.trim();
    nodeId.trim();
    nodeKey.trim();

    if (finalSsid.length() == 0) {
        _server->send(400, "text/html", "<html><body><h3>Error: Wi-Fi SSID cannot be empty.</h3><a href='/'>Go Back</a></body></html>");
        return;
    }

    memset(&_savedConfig, 0, sizeof(DeviceConfig));
    strncpy(_savedConfig.wifi_ssid, finalSsid.c_str(), sizeof(_savedConfig.wifi_ssid) - 1);
    strncpy(_savedConfig.wifi_pass, pass.c_str(), sizeof(_savedConfig.wifi_pass) - 1);
    strncpy(_savedConfig.api_base_url, apiUrl.length() > 0 ? apiUrl.c_str() : _config.api_base_url, sizeof(_savedConfig.api_base_url) - 1);
    strncpy(_savedConfig.node_id, nodeId.length() > 0 ? nodeId.c_str() : _config.node_id, sizeof(_savedConfig.node_id) - 1);
    strncpy(_savedConfig.node_api_key, nodeKey.length() > 0 ? nodeKey.c_str() : _config.node_api_key, sizeof(_savedConfig.node_api_key) - 1);

    _configSaved = true;

    String resp = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Setup Complete - RoofGarden</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0fdf4; color: #166534; text-align: center; padding: 40px 20px; }
    .card { background: white; max-width: 420px; margin: auto; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #bbf7d0; }
    .icon { font-size: 52px; margin-bottom: 12px; }
    h2 { margin: 0 0 10px; color: #15803d; }
    p { color: #374151; font-size: 15px; line-height: 1.5; }
    .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 14px; margin-top: 10px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#x1F33F;</div>
    <h2>Credentials Saved!</h2>
    <p>The ESP32 node is now switching to <strong>Station Mode</strong> and connecting to:</p>
    <div class="badge">)rawliteral" + finalSsid + R"rawliteral(</div>
    <p style="margin-top:20px; font-size:13px; color:#6b7280;">You can reconnect your phone to your normal Wi-Fi network.</p>
  </div>
</body>
</html>
)rawliteral";

    _server->sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    _server->send(200, "text/html", resp);
    Serial.printf("[Portal] Credentials saved for SSID: %s\n", finalSsid.c_str());
}

String CaptivePortal::buildHtml() {
    bool hasAps = !_scannedAps.empty();

    String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>RoofGarden Node Setup</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 16px;
      display: flex;
      justify-content: center;
    }
    .container {
      width: 100%;
      max-width: 440px;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
      padding: 24px;
      border: 1px solid #e2e8f0;
    }
    .header { text-align: center; margin-bottom: 24px; }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: #ecfdf5;
      color: #059669;
      font-size: 28px;
      border-radius: 16px;
      margin-bottom: 12px;
    }
    h1 { font-size: 22px; font-weight: 700; color: #065f46; margin: 0; }
    p.sub { font-size: 14px; color: #64748b; margin: 6px 0 0; }
    .form-group { margin-bottom: 16px; }
    .flex-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    label { font-size: 13px; font-weight: 600; color: #334155; }
    .rescan-btn {
      font-size: 12px;
      color: #059669;
      text-decoration: none;
      background: #ecfdf5;
      padding: 4px 10px;
      border-radius: 8px;
      font-weight: 600;
      border: 1px solid #a7f3d0;
    }
    select, input[type="text"], input[type="password"] {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 15px;
      color: #1e293b;
      background: #ffffff;
      outline: none;
      transition: border-color 0.15s ease;
    }
    select:focus, input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
    .btn {
      width: 100%;
      padding: 14px;
      background: #059669;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(5,150,105,0.25);
      transition: background 0.15s ease;
      margin-top: 10px;
    }
    .btn:hover { background: #047857; }
    details {
      margin-top: 16px;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      padding: 12px;
      background: #f8fafc;
    }
    summary {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      outline: none;
    }
    .hint {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
    }
  </style>
  <script>
    function togglePass() {
      var x = document.getElementById("pass");
      x.type = x.type === "password" ? "text" : "password";
    }
    function onSsidChange() {
      var sel = document.getElementById("ssid_select");
      var customGroup = document.getElementById("custom_ssid_group");
      var customInput = document.getElementById("custom_ssid");
      if (sel && sel.value === "__custom__") {
        customGroup.style.display = "block";
        customInput.focus();
      } else if (customGroup) {
        customGroup.style.display = "none";
      }
    }
  </script>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">&#x1F33F;</div>
      <h1>RoofGarden Setup</h1>
      <p class="sub">Configure Wi-Fi credentials for node sensor</p>
    </div>

    <form action="/save" method="POST">
      <div class="form-group">
        <div class="flex-row">
          <label for="ssid_select">Available Networks</label>
          <a href="/?rescan=1" class="rescan-btn">&#x21BB; Refresh</a>
        </div>
        <select id="ssid_select" name="ssid" onchange="onSsidChange()">
)rawliteral";

    if (hasAps) {
        for (size_t i = 0; i < _scannedAps.size(); ++i) {
            String bars = "  ";
            if (_scannedAps[i].rssi >= -60) bars = " [Strong]";
            else if (_scannedAps[i].rssi >= -75) bars = " [Medium]";
            else bars = " [Weak]";

            html += "<option value=\"" + String(_scannedAps[i].ssid) + "\">" +
                    String(_scannedAps[i].ssid) + bars + "</option>\n";
        }
        html += "<option value=\"__custom__\">-- Manual SSID entry --</option>\n";
    } else {
        html += "<option value=\"__custom__\">No Wi-Fi networks found (Enter manually)</option>\n";
    }

    String customDisplayStyle = hasAps ? "none" : "block";

    html += R"rawliteral(
        </select>
      </div>

      <div class="form-group toggle-custom" id="custom_ssid_group" style="display:)rawliteral" + customDisplayStyle + R"rawliteral(;">
        <label for="custom_ssid">Network Name (SSID)</label>
        <input type="text" id="custom_ssid" name="custom_ssid" placeholder="Enter Wi-Fi network name">
        <div class="hint">Ensure your router broadcasts a 2.4 GHz Wi-Fi signal.</div>
      </div>

      <div class="form-group">
        <label for="pass">Wi-Fi Password</label>
        <input type="password" id="pass" name="pass" placeholder="Enter Wi-Fi password">
        <div style="margin-top:6px; font-size:12px; color:#64748b;">
          <input type="checkbox" onclick="togglePass()" id="show_pass"> <label for="show_pass" style="display:inline; font-weight:normal; cursor:pointer;">Show password</label>
        </div>
      </div>

      <details>
        <summary>&#x2699;&#xFE0F; Backend API Settings (Optional)</summary>
        <div style="margin-top:12px;">
          <div class="form-group">
            <label for="api_url">API Base URL</label>
            <input type="text" id="api_url" name="api_url" value=")rawliteral" + String(_config.api_base_url) + R"rawliteral(">
          </div>
          <div class="form-group">
            <label for="node_id">Node ID</label>
            <input type="text" id="node_id" name="node_id" value=")rawliteral" + String(_config.node_id) + R"rawliteral(">
          </div>
          <div class="form-group">
            <label for="node_key">Node API Secret Key</label>
            <input type="password" id="node_key" name="node_key" value=")rawliteral" + String(_config.node_api_key) + R"rawliteral(">
          </div>
        </div>
      </details>

      <button type="submit" class="btn">&#x2714; Save & Connect</button>
    </form>
  </div>
</body>
</html>
)rawliteral";

    return html;
}

#else

// Non-Arduino mock fallback for native tests
CaptivePortal::CaptivePortal() : _running(false), _configSaved(false), _startedMillis(0) {}
CaptivePortal::~CaptivePortal() {}
bool CaptivePortal::begin(const DeviceConfig& initialConfig, const char* apPrefix) { _config = initialConfig; _running = true; return true; }
void CaptivePortal::update() {}
void CaptivePortal::stop() { _running = false; }
bool CaptivePortal::isRunning() const { return _running; }
bool CaptivePortal::isConfigSaved() const { return _configSaved; }
DeviceConfig CaptivePortal::getSavedConfig() const { return _savedConfig; }

#endif
