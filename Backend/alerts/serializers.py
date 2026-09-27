from rest_framework import serializers
from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    patient_id = serializers.IntegerField(source='patient.id', read_only=True)
    device_id = serializers.CharField(source='patient.device_id', read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    room = serializers.CharField(source='patient.room', read_only=True)
    reading_id = serializers.IntegerField(source='reading.id', read_only=True)
    reading = serializers.SerializerMethodField()

    class Meta:
        model = Alert
        fields = [
            'id', 'patient_id', 'device_id', 'patient_name', 'room',
            'reading_id', 'reading', 'level', 'status', 'alert_type', 'message',
            'value', 'threshold', 'source', 'channels_sent',
            'acknowledged', 'acknowledged_by', 'resolved_by', 'resolved_at',
            'created_at',
        ]

    def get_reading(self, obj):
        r = getattr(obj, 'reading', None)
        if not r:
            return None
        return {
            'heart_rate': r.heart_rate,
            'spo2': r.spo2,
            'temperature': r.temperature,
            'motion_flag': r.motion_flag,
            'sos_pressed': r.sos_pressed,
            'state': r.state,
            'source': r.source,
            'received_at': r.received_at.isoformat() if r.received_at else None,
        }
