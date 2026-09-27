from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Alert
from .serializers import AlertSerializer


class AllAlertsListView(generics.ListAPIView):
    """GET /api/v1/alerts/  — all recent alerts, filterable by ?acknowledged=false"""
    serializer_class = AlertSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Alert.objects.all()
        ack = self.request.query_params.get('acknowledged')
        if ack is not None:
            qs = qs.filter(acknowledged=ack.lower() in ('true', '1'))
        return qs[:100]


class PatientAlertsListView(generics.ListAPIView):
    """GET /api/v1/patients/<id_or_device_id>/alerts/"""
    serializer_class = AlertSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        from patients.utils import resolve_patient
        identifier = self.kwargs.get('patient_id', '')
        target_patient = resolve_patient(identifier)
        if target_patient:
            return Alert.objects.filter(patient=target_patient)[:100]
        return Alert.objects.none()


class AcknowledgeAlertView(APIView):
    """POST /api/v1/alerts/<id>/acknowledge/"""
    permission_classes = [permissions.AllowAny]

    def post(self, request, alert_id):
        try:
            alert = Alert.objects.get(id=alert_id)
        except Alert.DoesNotExist:
            return Response({'error': 'Alert not found'}, status=404)
        alert.acknowledged = True
        alert.save()
        return Response(AlertSerializer(alert).data)
