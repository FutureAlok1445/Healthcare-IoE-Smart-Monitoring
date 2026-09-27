from django.db import models


class Patient(models.Model):
    """A patient / wearer of one ESP32 sensor node."""
    name = models.CharField(max_length=100)
    device_id = models.CharField(max_length=50, unique=True)  # must match DEVICE_ID in config.h
    room = models.CharField(max_length=50, blank=True, default='')  # Room / Bed ID e.g. PT-0142
    date_of_birth = models.DateField(null=True, blank=True)
    thresholds = models.JSONField(default=dict, blank=True)  # per-patient threshold overrides
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.device_id}) - {self.room or 'Unassigned'}"
