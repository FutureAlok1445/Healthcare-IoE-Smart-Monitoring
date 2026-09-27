from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import VitalReading
from .serializers import VitalIngestSerializer, VitalReadingSerializer
from alerts.models import Alert


class VitalIngestView(APIView):
    """
    POST /api/v1/vitals/
    Unified telemetry ingestion endpoint for both live ESP32 hardware and simulation engine.
    Runs the Central Clinical Alert Engine to evaluate thresholds and manage alert lifecycles.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VitalIngestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reading = serializer.save()

        # The device state is useful metadata, but the server is the final source
        # of truth so malformed or stale device states cannot hide a breach.
        calculated_state = self._calculate_state(reading)
        if reading.state != calculated_state:
            reading.state = calculated_state
            reading.save(update_fields=['state'])

        # Run Central Clinical Alert Engine
        if calculated_state in ('WATCH', 'CRITICAL'):
            self._process_clinical_alert(reading)

        return Response(
            {
                'id': reading.id,
                'patient_id': reading.patient_id,
                'device_id': reading.patient.device_id,
                'state': reading.state,
                'source': reading.source,
                'received_at': reading.received_at,
            },
            status=status.HTTP_201_CREATED,
        )

    @staticmethod
    def _calculate_state(reading):
        thresholds = reading.patient.thresholds or {}
        hr_min = thresholds.get('hr_min', 50)
        hr_max = thresholds.get('hr_max', 120)
        spo2_min = thresholds.get('spo2_min', 92)
        temp_max = thresholds.get('temp_max', 38.5)

        if reading.sos_pressed or reading.motion_flag:
            return 'CRITICAL'
        if reading.heart_rate >= 140 or reading.heart_rate <= 40 or reading.spo2 <= 88 or reading.temperature >= 39.5:
            return 'CRITICAL'
        if reading.heart_rate < hr_min or reading.heart_rate > hr_max or reading.spo2 < spo2_min or reading.temperature > temp_max:
            return 'WATCH'
        return 'NORMAL'

    def _process_clinical_alert(self, reading):
        patient = reading.patient
        thresholds = patient.thresholds or {}
        hr_min = thresholds.get('hr_min', 50)
        hr_max = thresholds.get('hr_max', 120)
        spo2_min = thresholds.get('spo2_min', 92)
        temp_max = thresholds.get('temp_max', 38.5)

        # Classify alert details
        alert_type = 'THRESHOLD_BREACH'
        level = reading.state
        value_str = ''
        threshold_str = ''
        message = ''

        if reading.sos_pressed:
            alert_type = 'SOS_EMERGENCY'
            level = 'CRITICAL'
            value_str = 'Triggered'
            threshold_str = 'Active'
            message = 'Emergency SOS panic button pressed by patient'
        elif reading.motion_flag:
            alert_type = 'FALL_DETECTED'
            level = 'CRITICAL'
            value_str = 'Impact (>2.8g)'
            threshold_str = 'Threshold >2.0g'
            message = 'Sudden fall impact detected by MPU-6050 accelerometer'
        elif reading.heart_rate > hr_max:
            alert_type = 'TACHYCARDIA'
            level = 'CRITICAL' if reading.heart_rate >= 140 else 'WATCH'
            value_str = f"{reading.heart_rate:.0f} BPM"
            threshold_str = f"> {hr_max:.0f} BPM"
            message = f"Tachycardia detected: HR {reading.heart_rate:.0f} BPM exceeds maximum limit of {hr_max:.0f} BPM"
        elif reading.heart_rate < hr_min:
            alert_type = 'BRADYCARDIA'
            level = 'CRITICAL' if reading.heart_rate <= 40 else 'WATCH'
            value_str = f"{reading.heart_rate:.0f} BPM"
            threshold_str = f"< {hr_min:.0f} BPM"
            message = f"Bradycardia detected: HR {reading.heart_rate:.0f} BPM below minimum limit of {hr_min:.0f} BPM"
        elif reading.spo2 < spo2_min:
            alert_type = 'HYPOXIA'
            level = 'CRITICAL' if reading.spo2 <= 88 else 'WATCH'
            value_str = f"{reading.spo2:.1f}%"
            threshold_str = f"< {spo2_min:.0f}%"
            message = f"Hypoxia desaturation: SpO2 {reading.spo2:.1f}% dropped below minimum limit of {spo2_min:.0f}%"
        elif reading.temperature > temp_max:
            alert_type = 'HIGH_TEMP'
            level = 'CRITICAL' if reading.temperature >= 39.5 else 'WATCH'
            value_str = f"{reading.temperature:.1f} °C"
            threshold_str = f"> {temp_max:.1f} °C"
            message = f"Pyrexia/High Fever: Temperature {reading.temperature:.1f} °C exceeds threshold of {temp_max:.1f} °C"
        else:
            value_str = f"HR {reading.heart_rate:.0f}, SpO2 {reading.spo2:.0f}%"
            threshold_str = 'Clinical Bounds'
            message = 'Biometric parameter breach detected'

        # Repeated readings of the same incident update one alert. A different
        # incident gets its own row, while a WATCH can still escalate to CRITICAL.
        active_alert = Alert.objects.filter(
            patient=patient,
            alert_type=alert_type,
            status__in=['NEW', 'ACKNOWLEDGED']
        ).first()

        if not active_alert and level == 'CRITICAL':
            active_alert = Alert.objects.filter(
                patient=patient,
                level='WATCH',
                status__in=['NEW', 'ACKNOWLEDGED']
            ).first()

        if not active_alert:
            Alert.objects.create(
                patient=patient,
                reading=reading,
                level=level,
                status='NEW',
                alert_type=alert_type,
                message=message,
                value=value_str,
                threshold=threshold_str,
                source=reading.source,
                channels_sent='SMS, Email, Cellular Alert'
            )
        else:
            # Escalation & updating existing alert
            if level == 'CRITICAL' and active_alert.level == 'WATCH':
                active_alert.level = 'CRITICAL'
                active_alert.status = 'NEW'  # re-trigger alert state if escalated
            active_alert.reading = reading
            active_alert.alert_type = alert_type
            active_alert.message = message
            active_alert.value = value_str
            active_alert.threshold = threshold_str
            active_alert.source = reading.source
            active_alert.save()


class PatientVitalsListView(generics.ListAPIView):
    """GET /api/v1/patients/<id_or_device_id>/vitals/  — recent readings for the dashboard."""
    serializer_class = VitalReadingSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        from patients.utils import resolve_patient
        identifier = self.kwargs.get('patient_id', '')
        target_patient = resolve_patient(identifier)
        if target_patient:
            return VitalReading.objects.filter(patient=target_patient)[:100]
        return VitalReading.objects.none()
