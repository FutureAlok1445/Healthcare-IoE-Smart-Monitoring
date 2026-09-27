from rest_framework import serializers
from patients.models import Patient
from .models import VitalReading


class VitalIngestSerializer(serializers.Serializer):
    """Validates and stores the exact JSON payload the ESP32 firmware sends."""
    device_id = serializers.CharField(max_length=50)
    heart_rate = serializers.FloatField()
    spo2 = serializers.FloatField()
    temperature = serializers.FloatField()
    motion_flag = serializers.BooleanField()
    sos_pressed = serializers.BooleanField()
    state = serializers.ChoiceField(choices=['NORMAL', 'WATCH', 'CRITICAL'])
    timestamp = serializers.IntegerField(min_value=0, max_value=4294967295)

    def create(self, validated_data):
        patient, _ = Patient.objects.get_or_create(
            device_id=validated_data['device_id'],
            defaults={'name': f"Patient ({validated_data['device_id']})"},
        )
        return VitalReading.objects.create(
            patient=patient,
            device_timestamp=validated_data['timestamp'],
            heart_rate=validated_data['heart_rate'],
            spo2=validated_data['spo2'],
            temperature=validated_data['temperature'],
            motion_flag=validated_data['motion_flag'],
            sos_pressed=validated_data['sos_pressed'],
            state=validated_data['state'],
        )


class VitalReadingSerializer(serializers.ModelSerializer):
    """Used when the dashboard reads back stored vitals."""
    patient_id = serializers.IntegerField(source='patient.id', read_only=True)
    device_id = serializers.CharField(source='patient.device_id', read_only=True)

    class Meta:
        model = VitalReading
        fields = [
            'id', 'patient_id', 'device_id', 'device_timestamp', 'heart_rate',
            'spo2', 'temperature', 'motion_flag', 'sos_pressed', 'state', 'received_at',
        ]
