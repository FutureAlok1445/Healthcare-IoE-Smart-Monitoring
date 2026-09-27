from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Alert
from .serializers import AlertSerializer
from patients.permissions import IsClinicalStaff


class AllAlertsListView(generics.ListAPIView):
    """
    GET /api/v1/alerts/
    Returns recent alerts with clinical filtering support:
    - ?status=NEW | ACKNOWLEDGED | RESOLVED
    - ?level=CRITICAL | WATCH
    - ?type=TACHYCARDIA | HYPOXIA | ...
    - ?source=hardware | simulation
    - ?acknowledged=true | false
    """
    serializer_class = AlertSerializer
    permission_classes = [IsClinicalStaff]

    def get_queryset(self):
        qs = Alert.objects.all().select_related('patient', 'reading')

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status__iexact=status_param)

        level_param = self.request.query_params.get('level')
        if level_param:
            qs = qs.filter(level__iexact=level_param)

        type_param = self.request.query_params.get('type')
        if type_param:
            qs = qs.filter(alert_type__iexact=type_param)

        source_param = self.request.query_params.get('source')
        if source_param:
            qs = qs.filter(source__iexact=source_param)

        ack = self.request.query_params.get('acknowledged')
        if ack is not None:
            qs = qs.filter(acknowledged=ack.lower() in ('true', '1'))

        return qs[:150]


class PatientAlertsListView(generics.ListAPIView):
    """GET /api/v1/patients/<id_or_device_id>/alerts/"""
    serializer_class = AlertSerializer
    permission_classes = [IsClinicalStaff]

    def get_queryset(self):
        from patients.utils import resolve_patient
        identifier = self.kwargs.get('patient_id', '')
        target_patient = resolve_patient(identifier)
        if target_patient:
            return Alert.objects.filter(patient=target_patient).select_related('patient', 'reading')[:100]
        return Alert.objects.none()


class AcknowledgeAlertView(APIView):
    """
    POST /api/v1/alerts/<id>/acknowledge/
    Transitions alert from NEW to ACKNOWLEDGED state and records clinical personnel attribution.
    """
    permission_classes = [IsClinicalStaff]

    def post(self, request, alert_id):
        try:
            alert = Alert.objects.get(id=alert_id)
        except Alert.DoesNotExist:
            return Response({'error': f"Alert '{alert_id}' not found."}, status=status.HTTP_404_NOT_FOUND)

        user_name = "Clinical Staff"
        if request.user and request.user.is_authenticated:
            profile = getattr(request.user, 'profile', None)
            role = profile.role if profile else ('Doctor' if not request.user.is_superuser else 'Admin')
            user_name = f"{request.user.first_name or request.user.username} ({role})"

        alert.acknowledged = True
        alert.status = 'ACKNOWLEDGED'
        alert.acknowledged_by = user_name
        alert.save(update_fields=['acknowledged', 'status', 'acknowledged_by'])
        return Response(AlertSerializer(alert).data)


class ResolveAlertView(APIView):
    """
    POST /api/v1/alerts/<id>/resolve/
    Transitions alert to RESOLVED state, recording clinician attribution and resolution timestamp.
    """
    permission_classes = [IsClinicalStaff]

    def post(self, request, alert_id):
        try:
            alert = Alert.objects.get(id=alert_id)
        except Alert.DoesNotExist:
            return Response({'error': f"Alert '{alert_id}' not found."}, status=status.HTTP_404_NOT_FOUND)

        user_name = "Attending Clinician"
        if request.user and request.user.is_authenticated:
            profile = getattr(request.user, 'profile', None)
            role = profile.role if profile else ('Doctor' if not request.user.is_superuser else 'Admin')
            user_name = f"{request.user.first_name or request.user.username} ({role})"

        alert.acknowledged = True
        alert.status = 'RESOLVED'
        alert.resolved_by = user_name
        alert.resolved_at = timezone.now()
        alert.save(update_fields=['acknowledged', 'status', 'resolved_by', 'resolved_at'])
        return Response(AlertSerializer(alert).data)
