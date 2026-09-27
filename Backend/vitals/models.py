from django.db import models
from patients.models import Patient


class VitalReading(models.Model):
    """One sensor reading pushed by the ESP32 firmware every SENSOR_INTERVAL_MS."""
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='vitals')
    device_timestamp = models.BigIntegerField()  # millis() on the ESP32 — NOT wall-clock time
    heart_rate = models.FloatField()
    spo2 = models.FloatField()
    temperature = models.FloatField()
    motion_flag = models.BooleanField(default=False)   # fall detected (MPU6050)
    sos_pressed = models.BooleanField(default=False)   # SOS button latched
    state = models.CharField(max_length=10)            # NORMAL / WATCH / CRITICAL
    source = models.CharField(
        max_length=20,
        default='hardware',
        choices=[('hardware', 'Hardware'), ('simulation', 'Simulation')]
    )
    received_at = models.DateTimeField(auto_now_add=True)  # real server-side timestamp

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return f"{self.patient.device_id} @ {self.received_at:%H:%M:%S} — HR {self.heart_rate}"
