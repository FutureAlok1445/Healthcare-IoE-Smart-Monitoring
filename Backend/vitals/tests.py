from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from patients.models import Patient, UserProfile
from vitals.models import VitalReading
from alerts.models import Alert


class VitalIngestTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.doctor = User.objects.create_user(
            username="dr.mehta",
            email="dr.mehta@caresense.io",
            password="DoctorPass2026!",
            first_name="Dr. Ronald",
            last_name="Mehta"
        )
        UserProfile.objects.create(user=self.doctor, role="DOCTOR", phone="+91 98765 43210")

        self.nurse = User.objects.create_user(
            username="nurse.sarah",
            email="nurse.sarah@caresense.io",
            password="NursePass2026!",
            first_name="Sarah",
            last_name="Jenkins"
        )
        UserProfile.objects.create(user=self.nurse, role="NURSE", phone="+91 98765 43211")
        self.doctor_token = Token.objects.create(user=self.doctor)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.doctor_token.key}')

    def test_vital_ingest_creates_patient_and_reading(self):
        payload = {
            "device_id": "ESP32_NODE_01",
            "heart_rate": 75.0,
            "spo2": 98.0,
            "temperature": 36.6,
            "motion_flag": False,
            "sos_pressed": False,
            "state": "NORMAL",
            "timestamp": 123456
        }
        res = self.client.post('/api/v1/vitals/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Patient.objects.count(), 1)
        self.assertEqual(VitalReading.objects.count(), 1)
        self.assertEqual(res.data['source'], 'hardware')
        self.assertEqual(Alert.objects.count(), 0)

    def test_vital_ingest_with_simulation_source(self):
        payload = {
            "device_id": "ESP32_NODE_01",
            "heart_rate": 75.0,
            "spo2": 98.0,
            "temperature": 36.6,
            "motion_flag": False,
            "sos_pressed": False,
            "state": "NORMAL",
            "source": "simulation",
            "timestamp": 123456
        }
        res = self.client.post('/api/v1/vitals/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['source'], 'simulation')
        reading = VitalReading.objects.get(id=res.data['id'])
        self.assertEqual(reading.source, 'simulation')

    def test_alert_creation_and_anti_flooding(self):
        critical_payload = {
            "device_id": "ESP32_NODE_01",
            "heart_rate": 140.0,
            "spo2": 88.0,
            "temperature": 39.5,
            "motion_flag": True,
            "sos_pressed": True,
            "state": "CRITICAL",
            "timestamp": 200000
        }
        # First critical POST creates an alert
        res1 = self.client.post('/api/v1/vitals/', critical_payload, format='json')
        self.assertEqual(res1.status_code, 201)
        self.assertEqual(Alert.objects.count(), 1)
        alert = Alert.objects.first()
        self.assertFalse(alert.acknowledged)
        self.assertEqual(alert.level, "CRITICAL")
        self.assertEqual(alert.status, "NEW")
        self.assertEqual(alert.alert_type, "SOS_EMERGENCY")

        # Second critical POST 5 seconds later should update the existing active alert, NOT flood
        critical_payload['timestamp'] = 205000
        critical_payload['heart_rate'] = 145.0
        res2 = self.client.post('/api/v1/vitals/', critical_payload, format='json')
        self.assertEqual(res2.status_code, 201)
        self.assertEqual(Alert.objects.count(), 1)  # Still 1 alert, not 2!

        # Acknowledge the alert
        ack_res = self.client.post(f'/api/v1/alerts/{alert.id}/acknowledge/')
        self.assertEqual(ack_res.status_code, 200)
        self.assertTrue(ack_res.data['acknowledged'])
        self.assertEqual(ack_res.data['status'], 'ACKNOWLEDGED')

        # Resolve the alert
        resolve_res = self.client.post(f'/api/v1/alerts/{alert.id}/resolve/')
        self.assertEqual(resolve_res.status_code, 200)
        self.assertEqual(resolve_res.data['status'], 'RESOLVED')
        self.assertIsNotNone(resolve_res.data['resolved_at'])

        # Now that it's resolved, a new breach triggers a fresh alert
        critical_payload['timestamp'] = 210000
        res3 = self.client.post('/api/v1/vitals/', critical_payload, format='json')
        self.assertEqual(res3.status_code, 201)
        self.assertEqual(Alert.objects.count(), 2)

    def test_alert_escalation_watch_to_critical(self):
        # 1. Patient triggers WATCH alert
        watch_payload = {
            "device_id": "ESP32_NODE_05",
            "heart_rate": 125.0,  # mild tachycardia breach
            "spo2": 95.0,
            "temperature": 37.2,
            "motion_flag": False,
            "sos_pressed": False,
            "state": "WATCH",
            "timestamp": 1000
        }
        res1 = self.client.post('/api/v1/vitals/', watch_payload, format='json')
        self.assertEqual(res1.status_code, 201)
        self.assertEqual(Alert.objects.filter(patient__device_id="ESP32_NODE_05").count(), 1)
        alert = Alert.objects.get(patient__device_id="ESP32_NODE_05")
        self.assertEqual(alert.level, "WATCH")
        self.assertIn("125 BPM", alert.message)

        # 2. Patient condition worsens to CRITICAL (e.g., fall + SOS)
        critical_payload = {
            "device_id": "ESP32_NODE_05",
            "heart_rate": 135.0,
            "spo2": 89.0,
            "temperature": 37.5,
            "motion_flag": True,
            "sos_pressed": True,
            "state": "CRITICAL",
            "timestamp": 6000
        }
        res2 = self.client.post('/api/v1/vitals/', critical_payload, format='json')
        self.assertEqual(res2.status_code, 201)
        alert.refresh_from_db()
        self.assertEqual(alert.level, "CRITICAL")
        self.assertEqual(alert.alert_type, "SOS_EMERGENCY")

    def test_patient_vitals_list_endpoint(self):
        p = Patient.objects.create(name="Test Patient", device_id="ESP32_NODE_01")
        VitalReading.objects.create(
            patient=p, device_timestamp=100, heart_rate=72.0, spo2=98.0,
            temperature=36.6, motion_flag=False, sos_pressed=False, state="NORMAL"
        )
        res = self.client.get(f'/api/v1/patients/{p.id}/vitals/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['heart_rate'], 72.0)

    def test_patient_lookup_by_device_id(self):
        p = Patient.objects.create(name="Device Lookup Patient", device_id="ESP32_NODE_DEV")
        VitalReading.objects.create(
            patient=p, device_timestamp=100, heart_rate=80.0, spo2=99.0,
            temperature=36.7, motion_flag=False, sos_pressed=False, state="NORMAL"
        )
        res_by_device = self.client.get('/api/v1/patients/ESP32_NODE_DEV/vitals/')
        self.assertEqual(res_by_device.status_code, 200)
        self.assertEqual(len(res_by_device.data), 1)
        self.assertEqual(res_by_device.data[0]['heart_rate'], 80.0)

    def test_patient_lookup_by_ward_index(self):
        p = Patient.objects.create(name="Ward 1 Patient", device_id="ESP32_NODE_01")
        VitalReading.objects.create(
            patient=p, device_timestamp=200, heart_rate=68.0, spo2=97.0,
            temperature=36.5, motion_flag=False, sos_pressed=False, state="NORMAL"
        )
        res = self.client.get('/api/v1/patients/1/vitals/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['heart_rate'], 68.0)

    def test_auth_login_endpoint(self):
        # 1. Invalid credentials
        res_bad = self.client.post('/api/v1/auth/login/', {"email": "dr.mehta@caresense.io", "password": "wrong"}, format='json')
        self.assertEqual(res_bad.status_code, 401)

        # 2. Valid credentials
        res_ok = self.client.post('/api/v1/auth/login/', {"email": "dr.mehta@caresense.io", "password": "DoctorPass2026!"}, format='json')
        self.assertEqual(res_ok.status_code, 200)
        self.assertIn('token', res_ok.data)
        self.assertEqual(res_ok.data['user']['role'], 'DOCTOR')
        self.assertTrue(res_ok.data['user']['permissions']['can_update_thresholds'])

    def test_auth_logout_endpoint(self):
        res_login = self.client.post('/api/v1/auth/login/', {"email": "dr.mehta@caresense.io", "password": "DoctorPass2026!"}, format='json')
        token = res_login.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')

        res_logout = self.client.post('/api/v1/auth/logout/')
        self.assertEqual(res_logout.status_code, 200)

        # Token should now be invalid
        res_me = self.client.get('/api/v1/auth/me/')
        self.assertEqual(res_me.status_code, 401)

    def test_clinical_api_requires_authentication(self):
        self.client.credentials()

        patients_res = self.client.get('/api/v1/patients/')
        alerts_res = self.client.get('/api/v1/alerts/')

        self.assertEqual(patients_res.status_code, 401)
        self.assertEqual(alerts_res.status_code, 401)

    def test_rbac_nurse_cannot_patch_thresholds(self):
        p = Patient.objects.create(name="Rahul Sharma", device_id="ESP32_NODE_RS")

        # Login as Nurse
        res_login = self.client.post('/api/v1/auth/login/', {"email": "nurse.sarah@caresense.io", "password": "NursePass2026!"}, format='json')
        nurse_token = res_login.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {nurse_token}')

        # Nurse attempting to modify thresholds should get 403 Forbidden
        patch_payload = {"thresholds": {"hr_max": 140}}
        res_patch = self.client.patch(f'/api/v1/patients/{p.id}/thresholds/', patch_payload, format='json')
        self.assertEqual(res_patch.status_code, 403)

        # Login as Doctor
        res_doc = self.client.post('/api/v1/auth/login/', {"email": "dr.mehta@caresense.io", "password": "DoctorPass2026!"}, format='json')
        doc_token = res_doc.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {doc_token}')

        # Doctor modifying thresholds should succeed with 200 OK
        res_doc_patch = self.client.patch(f'/api/v1/patients/{p.id}/thresholds/', patch_payload, format='json')
        self.assertEqual(res_doc_patch.status_code, 200)
        self.assertEqual(res_doc_patch.data['thresholds']['hr_max'], 140)

    def test_patient_heartbeat_and_connection_status(self):
        p = Patient.objects.create(name="Heartbeat Test Patient", device_id="ESP32_NODE_HB")

        # 1. No reading -> OFFLINE
        res_offline = self.client.get(f'/api/v1/patients/{p.id}/')
        self.assertEqual(res_offline.data['connection_status'], 'OFFLINE')
        self.assertEqual(res_offline.data['telemetry_status'], 'MISSING')
        self.assertEqual(res_offline.data['data_source'], 'NONE')

        # 2. Fresh hardware reading -> ONLINE
        VitalReading.objects.create(
            patient=p, device_timestamp=1000, heart_rate=75.0, spo2=98.0,
            temperature=36.6, motion_flag=False, sos_pressed=False,
            state="NORMAL", source="hardware"
        )
        res_online = self.client.get(f'/api/v1/patients/{p.id}/')
        self.assertEqual(res_online.data['connection_status'], 'ONLINE')
        self.assertEqual(res_online.data['telemetry_status'], 'LIVE')
        self.assertEqual(res_online.data['data_source'], 'HARDWARE')

        # 3. Fresh simulated reading -> SIMULATED
        p2 = Patient.objects.create(name="Sim Patient", device_id="ESP32_NODE_SIM")
        VitalReading.objects.create(
            patient=p2, device_timestamp=2000, heart_rate=78.0, spo2=98.0,
            temperature=36.6, motion_flag=False, sos_pressed=False,
            state="NORMAL", source="simulation"
        )
        res_sim = self.client.get(f'/api/v1/patients/{p2.id}/')
        self.assertEqual(res_sim.data['connection_status'], 'SIMULATED')
        self.assertEqual(res_sim.data['data_source'], 'SIMULATION')
