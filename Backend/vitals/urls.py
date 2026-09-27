from django.urls import path
from .views import VitalIngestView, PatientVitalsListView

urlpatterns = [
    path('vitals/', VitalIngestView.as_view(), name='vitals-ingest'),
    path('patients/<str:patient_id>/vitals/', PatientVitalsListView.as_view(), name='patient-vitals'),
]
