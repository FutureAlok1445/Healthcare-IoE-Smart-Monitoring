#pragma once

// Pin map (use integer GPIOs exactly as provided)
#define PIN_LED_R 32
#define PIN_LED_G 25
#define PIN_LED_Y 26
#define PIN_SOS   27
#define PIN_I2C_SCL 22
#define PIN_I2C_SDA 21
#define PIN_BUZZ 18
#define PIN_ONEWIRE 4

// I2C device addresses
#define ADDR_MAX30102 0x57
#define ADDR_MPU6050  0x68

// Timing
static const unsigned long SENSOR_INTERVAL_MS = 5000;

// Networking
// IMPORTANT: replace these 3 placeholders with your real Wi-Fi and backend details
// before flashing to real hardware. Leaving them as-is will make the ESP32 fail to
// connect (this is expected and safe in the tinkered.ai simulator).
static const char* WIFI_SSID = "YOUR_WIFI_SSID";
static const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
static const char* BACKEND_URL = "http://example.com/health"; // e.g. http://192.168.1.X:8000/api/v1/vitals/
static const char* DEVICE_ID = "ESP32_NODE_01";
