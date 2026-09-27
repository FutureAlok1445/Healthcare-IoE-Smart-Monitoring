from django.db import models
from patients.models import Patient
from vitals.models import VitalReading


class Alert(models.Model):
    """Auto-created whenever a VitalReading arrives with state WATCH or CRITICAL."""
    LEVEL_CHOICES = [('WATCH', 'Watch'), ('CRITICAL', 'Critical')]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='alerts')
    reading = models.ForeignKey(VitalReading, on_delete=models.CASCADE, related_name='alerts')
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES)
    message = models.TextField()
    channels_sent = models.CharField(max_length=255, default='SMS, Email, Push Notification')
    acknowledged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.level}] {self.patient.device_id} — {self.message}"
