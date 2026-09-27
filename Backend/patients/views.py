from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.authtoken.models import Token

from .models import Patient
from .serializers import PatientSerializer, UserSerializer
from .permissions import IsDoctorOrAdmin, IsClinicalStaff
from .utils import resolve_patient


class PatientListCreateView(generics.ListCreateAPIView):
    """
    GET /api/v1/patients/  — List all registered patients
    POST /api/v1/patients/ — Register a new patient
    """
    queryset = Patient.objects.all().prefetch_related('vitals', 'alerts').order_by('id')
    serializer_class = PatientSerializer
    permission_classes = [IsClinicalStaff]


class PatientDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/v1/patients/<id_or_device_id>/ — View or update patient details
    """
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsClinicalStaff]

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
    Nurses/Caregivers are restricted to read-only access.
    """
    permission_classes = [IsClinicalStaff]

    def get(self, request, pk):
        patient = resolve_patient(pk)
        if not patient:
            return Response({'error': f"Patient '{pk}' not found."}, status=status.HTTP_404_NOT_FOUND)
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
        # RBAC verification: check if user is authenticated and verify role
        if request.user and request.user.is_authenticated:
            profile = getattr(request.user, 'profile', None)
            role = profile.role if profile else ('ADMIN' if request.user.is_superuser else 'DOCTOR')
            if role == 'NURSE':
                return Response(
                    {'error': 'Permission Denied: Nurse/Caregiver role cannot modify clinical thresholds.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        patient = resolve_patient(pk)
        if not patient:
            return Response({'error': f"Patient '{pk}' not found."}, status=status.HTTP_404_NOT_FOUND)
        thresholds = request.data.get('thresholds', request.data)
        if not isinstance(thresholds, dict):
            return Response({'error': 'Thresholds must be a valid JSON dictionary.'}, status=status.HTTP_400_BAD_REQUEST)

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
    Authenticates user against database with password hash verification.
    Issues genuine DRF Token for session authorization.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        identifier = request.data.get('email') or request.data.get('username') or ''
        password = request.data.get('password') or ''

        if not identifier or not password:
            return Response(
                {'error': 'Both email/username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Lookup user by username or email
        user = User.objects.filter(username=identifier).first()
        if not user:
            user = User.objects.filter(email__iexact=identifier).first()

        if not user or not user.check_password(password):
            return Response(
                {'error': 'Invalid credentials. Please verify your email and password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        token, _ = Token.objects.get_or_create(user=user)
        user_data = UserSerializer(user).data

        return Response({
            'token': token.key,
            'user': user_data,
            'message': f"Logged in successfully as {user_data.get('display_name')}"
        })


class AuthLogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Revokes the current user's authentication token.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({'status': 'success', 'message': 'Logged out successfully.'})


class CurrentUserView(APIView):
    """
    GET /api/v1/auth/me/
    Returns current authenticated user profile and permissions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            'user': UserSerializer(request.user).data
        })
