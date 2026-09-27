from django.urls import path
from .views import AllAlertsListView, PatientAlertsListView, AcknowledgeAlertView, ResolveAlertView

urlpatterns = [
    path('alerts/', AllAlertsListView.as_view(), name='all-alerts'),
    path('patients/<str:patient_id>/alerts/', PatientAlertsListView.as_view(), name='patient-alerts'),
    path('alerts/<int:alert_id>/acknowledge/', AcknowledgeAlertView.as_view(), name='alert-acknowledge'),
    path('alerts/<int:alert_id>/resolve/', ResolveAlertView.as_view(), name='alert-resolve'),
]
