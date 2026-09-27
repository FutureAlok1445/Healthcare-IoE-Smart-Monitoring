# Hardware Implementation Checklist

Use the attached ESP32 Smart Healthcare wiring schematic together with this pin list. Power every sensor from the ESP32 3.3V rail. Connect all grounds to the common GND rail.

| Part | ESP32 connection | Notes |
|---|---|---|
| MAX30102 SDA | GPIO21 | I2C data |
| MAX30102 SCL | GPIO22 | I2C clock |
| MPU6050 SDA | GPIO21 | Shares the I2C bus |
| MPU6050 SCL | GPIO22 | Shares the I2C bus |
| DS18B20 data | GPIO4 | Use the 4.7 kOhm pull-up to 3.3V |
| SOS button | GPIO27 | Other side to GND; firmware uses `INPUT_PULLUP` |
| Piezo buzzer | GPIO18 through 100 Ohm | Buzzer negative side to GND |
| Green LED | GPIO25 through 220 Ohm | LED return to GND |
| Yellow LED | GPIO26 through 220 Ohm | LED return to GND |
| Red LED | GPIO32 through 220 Ohm | LED return to GND |

## Before powering on

1. Confirm the ESP32 3V3 pin is connected to the red power rail. Do not use 5V for the sensors.
2. Confirm the MAX30102 and MPU6050 share only SDA, SCL, 3.3V, and GND.
3. Confirm the DS18B20 pull-up resistor is present between data and 3.3V.
4. Confirm each LED has its own 220 Ohm resistor and the buzzer has its 100 Ohm series resistor.
5. Keep the ESP32 ground, sensor grounds, button ground, LED returns, and buzzer return on one common rail.
6. Set `WIFI_SSID`, `WIFI_PASSWORD`, `BACKEND_URL`, and `DEVICE_ID` in the selected firmware config before flashing.

The firmware files `src/main.cpp` and `HealthMonitor/HealthMonitor.ino` use the same pin assignments. Test the I2C devices and the SOS button from the serial monitor before connecting the device to a patient workflow.

## Current Firmware Limitation

The firmware detects the MAX30102 on the I2C bus, but its heart-rate and SpO2 signal-processing algorithm is not implemented yet. Until that algorithm is added, the firmware sends clearly simulated heart-rate and SpO2 values. The DS18B20 temperature path and MPU6050 motion path are prepared for hardware readings.

This is the only hardware-dependent item intentionally left open. It requires
real MAX30102 red/infrared samples and should be validated on the sensor before
being used for clinical decisions. The no-hardware dashboard simulator is not
affected.
