from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import VitalReading
from .serializers import VitalIngestSerializer, VitalReadingSerializer
from alerts.models import Alert


class VitalIngestView(APIView):
    """POST /api/v1/vitals/  — called by the ESP32 firmware every 5 seconds."""
    permission_classes = [permissions.AllowAny]  # open for now; add device auth later

    def post(self, request):
        serializer = VitalIngestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reading = serializer.save()

        if reading.state in ('WATCH', 'CRITICAL'):
            message = self._build_message(reading)

            # Look for any active unacknowledged alert for this patient
            active_alert = Alert.objects.filter(
                patient=reading.patient,
                acknowledged=False,
            ).first()

            if not active_alert:
                Alert.objects.create(
                    patient=reading.patient,
                    reading=reading,
                    level=reading.state,
                    message=message,
                )
            elif reading.state == 'CRITICAL' and active_alert.level == 'WATCH':
                # Escalation: upgrade active WATCH alert to CRITICAL
                active_alert.level = 'CRITICAL'
                active_alert.reading = reading
                active_alert.message = message
                active_alert.save(update_fields=['level', 'reading', 'message'])
            elif active_alert.level == reading.state:
                # Same level: update existing alert in-place with latest readings
                active_alert.reading = reading
                active_alert.message = message
                active_alert.save(update_fields=['reading', 'message'])
            elif reading.state == 'WATCH' and active_alert.level == 'CRITICAL':
                # Critical alert takes precedence until acknowledged; update latest vital reading
                active_alert.reading = reading
                active_alert.save(update_fields=['reading'])

        return Response(
            {
                'id': reading.id,
                'patient_id': reading.patient_id,
                'device_id': reading.patient.device_id,
                'state': reading.state,
                'received_at': reading.received_at,
            },
            status=status.HTTP_201_CREATED,
        )

    @staticmethod
    def _build_message(reading):
        parts = []
        if reading.heart_rate < 50 or reading.heart_rate > 120:
            parts.append(f"HR {reading.heart_rate:.0f} bpm")
        if reading.spo2 < 92:
            parts.append(f"SpO2 {reading.spo2:.0f}%")
        if reading.temperature > 38.5:
            parts.append(f"Temp {reading.temperature:.1f} C")
        if reading.motion_flag:
            parts.append("fall detected")
        if reading.sos_pressed:
            parts.append("SOS pressed")
        return ", ".join(parts) if parts else "Threshold breach"


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
