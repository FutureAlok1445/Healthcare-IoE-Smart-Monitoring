from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import serializers
from .models import Patient, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['role', 'phone']


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'display_name', 'role', 'phone', 'permissions']

    def get_role(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.role if profile else ('ADMIN' if obj.is_superuser else 'DOCTOR')

    def get_phone(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.phone if profile else ''

    def get_display_name(self, obj):
        if obj.first_name or obj.last_name:
            return f"{obj.first_name} {obj.last_name}".strip()
        role = self.get_role(obj)
        if role == 'DOCTOR':
            return 'Dr. Mehta'
        elif role == 'NURSE':
            return 'Nurse Sarah'
        return 'System Administrator'

    def get_permissions(self, obj):
        role = self.get_role(obj)
        return {
            'can_update_thresholds': role in ('DOCTOR', 'ADMIN'),
            'can_manage_devices': role == 'ADMIN',
            'can_acknowledge_alerts': role in ('DOCTOR', 'NURSE', 'ADMIN'),
            'can_resolve_alerts': role in ('DOCTOR', 'NURSE', 'ADMIN'),
            'can_export_reports': True,
        }


class PatientSerializer(serializers.ModelSerializer):
    latest_reading = serializers.SerializerMethodField()
    active_alerts_count = serializers.SerializerMethodField()
    connection_status = serializers.SerializerMethodField()
    telemetry_status = serializers.SerializerMethodField()
    data_source = serializers.SerializerMethodField()
    last_seen_seconds = serializers.SerializerMethodField()
    last_seen = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'device_id', 'room', 'date_of_birth',
            'thresholds', 'created_at', 'latest_reading',
            'active_alerts_count', 'connection_status', 'telemetry_status',
            'data_source', 'last_seen', 'last_seen_seconds',
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
            'source': latest.source,
            'received_at': latest.received_at,
        }

    def get_active_alerts_count(self, obj):
        return obj.alerts.filter(status__in=['NEW', 'ACKNOWLEDGED']).count()

    def get_connection_status(self, obj):
        latest = self._get_latest_reading_obj(obj)
        if not latest:
            return 'OFFLINE'
        diff = (timezone.now() - latest.received_at).total_seconds()
        if diff < 25:
            return 'SIMULATED' if latest.source == 'simulation' else 'ONLINE'
        elif diff < 75:
            return 'STALE'
        return 'OFFLINE'

    def get_telemetry_status(self, obj):
        latest = self._get_latest_reading_obj(obj)
        if not latest:
            return 'MISSING'
        diff = (timezone.now() - latest.received_at).total_seconds()
        if diff < 25:
            return 'LIVE'
        elif diff < 75:
            return 'RECENT'
        elif diff < 300:
            return 'STALE'
        return 'MISSING'

    def get_data_source(self, obj):
        latest = self._get_latest_reading_obj(obj)
        if not latest:
            return 'NONE'
        return 'SIMULATION' if latest.source == 'simulation' else 'HARDWARE'

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
