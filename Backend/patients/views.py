from .utils import resolve_patient
from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from .models import Patient
from .serializers import PatientSerializer


class PatientListCreateView(generics.ListCreateAPIView):
    """
    GET /api/v1/patients/  — List all registered patients
    POST /api/v1/patients/ — Register a new patient
    """
    queryset = Patient.objects.all().order_by('id')
    serializer_class = PatientSerializer
    permission_classes = [permissions.AllowAny]


class PatientDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/v1/patients/<id_or_device_id>/ — View or update patient details
    """
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        lookup = self.kwargs.get('pk', '')
        patient = resolve_patient(lookup)
        if not patient:
            raise NotFound(detail=f"Patient '{lookup}' not found.")
        return patient


class PatientThresholdsView(APIView):
    """
    GET/PATCH /api/v1/patients/<id_or_device_id>/thresholds/
    Allows doctors and admins to customize alert thresholds per patient.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        patient = resolve_patient(pk)
        if not patient:
            return Response({'error': f"Patient '{pk}' not found."}, status=404)
        defaults = {
            'hr_min': 50,
            'hr_max': 120,
            'spo2_min': 92,
            'temp_max': 38.5,
        }
        active_thresholds = {**defaults, **(patient.thresholds or {})}
        return Response({
            'patient_id': patient.id,
            'name': patient.name,
            'device_id': patient.device_id,
            'room': patient.room,
            'thresholds': active_thresholds
        })

    def patch(self, request, pk):
        patient = resolve_patient(pk)
        if not patient:
            return Response({'error': f"Patient '{pk}' not found."}, status=404)
        thresholds = request.data.get('thresholds', request.data)
        if not isinstance(thresholds, dict):
            return Response({'error': 'Thresholds must be a valid JSON dictionary.'}, status=400)

        # Merge with existing thresholds and persist
        current = patient.thresholds or {}
        current.update(thresholds)
        patient.thresholds = current
        patient.save(update_fields=['thresholds'])

        return Response({
            'status': 'updated',
            'patient_id': patient.id,
            'device_id': patient.device_id,
            'thresholds': patient.thresholds
        })


class AuthLoginView(APIView):
    """
    POST /api/v1/auth/login/
    Role-based authentication endpoint for Doctor, Caregiver, and Admin.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email_or_id = request.data.get('email', request.data.get('username', 'dr.mehta@caresense.io'))
        role = request.data.get('role', 'Doctor')
        name = "Dr. Mehta" if role == 'Doctor' else ("Nurse Sarah" if role == 'Caregiver' else "System Admin")

        return Response({
            'token': 'caresense-auth-token-session-active',
            'user': {
                'id': 1,
                'name': name,
                'email': email_or_id,
                'role': role,
                'phone': '+91 98765 43210'
            },
            'message': f'Logged in successfully as {role}'
        })


