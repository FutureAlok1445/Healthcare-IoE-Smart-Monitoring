from django.urls import path
from .views import PatientListCreateView, PatientDetailView, PatientThresholdsView, AuthLoginView

urlpatterns = [
    path('auth/login/', AuthLoginView.as_view(), name='auth-login'),
    path('patients/', PatientListCreateView.as_view(), name='patient-list-create'),
    path('patients/<str:pk>/thresholds/', PatientThresholdsView.as_view(), name='patient-thresholds'),
    path('patients/<str:pk>/', PatientDetailView.as_view(), name='patient-detail'),
]

