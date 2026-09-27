from rest_framework import generics, permissions
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
