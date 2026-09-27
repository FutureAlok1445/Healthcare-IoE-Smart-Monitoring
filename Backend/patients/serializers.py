from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    latest_reading = serializers.SerializerMethodField()
    active_alerts_count = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'device_id', 'date_of_birth',
            'thresholds', 'created_at', 'latest_reading', 'active_alerts_count',
        ]
        read_only_fields = ['id', 'created_at']

    def get_latest_reading(self, obj):
        latest = obj.vitals.first()
        if not latest:
            return None
        return {
            'heart_rate': latest.heart_rate,
            'spo2': latest.spo2,
            'temperature': latest.temperature,
            'motion_flag': latest.motion_flag,
            'sos_pressed': latest.sos_pressed,
            'state': latest.state,
            'received_at': latest.received_at,
        }

    def get_active_alerts_count(self, obj):
        return obj.alerts.filter(acknowledged=False).count()
