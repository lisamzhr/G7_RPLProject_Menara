#include "captive_portal.h"

#if defined(ARDUINO)

CaptivePortal::CaptivePortal()
    : _server(nullptr), _dnsServer(nullptr), _running(false), _configSaved(false), _startedMillis(0) {
    memset(&_config, 0, sizeof(DeviceConfig));
    memset(&_savedConfig, 0, sizeof(DeviceConfig));
    memset(_apSsid, 0, sizeof(_apSsid));
}

CaptivePortal::~CaptivePortal() {
    stop();
}

bool CaptivePortal::begin(const DeviceConfig& initialConfig, const char* apPrefix) {
    _config = initialConfig;
    _configSaved = false;

    // Generate unique AP SSID using last 2 bytes of MAC
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

    // Start DNS server redirecting all domain requests to our AP IP (Captive Portal trigger)
    _dnsServer = new DNSServer();
    _dnsServer->setErrorReplyCode(DNSReplyCode::NoError);
    _dnsServer->start(53, "*", apIP);

    // Start HTTP WebServer
    _server = new WebServer(80);
    setupRoutes();
    _server->begin();

    _running = true;
    _startedMillis = millis();
    Serial.println("[Portal] Web server and DNS redirection active. Waiting for mobile client...");
    return true;
}

void CaptivePortal::setupRoutes() {
    if (!_server) return;

    _server->on("/", HTTP_GET, [this]() { handleRoot(); });
    _server->on("/save", HTTP_POST, [this]() { handleSave(); });
    _server->on("/scan", HTTP_GET, [this]() { handleScan(); });

    // Operating system captive portal probe intercepts
    _server->on("/generate_204", HTTP_GET, [this]() { handleRoot(); });          // Android
    _server->on("/hotspot-detect.html", HTTP_GET, [this]() { handleRoot(); });    // Apple iOS / macOS
    _server->on("/ncsi.txt", HTTP_GET, [this]() { handleRoot(); });               // Windows
    _server->on("/connecttest.txt", HTTP_GET, [this]() { handleRoot(); });        // Windows
    _server->on("/canonical.html", HTTP_GET, [this]() { handleRoot(); });         // ChromeOS

    _server->onNotFound([this]() { handleNotFound(); });
}

void CaptivePortal::update() {
    if (!_running) return;

    if (_dnsServer) {
        _dnsServer->processNextRequest();
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
    // Redirect any unknown domain request to the portal root
    String redirectUrl = "http://192.168.4.1/";
    _server->sendHeader("Location", redirectUrl, true);
    _server->send(302, "text/plain", "");
}

void CaptivePortal::handleScan() {
    int n = WiFi.scanNetworks();
    String json = "[";
    for (int i = 0; i < n; ++i) {
        if (i > 0) json += ",";
        json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",\"rssi\":" + String(WiFi.RSSI(i)) + "}";
    }
    json += "]";
    _server->send(200, "application/json", json);
}

void CaptivePortal::handleRoot() {
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
    .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 14px; margin-top: 10px; }
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

    _server->send(200, "text/html", resp);
    Serial.printf("[Portal] Credentials saved for SSID: %s\n", finalSsid.c_str());
}

String CaptivePortal::buildHtml() {
    // Scan available networks
    int n = WiFi.scanNetworks();

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
    label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
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
    summary { font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; }
    .toggle-custom { display: none; margin-top: 8px; }
  </style>
  <script>
    function onSsidChange() {
      var select = document.getElementById('ssid_select');
      var customDiv = document.getElementById('custom_ssid_group');
      if (select.value === '__custom__') {
        customDiv.style.display = 'block';
      } else {
        customDiv.style.display = 'none';
      }
    }
    function togglePass() {
      var p = document.getElementById('pass');
      p.type = (p.type === 'password') ? 'text' : 'password';
    }
  </script>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">&#x1F331;</div>
      <h1>RoofGarden Setup</h1>
      <p class="sub">Connect this ESP32 node to your local rooftop Wi-Fi</p>
    </div>

    <form method="POST" action="/save">
      <div class="form-group">
        <label for="ssid_select">Available 2.4 GHz Wi-Fi</label>
        <select id="ssid_select" name="ssid" onchange="onSsidChange()">
)rawliteral";

    if (n == 0) {
        html += "<option value='__custom__'>No networks found (Enter manually)</option>";
    } else {
        html += "<option value=''>-- Select your Wi-Fi --</option>";
        for (int i = 0; i < n; ++i) {
            String ssid = WiFi.SSID(i);
            int rssi = WiFi.RSSI(i);
            if (ssid.length() == 0) continue; // Skip hidden SSIDs
            html += "<option value='" + ssid + "'>" + ssid + " (" + String(rssi) + " dBm)</option>";
        }
        html += "<option value='__custom__'>+ Enter Hidden / Other SSID...</option>";
    }

    html += R"rawliteral(
        </select>
      </div>

      <div class="form-group toggle-custom" id="custom_ssid_group">
        <label for="custom_ssid">Manual Network Name (SSID)</label>
        <input type="text" id="custom_ssid" name="custom_ssid" placeholder="My_Rooftop_WiFi">
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
