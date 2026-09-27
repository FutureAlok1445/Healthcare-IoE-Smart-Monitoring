#include <Arduino.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "config.h"

enum AlertState {
  STATE_NORMAL = 0,
  STATE_WATCH,
  STATE_CRITICAL
};

struct SensorData {
  float heartRate = NAN;
  float spo2 = NAN;
  float tempC = NAN;

  float ax = NAN, ay = NAN, az = NAN;
  float gx = NAN, gy = NAN, gz = NAN;

  bool fallDetected = false;
  bool maxPresent = false;
  bool mpuPresent = false;
  bool dsPresent = false;
};

struct ForceFlags {
  bool hrLow = false;
  bool hrHigh = false;
  bool spo2Low = false;
  bool tempHigh = false;
  bool fall = false;
  bool sos = false;
};

struct TelemetryReading {
  float heartRate;
  float spo2;
  float temperature;
  bool motionFlag;
  bool sosPressed;
  AlertState state;
  uint32_t timestamp;
};

OneWire oneWire(PIN_ONEWIRE);
DallasTemperature ds18b20(&oneWire);

SensorData data;
ForceFlags forced;

AlertState currentState = STATE_NORMAL;
AlertState lastState = STATE_NORMAL;

int consecutiveBreaches = 0;
bool sosLatched = false;

unsigned long lastSensorMs = 0;
unsigned long lastBuzzerToggleMs = 0;
bool buzzerOn = false;
bool watchPulseActive = false;
unsigned long watchPulseStartMs = 0;

// Serial command buffer
String cmdBuf;

// Network timing/control
static const unsigned long WIFI_RETRY_STEP_MS = 500;
static const uint8_t WIFI_MAX_RETRIES = 16;
static const unsigned long WIFI_RECONNECT_INTERVAL_MS = 5000;
static const unsigned long BUFFER_FLUSH_INTERVAL_MS = 250;

bool wifiAttemptInProgress = false;
uint8_t wifiRetryCount = 0;
unsigned long wifiLastRetryStepMs = 0;
unsigned long wifiLastAttemptEndMs = 0;

// Failed/deferred telemetry circular buffer
static const uint8_t FAILED_BUF_SIZE = 5;
TelemetryReading failedBuf[FAILED_BUF_SIZE];
uint8_t failedHead = 0; // next write
uint8_t failedTail = 0; // oldest
uint8_t failedCount = 0;
bool bufferingMode = false;
unsigned long lastFlushAttemptMs = 0;

bool i2cDevicePresent(uint8_t addr) {
  Wire.beginTransmission(addr);
  return (Wire.endTransmission() == 0);
}

bool max30102Check() {
  if (!i2cDevicePresent(ADDR_MAX30102)) return false;
  Wire.beginTransmission(ADDR_MAX30102);
  Wire.write(0xFF); // Part ID register
  if (Wire.endTransmission(false) != 0) {
    // If repeated start is not supported by simulator or bus, device ACKed at address
    return true;
  }
  if (Wire.requestFrom((int)ADDR_MAX30102, 1) == 1) {
    uint8_t partId = Wire.read();
    // 0x15 is the standard MAX30102 part ID; 0x11 is MAX30100; 0x00/0xFF occur in some simulators
    return (partId == 0x15 || partId == 0x11 || partId == 0x00 || partId == 0xFF);
  }
  return true;
}

bool mpu6050Init() {
  if (!i2cDevicePresent(ADDR_MPU6050)) return false;

  // Wake device: PWR_MGMT_1 = 0
  Wire.beginTransmission(ADDR_MPU6050);
  Wire.write(0x6B);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) return false;

  // Optional: set accel +/-2g and gyro +/-250dps defaults explicitly
  Wire.beginTransmission(ADDR_MPU6050);
  Wire.write(0x1C); // ACCEL_CONFIG
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) return false;

  Wire.beginTransmission(ADDR_MPU6050);
  Wire.write(0x1B); // GYRO_CONFIG
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) return false;

  return true;
}

bool mpu6050Read(float &ax, float &ay, float &az, float &gx, float &gy, float &gz) {
  Wire.beginTransmission(ADDR_MPU6050);
  Wire.write(0x3B); // ACCEL_XOUT_H
  if (Wire.endTransmission(false) != 0) return false;

  if (Wire.requestFrom((int)ADDR_MPU6050, 14) != 14) return false;

  int16_t rawAx = (Wire.read() << 8) | Wire.read();
  int16_t rawAy = (Wire.read() << 8) | Wire.read();
  int16_t rawAz = (Wire.read() << 8) | Wire.read();
  (void)Wire.read(); (void)Wire.read(); // temperature raw, unused
  int16_t rawGx = (Wire.read() << 8) | Wire.read();
  int16_t rawGy = (Wire.read() << 8) | Wire.read();
  int16_t rawGz = (Wire.read() << 8) | Wire.read();

  ax = rawAx / 16384.0f;
  ay = rawAy / 16384.0f;
  az = rawAz / 16384.0f;
  gx = rawGx / 131.0f;
  gy = rawGy / 131.0f;
  gz = rawGz / 131.0f;
  return true;
}

float simulatedHR() {
  float t = millis() / 1000.0f;
  return 78.0f + 6.0f * sinf(t * 0.2f) + random(-2, 3);
}

float simulatedSpO2() {
  return 97.0f + random(-1, 2) * 0.5f;
}

float simulatedTemp() {
  float t = millis() / 1000.0f;
  return 36.8f + 0.2f * sinf(t * 0.1f) + random(-1, 2) * 0.03f;
}

void readSensors() {
  // DS18B20 (non-blocking read from previous conversion, then trigger next)
  data.dsPresent = (ds18b20.getDeviceCount() > 0);
  if (data.dsPresent) {
    float t = ds18b20.getTempCByIndex(0);
    ds18b20.requestTemperatures(); // non-blocking next conversion request
    if (t > -55.0f && t < 125.0f && t != 85.0f && t != DEVICE_DISCONNECTED_C) {
      data.tempC = t;
    } else {
      data.tempC = simulatedTemp();
      if (t == DEVICE_DISCONNECTED_C) {
        data.dsPresent = false;
      }
    }
  } else {
    data.tempC = simulatedTemp();
  }

  // MAX30102 presence and vitals handling
  data.maxPresent = max30102Check();

  // Real raw processing not implemented here; robust simulation used when unavailable
  data.heartRate = simulatedHR();
  data.spo2 = simulatedSpO2();

  // MPU6050
  if (data.mpuPresent) {
    if (!mpu6050Read(data.ax, data.ay, data.az, data.gx, data.gy, data.gz)) {
      data.mpuPresent = false;
    }
  }

  if (!data.mpuPresent) {
    data.ax = 0.0f; data.ay = 0.0f; data.az = 1.0f;
    data.gx = 0.0f; data.gy = 0.0f; data.gz = 0.0f;
  }

  float accMag = sqrtf(data.ax * data.ax + data.ay * data.ay + data.az * data.az);
  float gyroMag = sqrtf(data.gx * data.gx + data.gy * data.gy + data.gz * data.gz);

  bool fallByMotion = (accMag > 2.5f) || ((accMag < 0.5f) && (gyroMag > 250.0f));
  data.fallDetected = fallByMotion;
}

void applyForces() {
  if (forced.hrLow) data.heartRate = 45.0f;
  if (forced.hrHigh) data.heartRate = 130.0f;
  if (forced.spo2Low) data.spo2 = 88.0f;
  if (forced.tempHigh) data.tempC = 39.2f;
  if (forced.fall) data.fallDetected = true;
  if (forced.sos) sosLatched = true;
}

const char* stateName(AlertState s) {
  switch (s) {
    case STATE_NORMAL: return "NORMAL";
    case STATE_WATCH: return "WATCH";
    case STATE_CRITICAL: return "CRITICAL";
    default: return "UNKNOWN";
  }
}

void setIndicators(AlertState s) {
  digitalWrite(PIN_LED_G, s == STATE_NORMAL ? HIGH : LOW);
  digitalWrite(PIN_LED_Y, s == STATE_WATCH ? HIGH : LOW);
  digitalWrite(PIN_LED_R, s == STATE_CRITICAL ? HIGH : LOW);
}

void updateBuzzer(AlertState s) {
  unsigned long now = millis();

  if (s == STATE_NORMAL) {
    buzzerOn = false;
    watchPulseActive = false;
    digitalWrite(PIN_BUZZ, LOW);
    return;
  }

  if (s == STATE_WATCH) {
    // Non-blocking short pulse every 2s
    if (!watchPulseActive && (now - lastBuzzerToggleMs >= 2000)) {
      watchPulseActive = true;
      watchPulseStartMs = now;
      digitalWrite(PIN_BUZZ, HIGH);
    }

    if (watchPulseActive && (now - watchPulseStartMs >= 35)) {
      watchPulseActive = false;
      lastBuzzerToggleMs = now;
      digitalWrite(PIN_BUZZ, LOW);
    }
    return;
  }

  watchPulseActive = false;

  // CRITICAL: repeating beep 300ms on / 300ms off
  if (now - lastBuzzerToggleMs >= 300) {
    lastBuzzerToggleMs = now;
    buzzerOn = !buzzerOn;
    digitalWrite(PIN_BUZZ, buzzerOn ? HIGH : LOW);
  }
}

void evaluateStateAndLog() {
  bool hrBreach = (data.heartRate < 50.0f || data.heartRate > 120.0f);
  bool spo2Breach = (data.spo2 < 92.0f);
  bool tempBreach = (data.tempC > 38.5f);
  bool fallBreach = data.fallDetected;

  bool anyBreach = hrBreach || spo2Breach || tempBreach || fallBreach;

  if (anyBreach) {
    consecutiveBreaches++;
  } else {
    consecutiveBreaches = 0;
  }

  lastState = currentState;
  if (sosLatched) {
    currentState = STATE_CRITICAL;
  } else if (consecutiveBreaches >= 3) {
    currentState = STATE_CRITICAL;
  } else if (consecutiveBreaches >= 1) {
    currentState = STATE_WATCH;
  } else {
    currentState = STATE_NORMAL;
  }

  if (currentState != lastState) {
    Serial.printf("[STATE] %s -> %s (breachCount=%d, sos=%s)\n",
                  stateName(lastState), stateName(currentState),
                  consecutiveBreaches, sosLatched ? "YES" : "NO");
  }

  Serial.println("---- Health Snapshot ----");
  Serial.printf("HR: %.1f bpm  %s\n", data.heartRate, hrBreach ? "[BREACH]" : "[OK]");
  Serial.printf("SpO2: %.1f %%  %s\n", data.spo2, spo2Breach ? "[BREACH]" : "[OK]");
  Serial.printf("Temp: %.2f C  %s\n", data.tempC, tempBreach ? "[BREACH]" : "[OK]");
  Serial.printf("MPU ax/ay/az: %.2f %.2f %.2f g\n", data.ax, data.ay, data.az);
  Serial.printf("MPU gx/gy/gz: %.1f %.1f %.1f dps\n", data.gx, data.gy, data.gz);
  Serial.printf("Fall: %s\n", fallBreach ? "YES [BREACH]" : "NO");
  Serial.printf("Sensors: MAX=%s MPU=%s DS18B20=%s\n",
                data.maxPresent ? "present(sim-vitals)" : "missing(sim-vitals)",
                data.mpuPresent ? "present" : "missing(sim-motion)",
                data.dsPresent ? "present" : "missing(sim-temp)");
  Serial.printf("Consecutive breaches: %d | SOS latched: %s\n",
                consecutiveBreaches, sosLatched ? "YES" : "NO");
  Serial.println("-------------------------");
}

void printHelp() {
  Serial.println("Commands:");
  Serial.println("  help");
  Serial.println("  status");
  Serial.println("  force hr_low | hr_high | spo2_low | temp_high | fall | sos");
  Serial.println("  clear hr | spo2 | temp | fall | sos | all");
}

void handleCommand(String line) {
  line.trim();
  line.toLowerCase();
  if (line.length() == 0) return;

  if (line == "help") {
    printHelp();
    return;
  }

  if (line == "status") {
    evaluateStateAndLog();
    return;
  }

  if (line.startsWith("force ")) {
    String what = line.substring(6);
    if (what == "hr_low") forced.hrLow = true;
    else if (what == "hr_high") forced.hrHigh = true;
    else if (what == "spo2_low") forced.spo2Low = true;
    else if (what == "temp_high") forced.tempHigh = true;
    else if (what == "fall") forced.fall = true;
    else if (what == "sos") forced.sos = true;
    else {
      Serial.println("Unknown force target.");
      return;
    }
    Serial.printf("Forced: %s\n", what.c_str());
    return;
  }

  if (line.startsWith("clear ")) {
    String what = line.substring(6);
    if (what == "hr") { forced.hrLow = false; forced.hrHigh = false; }
    else if (what == "spo2") forced.spo2Low = false;
    else if (what == "temp") forced.tempHigh = false;
    else if (what == "fall") forced.fall = false;
    else if (what == "sos") { forced.sos = false; sosLatched = false; }
    else if (what == "all") {
      forced = {};
      sosLatched = false;
      consecutiveBreaches = 0;
      currentState = STATE_NORMAL;
      lastState = STATE_NORMAL;
    } else {
      Serial.println("Unknown clear target.");
      return;
    }
    Serial.printf("Cleared: %s\n", what.c_str());
    return;
  }

  Serial.println("Unknown command. Type 'help'.");
}

void handleSerialInput() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (cmdBuf.length()) {
        handleCommand(cmdBuf);
        cmdBuf = "";
      }
    } else {
      cmdBuf += c;
      if (cmdBuf.length() > 120) cmdBuf = "";
    }
  }
}

void checkSosButton() {
  static bool lastRaw = HIGH;
  static unsigned long lastDebounceMs = 0;
  bool raw = digitalRead(PIN_SOS);

  if (raw != lastRaw) {
    lastDebounceMs = millis();
    lastRaw = raw;
  }

  if ((millis() - lastDebounceMs) > 30) {
    static bool stableState = HIGH;
    if (raw != stableState) {
      stableState = raw;
      if (stableState == LOW) {
        sosLatched = true;
        Serial.println("[SOS] Button pressed -> immediate CRITICAL alert latched.");
      }
    }
  }
}

void beginWiFiAttempt() {
  Serial.printf("[WIFI] Connecting to %s...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  wifiAttemptInProgress = true;
  wifiRetryCount = 0;
  wifiLastRetryStepMs = millis();
}

void serviceWiFi() {
  unsigned long now = millis();
  wl_status_t st = WiFi.status();

  if (st == WL_CONNECTED) {
    if (wifiAttemptInProgress) {
      wifiAttemptInProgress = false;
      Serial.printf("[WIFI] Connected. IP: %s\n", WiFi.localIP().toString().c_str());
    }
    return;
  }

  if (wifiAttemptInProgress) {
    if (now - wifiLastRetryStepMs >= WIFI_RETRY_STEP_MS) {
      wifiLastRetryStepMs = now;
      wifiRetryCount++;
      if (WiFi.status() == WL_CONNECTED) {
        wifiAttemptInProgress = false;
        Serial.printf("[WIFI] Connected. IP: %s\n", WiFi.localIP().toString().c_str());
      } else if (wifiRetryCount >= WIFI_MAX_RETRIES) {
        wifiAttemptInProgress = false;
        wifiLastAttemptEndMs = now;
        Serial.printf("[WIFI] Connection failed after %d retries.\n", WIFI_MAX_RETRIES);
      }
    }
    return;
  }

  if (now - wifiLastAttemptEndMs >= WIFI_RECONNECT_INTERVAL_MS) {
    beginWiFiAttempt();
  }
}

void enterBufferingMode(const char* reason) {
  if (!bufferingMode) {
    bufferingMode = true;
    Serial.printf("[NET] Entering buffering mode (%s).\n", reason);
  }
}

void pushFailedReading(const TelemetryReading& r) {
  if (failedCount >= FAILED_BUF_SIZE) {
    failedTail = (failedTail + 1) % FAILED_BUF_SIZE; // drop oldest
    failedCount--;
    Serial.println("[NET] Buffer full, dropping oldest reading.");
  }
  failedBuf[failedHead] = r;
  failedHead = (failedHead + 1) % FAILED_BUF_SIZE;
  failedCount++;
}

bool peekFailedReading(TelemetryReading& out) {
  if (failedCount == 0) return false;
  out = failedBuf[failedTail];
  return true;
}

void popFailedReading() {
  if (failedCount == 0) return;
  failedTail = (failedTail + 1) % FAILED_BUF_SIZE;
  failedCount--;
}

String buildTelemetryJson(const TelemetryReading& r) {
  String payload;
  payload.reserve(220);
  payload += "{";
  payload += "\"device_id\":\""; payload += DEVICE_ID; payload += "\",";
  payload += "\"heart_rate\":"; payload += String(r.heartRate, 1); payload += ",";
  payload += "\"spo2\":"; payload += String(r.spo2, 1); payload += ",";
  payload += "\"temperature\":"; payload += String(r.temperature, 2); payload += ",";
  payload += "\"motion_flag\":"; payload += (r.motionFlag ? "true" : "false"); payload += ",";
  payload += "\"sos_pressed\":"; payload += (r.sosPressed ? "true" : "false"); payload += ",";
  payload += "\"state\":\""; payload += stateName(r.state); payload += "\",";
  payload += "\"timestamp\":"; payload += String(r.timestamp);
  payload += "}";
  return payload;
}

bool postTelemetry(const TelemetryReading& r, bool buffered) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  String payload = buildTelemetryJson(r);

  HTTPClient http;
  http.setTimeout(1500);
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(payload);
  Serial.printf("[HTTP] POST %s reading -> code: %d\n", buffered ? "buffered" : "live", code);

  bool ok = (code == 200 || code == 201);
  if (!ok) {
    String body = http.getString();
    if (code <= 0) {
      Serial.printf("[HTTP] Error: %s\n", HTTPClient::errorToString(code).c_str());
    }
    Serial.printf("[HTTP] Non-success response body: %s\n", body.c_str());
  }

  http.end();
  return ok;
}

TelemetryReading captureReading() {
  TelemetryReading r;
  r.heartRate = data.heartRate;
  r.spo2 = data.spo2;
  r.temperature = data.tempC;
  r.motionFlag = data.fallDetected;
  r.sosPressed = sosLatched;
  r.state = currentState;
  r.timestamp = (uint32_t)millis();
  return r;
}

void handleTelemetryCycle(const TelemetryReading& reading) {
  if (WiFi.status() != WL_CONNECTED) {
    enterBufferingMode("wifi disconnected");
    pushFailedReading(reading);
    return;
  }

  // Always flush backlog first; defer current live reading into same buffer.
  if (failedCount > 0) {
    pushFailedReading(reading);
    return;
  }

  if (!postTelemetry(reading, false)) {
    enterBufferingMode("post failed");
    pushFailedReading(reading);
  }
}

void serviceBufferedFlush() {
  if (failedCount == 0) return;
  if (WiFi.status() != WL_CONNECTED) return;

  unsigned long now = millis();
  if (now - lastFlushAttemptMs < BUFFER_FLUSH_INTERVAL_MS) return;
  lastFlushAttemptMs = now;

  TelemetryReading oldest;
  if (!peekFailedReading(oldest)) return;

  if (postTelemetry(oldest, true)) {
    popFailedReading();
    if (failedCount == 0) {
      bufferingMode = false;
      Serial.println("[NET] Buffered readings flushed successfully.");
    }
  } else {
    enterBufferingMode("flush failed");
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_Y, OUTPUT);
  pinMode(PIN_BUZZ, OUTPUT);
  pinMode(PIN_SOS, INPUT_PULLUP);

  digitalWrite(PIN_LED_R, LOW);
  digitalWrite(PIN_LED_G, LOW);
  digitalWrite(PIN_LED_Y, LOW);
  digitalWrite(PIN_BUZZ, LOW);

  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  Wire.setClock(400000);

  ds18b20.begin();
  ds18b20.setWaitForConversion(false); // Enable non-blocking asynchronous conversions
  ds18b20.requestTemperatures();       // Initial asynchronous conversion
  data.mpuPresent = mpu6050Init();
  data.maxPresent = max30102Check();

  randomSeed((uint32_t)esp_random());

  Serial.println();
  Serial.println("ESP32 Health Monitor starting...");
  Serial.printf("I2C SDA=%d SCL=%d | ONEWIRE=%d | SOS=%d | BUZZ=%d\n",
                PIN_I2C_SDA, PIN_I2C_SCL, PIN_ONEWIRE, PIN_SOS, PIN_BUZZ);
  Serial.printf("Startup detect: MAX30102=%s, MPU6050=%s, DS18B20 devices=%d\n",
                data.maxPresent ? "YES" : "NO",
                data.mpuPresent ? "YES" : "NO",
                ds18b20.getDeviceCount());
  printHelp();

  beginWiFiAttempt();

  lastSensorMs = millis() - SENSOR_INTERVAL_MS; // force immediate first read
}

void loop() {
  handleSerialInput();
  checkSosButton();
  serviceWiFi();
  serviceBufferedFlush();

  unsigned long now = millis();
  if (now - lastSensorMs >= SENSOR_INTERVAL_MS) {
    lastSensorMs = now;
    readSensors();
    applyForces();
    evaluateStateAndLog();

    TelemetryReading reading = captureReading();
    handleTelemetryCycle(reading);
  }

  setIndicators(currentState);
  updateBuzzer(currentState);
}
