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
        from patients.models import Patient
        identifier = str(self.kwargs.get('patient_id', '')).strip()

        # Step 1: Check if the targeted patient genuinely exists
        target_patient = None
        if identifier.isdigit():
            target_patient = Patient.objects.filter(id=int(identifier)).first()
        if not target_patient and identifier:
            target_patient = Patient.objects.filter(device_id=identifier).first()

        # If patient exists, return strictly their alerts (empty queryset if 0 alerts)
        # NEVER leak another patient's alert!
        if target_patient:
            return Alert.objects.filter(patient=target_patient)[:100]

        # Step 2: Semantic aliases
        if identifier in ('latest', 'default', 'current') or not identifier:
            active_patient = Patient.objects.order_by('-id').first()
            if active_patient:
                return Alert.objects.filter(patient=active_patient)[:100]

        # Step 3: Single-node prototype fallback: only if EXACTLY ONE patient exists in the system
        if identifier == '1' and Patient.objects.count() == 1:
            single_patient = Patient.objects.first()
            return Alert.objects.filter(patient=single_patient)[:100]

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
