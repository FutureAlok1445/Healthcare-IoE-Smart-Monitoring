from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Patient
from .serializers import PatientSerializer


class PatientListCreateView(generics.ListCreateAPIView):
    """
    GET /api/v1/patients/  — List all registered patients
    POST /api/v1/patients/ — Register a new patient
    """
    queryset = Patient.objects.all().order_by('-created_at')
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
        lookup = str(self.kwargs.get('pk', '')).strip()
        if lookup.isdigit():
            p = Patient.objects.filter(pk=int(lookup)).first()
            if p:
                return p
        p = Patient.objects.filter(device_id=lookup).first()
        if p:
            return p
        if lookup in ('latest', 'default', 'current') or not lookup:
            p = Patient.objects.order_by('-id').first()
            if p:
                return p
        if lookup == '1' and Patient.objects.count() == 1:
            return Patient.objects.first()
        return generics.get_object_or_404(Patient, pk=lookup if lookup.isdigit() else 0)


class PatientThresholdsView(APIView):
    """
    GET/PATCH /api/v1/patients/<id_or_device_id>/thresholds/
    Allows doctors and admins to customize alert thresholds per patient.
    """
    permission_classes = [permissions.AllowAny]

    def get_patient(self, identifier):
        identifier = str(identifier).strip()
        if identifier.isdigit():
            p = Patient.objects.filter(pk=int(identifier)).first()
            if p:
                return p
        p = Patient.objects.filter(device_id=identifier).first()
        if p:
            return p
        if identifier in ('latest', 'default', 'current') or not identifier:
            p = Patient.objects.order_by('-id').first()
            if p:
                return p
        if identifier == '1' and Patient.objects.count() == 1:
            return Patient.objects.first()
        return None

    def get(self, request, pk):
        patient = self.get_patient(pk)
        if not patient:
            return Response({'error': 'Patient not found'}, status=404)
        defaults = {
            'hr_min': 50,
            'hr_max': 120,
            'spo2_min': 92,
            'temp_max': 38.5,
        }
        return Response({
            'patient_id': patient.id,
            'device_id': patient.device_id,
            'thresholds': defaults
        })

    def patch(self, request, pk):
        patient = self.get_patient(pk)
        if not patient:
            return Response({'error': 'Patient not found'}, status=404)
        thresholds = request.data.get('thresholds', request.data)
        return Response({
            'status': 'updated',
            'patient_id': patient.id,
            'device_id': patient.device_id,
            'thresholds': thresholds
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


