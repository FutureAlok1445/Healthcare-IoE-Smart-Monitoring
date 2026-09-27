from rest_framework import serializers
from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    patient_id = serializers.IntegerField(source='patient.id', read_only=True)
    device_id = serializers.CharField(source='patient.device_id', read_only=True)
    reading_id = serializers.IntegerField(source='reading.id', read_only=True)

    class Meta:
        model = Alert
        fields = ['id', 'patient_id', 'device_id', 'reading_id', 'level', 'message', 'acknowledged', 'created_at']
