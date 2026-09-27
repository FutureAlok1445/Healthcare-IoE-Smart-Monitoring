from django.utils import timezone
from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    latest_reading = serializers.SerializerMethodField()
    active_alerts_count = serializers.SerializerMethodField()
    connection_status = serializers.SerializerMethodField()
    last_seen_seconds = serializers.SerializerMethodField()
    last_seen = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'device_id', 'room', 'date_of_birth',
            'thresholds', 'created_at', 'latest_reading',
            'active_alerts_count', 'connection_status',
            'last_seen', 'last_seen_seconds',
        ]
        read_only_fields = ['id', 'created_at']

    def _get_latest_reading_obj(self, obj):
        if not hasattr(obj, '_cached_latest_vital'):
            obj._cached_latest_vital = obj.vitals.first()
        return obj._cached_latest_vital

    def get_latest_reading(self, obj):
        latest = self._get_latest_reading_obj(obj)
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

    def get_connection_status(self, obj):
        latest = self._get_latest_reading_obj(obj)
        if not latest:
            return 'OFFLINE'
        diff = (timezone.now() - latest.received_at).total_seconds()
        if diff < 20:
            return 'ONLINE'
        elif diff < 60:
            return 'STALE'
        return 'OFFLINE'

    def get_last_seen_seconds(self, obj):
        latest = self._get_latest_reading_obj(obj)
        if not latest:
            return None
        return int((timezone.now() - latest.received_at).total_seconds())

    def get_last_seen(self, obj):
        latest = self._get_latest_reading_obj(obj)
        if not latest:
            return None
        return latest.received_at.isoformat()
