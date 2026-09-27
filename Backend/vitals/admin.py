from django.contrib import admin
from .models import VitalReading


@admin.register(VitalReading)
class VitalReadingAdmin(admin.ModelAdmin):
    list_display = ('patient', 'heart_rate', 'spo2', 'temperature', 'state', 'received_at')
    list_filter = ('state', 'patient')
