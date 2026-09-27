from django.db import models
from patients.models import Patient
from vitals.models import VitalReading


class Alert(models.Model):
    """Auto-created whenever a VitalReading arrives with state WATCH or CRITICAL."""
    LEVEL_CHOICES = [('WATCH', 'Watch'), ('CRITICAL', 'Critical')]
    STATUS_CHOICES = [
        ('NEW', 'New'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('RESOLVED', 'Resolved'),
    ]
    TYPE_CHOICES = [
        ('TACHYCARDIA', 'Tachycardia'),
        ('BRADYCARDIA', 'Bradycardia'),
        ('HYPOXIA', 'Hypoxia'),
        ('HIGH_TEMP', 'High Temperature'),
        ('FALL_DETECTED', 'Fall Detected'),
        ('SOS_EMERGENCY', 'SOS Emergency'),
        ('THRESHOLD_BREACH', 'Threshold Breach'),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='alerts')
    reading = models.ForeignKey(VitalReading, on_delete=models.CASCADE, related_name='alerts')
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='NEW')
    alert_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='THRESHOLD_BREACH')
    message = models.TextField()
    value = models.CharField(max_length=50, blank=True, default='')
    threshold = models.CharField(max_length=50, blank=True, default='')
    source = models.CharField(max_length=20, default='hardware')
    channels_sent = models.CharField(max_length=255, default='SMS, Email, Push Notification')
    acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.CharField(max_length=100, blank=True, default='')
    resolved_by = models.CharField(max_length=100, blank=True, default='')
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.level}] ({self.status}) {self.patient.device_id} — {self.alert_type}: {self.message}"

