# Hardware & ESP32 Firmware Documentation

## 1. Bill of Materials (BOM)

| Component | Specification | Quantity | Estimated Cost (IDR) | Function |
|---|---|---|---|---|
| **Microcontroller** | ESP32 NodeMCU DevKit V1 (30-pin, CP2102) | 1 | Rp 65,000 | Core computation, WiFi, HTTPS, ADC |
| **Air Temp & Humidity** | DHT22 / AM2302 Sensor Module | 1 | Rp 45,000 | Ambient air temperature & relative humidity |
| **Light Sensor** | BH1750 Digital Light Sensor Module (GY-302) | 1 | Rp 20,000 | Solar illuminance in lux (I2C) |
| **Soil Moisture** | Capacitive Soil Moisture Sensor v1.2 (Corrosion Resistant) | 1 | Rp 18,000 | Analog soil moisture measurement |
| **Actuator Relay** | 1-Channel 5V Relay Module with Optocoupler (Active Low) | 1 | Rp 12,000 | Controls 12V solenoid irrigation valve |
| **Solenoid Valve** | 12V DC Normally Closed Solenoid Valve (1/2 inch) | 1 | Rp 45,000 | Water pipeline on/off control |
| **Power Supply** | 5V 2A DC Adapter (Micro USB) + 12V 2A for Solenoid | 1 | Rp 50,000 | Power supply for node & actuators |
| **Enclosure** | IP65 Waterproof Electrical Junction Box | 1 | Rp 35,000 | Weather protection against Jakarta tropical downpours |

---

## 2. Pin Map & Wiring Table

> [!CAUTION]
> **ADC1 Requirement**: Soil moisture MUST be connected to **GPIO34 (ADC1)**. Pins on **ADC2** (GPIO 0, 2, 4, 12-15, 25-27) cannot be used while the ESP32 WiFi driver is active due to internal resource sharing in the silicon.

| Sensor / Module | Sensor Pin | ESP32 Pin | Interface | Electrical Notes |
|---|---|---|---|---|
| **DHT22** | VCC | 3V3 / 5V | Power | Connect to 3.3V or 5V (use 3.3V for clean 3.3V logic) |
| **DHT22** | DATA | **GPIO4** | 1-Wire Digital | 10kΩ pull-up resistor to 3.3V (often built into module) |
| **DHT22** | GND | GND | Ground | Common ground |
| **Capacitive Soil**| VCC | 3V3 | Power | Power from stable 3.3V rail |
| **Capacitive Soil**| AOUT | **GPIO34** | Analog (**ADC1_CH6**) | Analog voltage output (approx 1.2V - 2.8V) |
| **Capacitive Soil**| GND | GND | Ground | Common ground |
| **BH1750** | VCC | 3V3 | Power | 3.3V supply |
| **BH1750** | GND | GND | Ground | Common ground |
| **BH1750** | SCL | **GPIO22** | I2C Clock | Standard ESP32 I2C SCL |
| **BH1750** | SDA | **GPIO21** | I2C Data | Standard ESP32 I2C SDA |
| **BH1750** | ADDR | GND | Address Select | GND sets I2C address to `0x23` |
| **Relay Module** | VCC | 5V (VIN) | Power | 5V supply for relay coil optocoupler |
| **Relay Module** | GND | GND | Ground | Common ground |
| **Relay Module** | IN | **GPIO26** | Digital Output | Active-Low signal (LOW = Relay ON, HIGH = Relay OFF) |

---

## 3. Calibration Procedure for Capacitive Soil Moisture Sensor

Capacitive soil moisture sensors vary by manufacturer and soil substrate. Calibration establishes the dry and wet raw ADC endpoints:

1. **Air / Dry Calibration (`SOIL_DRY_RAW`)**:
   - Hold the clean sensor dry in ambient air (0% soil moisture).
   - Read the raw 12-bit ADC value (range 0 - 4095).
   - Typical raw value: `~3100 - 3300`. Record this as `SOIL_DRY_RAW`.
2. **Water / Saturated Calibration (`SOIL_WET_RAW`)**:
   - Immerse the sensor blade in a cup of water up to the maximum depth line (do not submerge electronic header components).
   - Read the raw ADC value in water (100% soil moisture).
   - Typical raw value: `~1300 - 1500`. Record this as `SOIL_WET_RAW`.
3. **Firmware Calculation**:
   $$\text{Moisture \%} = \text{constrain}\left(\frac{\text{SOIL\_DRY\_RAW} - \text{ADC\_RAW}}{\text{SOIL\_DRY\_RAW} - \text{SOIL\_WET\_RAW}} \times 100.0, 0.0, 100.0\right)$$
   - The sensor operates with inverse logic: higher moisture decreases capacitive impedance, yielding lower raw voltage.
   - Firmware takes a **median of 10 samples** spaced 20ms apart to filter electrical noise.

---

## 4. Hardware Safety Mechanisms

1. **Hard Max-On-Time Cap**:
   - Regardless of any network command received, the firmware hardware timer strictly turns the relay OFF after `RELAY_MAX_ON_SECONDS` (default: 60s). This prevents flooding during backend or network crashes.
2. **Boot & Brownout Safe State**:
   - The relay pin (GPIO26) is explicitly initialized to `HIGH` (OFF for active-low) immediately in `setup()` before WiFi initialization.
3. **Network Watchdog**:
   - If WiFi connection or API heartbeats fail for more than 120 seconds while a relay is commanded ON, the firmware automatically de-energizes the relay immediately.
4. **In-Memory Ring Buffer**:
   - When offline, up to 100 sensor readings with NTP-synchronized timestamps are stored in RAM. Upon reconnection to WiFi, the buffer is flushed sequentially to `/api/v1/ingest/readings`.


---

## 5. Mock Environment Firmware

The firmware provides a dedicated **Mock Environment** target (`esp32dev_mock`) for developing, testing, and demonstrating the IoT system without requiring connected physical sensors.

### 5.1 Key Capabilities

- **Realistic Sensor Synthesis**: Generates high-fidelity readings for capacitive soil moisture (with natural drying curves), DHT22 (ambient temperature and humidity), BH1750 (solar illuminance in lux), and Li-ion battery voltage.
- **Bi-Directional Actuation Feedback**: When the backend or web app sends a `turn_on` command, the firmware energizes the relay and calculates water absorption into the soil (+0.45% moisture per second), satisfying the backend's automated `verify_actions` loop.
- **Accelerated Ingestion Cadence**: Transmits telemetry every **15 seconds** (configurable via `MOCK_SEND_INTERVAL_S`) instead of 300 seconds for rapid UI responsiveness during testing.
- **Interactive Serial Console**: Switch scenarios dynamically in real-time via USB serial:
  - `1` or `n`: **NORMAL** (Optimal conditions: 74-82% soil moisture, 27.5°C, 72% RH).
  - `2` or `d`: **DRY** (Simulates soil drying <62% to trigger AI automated irrigation recommendations).
  - `3` or `h`: **HEATWAVE** (Simulates extreme solar radiation >36°C, <45% RH to test heat stress alerts).
  - `4` or `w`: **WATER PULSE** (+12% immediate soil moisture boost).
  - `5` or `a`: **ANOMALY TOGGLE** (Injects out-of-bounds metrics to verify backend `is_valid=false` rejection).
  - `?` or `s`: **DIAGNOSTICS** (Prints status, buffer size, WiFi state, and current sensor values).

### 5.2 Building & Running

#### 1. Compile ESP32 Mock Firmware (PlatformIO)
```bash
cd hardware/firmware
pio run -e esp32dev_mock
```
To flash to a connected ESP32 board:
```bash
pio run -e esp32dev_mock -t upload
pio device monitor
```

#### 2. Run in Wokwi Simulator
A pre-configured `wokwi.toml` and `diagram.json` are included. In VS Code with the Wokwi extension or via Wokwi CLI:
```bash
# Opens simulation with virtual ESP32 DevKit, status LED, and relay circuit
wokwi-cli hardware/firmware
```

#### 3. Run Native Host Mock Firmware (PC / Windows / Linux)
Compile and run directly on your host machine without an ESP32 board:
```bash
make build-native-mock
./hardware/firmware/mock_node.exe
```

#### 4. Run Firmware Unit Tests
Execute the native unit tests verifying ring buffer and mock sensor dynamics:
```bash
make test-hardware
# Or:
cd hardware/firmware && pio test -e native
```
